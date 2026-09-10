import { describe, it, expect } from 'vitest';
import {
  detectCycle,
  isDeadlock,
  safetyAlgorithm,
  requestAlgorithm,
  detectionAlgorithm,
  waitForGraph,
  needMatrix,
  type RagGraph,
  evaluateDetectionCadence
} from '../../src/algorithms/deadlock.js';

// ── Deck fixtures, transcribed once, asserted many times ──

// Slide 9: T1 holds one R2, waits R1; T2 holds R1 + R2, waits R3; T3 holds R3.
const SLIDE9: RagGraph = {
  nodes: [
    { id: 'T1', kind: 'process', instances: 1 },
    { id: 'T2', kind: 'process', instances: 1 },
    { id: 'T3', kind: 'process', instances: 1 },
    { id: 'R1', kind: 'resource', instances: 1 },
    { id: 'R2', kind: 'resource', instances: 2 },
    { id: 'R3', kind: 'resource', instances: 1 }
  ],
  edges: [
    { from: 'R2', to: 'T1', kind: 'assignment' },
    { from: 'T1', to: 'R1', kind: 'request' },
    { from: 'R1', to: 'T2', kind: 'assignment' },
    { from: 'R2', to: 'T2', kind: 'assignment' },
    { from: 'T2', to: 'R3', kind: 'request' },
    { from: 'R3', to: 'T3', kind: 'assignment' }
  ]
};

// Slide 10: single instance per resource type, conclusive cycle.
const SLIDE10: RagGraph = {
  nodes: [
    { id: 'T1', kind: 'process', instances: 1 },
    { id: 'T2', kind: 'process', instances: 1 },
    { id: 'T3', kind: 'process', instances: 1 },
    { id: 'R1', kind: 'resource', instances: 1 },
    { id: 'R2', kind: 'resource', instances: 2 },
    { id: 'R3', kind: 'resource', instances: 1 }
  ],
  edges: [
    { from: 'T1', to: 'R1', kind: 'request' },
    { from: 'R1', to: 'T2', kind: 'assignment' },
    { from: 'T2', to: 'R3', kind: 'request' },
    { from: 'R3', to: 'T3', kind: 'assignment' },
    { from: 'T3', to: 'R2', kind: 'request' },
    { from: 'R2', to: 'T1', kind: 'assignment' },
    { from: 'R2', to: 'T2', kind: 'assignment' }
  ]
};

// Slide 11: T1→R1→T3→R2→T1 closes, but T2 also holds R1, T4 also holds R2,
// and neither waits on anything — both finish and the ring dissolves.
const SLIDE11: RagGraph = {
  nodes: [
    { id: 'T1', kind: 'process', instances: 1 },
    { id: 'T2', kind: 'process', instances: 1 },
    { id: 'T3', kind: 'process', instances: 1 },
    { id: 'T4', kind: 'process', instances: 1 },
    { id: 'R1', kind: 'resource', instances: 2 },
    { id: 'R2', kind: 'resource', instances: 2 }
  ],
  edges: [
    { from: 'T1', to: 'R1', kind: 'request' },
    { from: 'R1', to: 'T2', kind: 'assignment' },
    { from: 'R1', to: 'T3', kind: 'assignment' },
    { from: 'T3', to: 'R2', kind: 'request' },
    { from: 'R2', to: 'T1', kind: 'assignment' },
    { from: 'R2', to: 'T4', kind: 'assignment' }
  ]
};

// Slides 30–31: the five-process three-resource ledger at T0.
const T0 = {
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ],
  max: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ],
  available: [3, 3, 2]
};

// Slide 39: detection snapshot at T0. Totals A=7 B=2 C=6.
const DETECT_T0 = {
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 3],
    [2, 1, 1],
    [0, 0, 2]
  ],
  request: [
    [0, 0, 0],
    [2, 0, 2],
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 2]
  ],
  available: [0, 0, 0]
};

describe('deadlock · RAG cycle detection (slides 9–11)', () => {
  it('slide 9 has no cycle — requests chain without closing', () => {
    expect(detectCycle(SLIDE9)).toEqual([]);
    expect(isDeadlock(SLIDE9).deadlocked).toBe(false);
  });

  it('slide 10 closes a ring — T1→R1→T2→R3→T3→R2→T1', () => {
    const cycles = detectCycle(SLIDE10);
    expect(cycles.length).toBeGreaterThan(0);
    const ring = cycles.find((c) => c.includes('T1') && c.includes('T2') && c.includes('T3'));
    expect(ring).toBeDefined();
    expect(new Set(ring)).toEqual(new Set(['T1', 'R1', 'T2', 'R3', 'T3', 'R2']));
  });

  it('slide 10 IS a deadlock — single instance per type, conclusive', () => {
    const v = isDeadlock(SLIDE10);
    expect(v.deadlocked).toBe(true);
    expect(v.deadlockedProcesses).toContain('T1');
    expect(v.deadlockedProcesses).toContain('T3');
  });

  it('slide 11: the cycle exists but it is NOT a deadlock', () => {
    const cycles = detectCycle(SLIDE11);
    expect(cycles.length).toBeGreaterThan(0);
    const v = isDeadlock(SLIDE11);
    expect(v.deadlocked).toBe(false);
    expect(v.deadlockedProcesses).toEqual([]);
  });

  it('claim edges never close a ring — slide 23 is acyclic', () => {
    const g: RagGraph = {
      nodes: [
        { id: 'T1', kind: 'process', instances: 1 },
        { id: 'T2', kind: 'process', instances: 1 },
        { id: 'R1', kind: 'resource', instances: 1 },
        { id: 'R2', kind: 'resource', instances: 1 }
      ],
      edges: [
        { from: 'R1', to: 'T1', kind: 'assignment' },
        { from: 'T2', to: 'R1', kind: 'request' },
        { from: 'T1', to: 'R2', kind: 'claim' },
        { from: 'T2', to: 'R2', kind: 'claim' }
      ]
    };
    expect(detectCycle(g)).toEqual([]);
    expect(isDeadlock(g).deadlocked).toBe(false);
  });
});

describe('deadlock · Need = Max − Allocation (slide 31)', () => {
  it('derives the deck Need matrix cell by cell', () => {
    expect(needMatrix(T0.max, T0.allocation)).toEqual([
      [7, 4, 3],
      [1, 2, 2],
      [6, 0, 0],
      [0, 1, 1],
      [4, 3, 1]
    ]);
  });
});

describe('deadlock · safety sweep (slides 30–32)', () => {
  it('⟨P1, P3, P4, P0, P2⟩ falls out computed — never typed', () => {
    const r = safetyAlgorithm(T0.available, T0.max, T0.allocation);
    expect(r.safe).toBe(true);
    expect(r.sequence).toEqual([1, 3, 4, 0, 2]);
  });

  it('the sweep record replays the ledger: probes, reclaims, final Work', () => {
    const r = safetyAlgorithm(T0.available, T0.max, T0.allocation);
    // Pass 1 scans P0→P4 against [3,3,2]: only P1's [1,2,2] fits.
    const pass1 = r.steps.slice(0, 5);
    expect(pass1.map((s) => s.pid)).toEqual([0, 1, 2, 3, 4]);
    expect(pass1[0]).toMatchObject({ pid: 0, satisfied: false });
    expect(pass1[0].cellOk).toEqual([false, false, false]);
    expect(pass1[1]).toMatchObject({ pid: 1, satisfied: true });
    expect(pass1[1].cellOk).toEqual([true, true, true]);
    expect(pass1.filter((s) => s.satisfied).map((s) => s.pid)).toEqual([1, 3]);
    // Every process finishes exactly once, in the computed order.
    expect(r.sequence.length).toBe(5);
    expect(new Set(r.sequence)).toEqual(new Set([0, 1, 2, 3, 4]));
    // All holdings reclaimed: Work ends at the system totals (10, 5, 7).
    expect(r.work).toEqual([10, 5, 7]);
  });

  it('slide 32, second question: P0 (0,2,0) — the sweep stays safe', () => {
    // The deck asks but does not answer; the sweep answers: granting leaves
    // [3,1,2] and still drains via ⟨P3, P1, P2, P0, P4⟩. Reported as a
    // deck-open question with a computed answer, not a refusal.
    const req = requestAlgorithm(T0, 0, [0, 2, 0]);
    expect(req.granted).toBe(true);
    expect(req.safety?.safe).toBe(true);
    expect(new Set(req.safety?.sequence)).toEqual(new Set([0, 1, 2, 3, 4]));
  });
});

describe('deadlock · request algorithm (slide 32)', () => {
  it('P1 (1,0,2): within Need, within Available, stays safe — granted', () => {
    const req = requestAlgorithm(T0, 1, [1, 0, 2]);
    expect(req.granted).toBe(true);
    expect(req.safety?.safe).toBe(true);
    expect(req.safety?.sequence).toEqual([1, 3, 4, 0, 2]);
  });

  it('P4 (3,3,0) is refused — the pretend-grant leaves [0,0,2], nobody fits', () => {
    // Passes checks 1–2 (within Need [4,3,1], within Available [3,3,2]), but
    // the pretended Available [0,0,2] satisfies no Need row — not even P4's
    // own [1,0,1] — so the sweep stalls with an empty sequence. The deck asks
    // without answering; the computation answers: refuse, unsafe.
    const req = requestAlgorithm(T0, 4, [3, 3, 0]);
    expect(req.granted).toBe(false);
    expect(req.safety?.safe).toBe(false);
    expect(req.safety?.sequence).toEqual([]);
    expect(req.reason).toMatch(/unsafe/);
  });

  it('exceeding the declared ceiling is refused before the sweep', () => {
    const req = requestAlgorithm(T0, 4, [5, 0, 0]);
    expect(req.granted).toBe(false);
    expect(req.reason).toMatch(/ceiling/);
    expect(req.safety).toBeNull();
  });

  it('a request within Need but past Available waits without the sweep', () => {
    // P1 may still need [1,2,2] but only [0,0,0] is free: check 2 fires first.
    const req = requestAlgorithm(
      { ...T0, available: [0, 0, 0] },
      1,
      [1, 0, 0]
    );
    expect(req.granted).toBe(false);
    expect(req.reason).toMatch(/must wait/);
    expect(req.safety).toBeNull();
  });
});

describe('deadlock · detection sweep (slides 39–40)', () => {
  it('slide 39 drains everyone: ⟨P0, P2, P3, P1, P4⟩ finishes all', () => {
    const r = detectionAlgorithm(DETECT_T0.available, DETECT_T0.allocation, DETECT_T0.request);
    expect(r.deadlocked).toEqual([]);
    expect(r.finish).toEqual([true, true, true, true, true]);
  });

  it('slide 40: P2 takes one more C — P1..P4 deadlock, P0 reclaimed', () => {
    const request = DETECT_T0.request.map((row, i) =>
      i === 2 ? [0, 0, 1] : [...row]
    );
    const r = detectionAlgorithm(DETECT_T0.available, DETECT_T0.allocation, request);
    expect(r.deadlocked).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(r.finish[0]).toBe(true);
  });

  it('the sweep compares Request, not Need — ceilings stay out of it', () => {
    // P0 holds nothing, so Finish[0] starts true however large its "Need".
    const r = detectionAlgorithm([0, 0, 0], [[0, 0, 0]], [[9, 9, 9]]);
    expect(r.finish).toEqual([true]);
    expect(r.deadlocked).toEqual([]);
  });
});

describe('deadlock · wait-for collapse (slide 35)', () => {
  it('reduces the RAG to who-blocks-whom; resources drop out', () => {
    // Slide 35a: T1→R1, R1→T2, T2→R3, R3→T5, T2→R4, R4→T3, T3→R5… plus the
    // R2/R5/T4 ring at the bottom. Probe the collapse on a readable slice:
    // T1 waits R1 held by T2; T2 waits R2 held by T1 — a two-cycle.
    const g: RagGraph = {
      nodes: [
        { id: 'T1', kind: 'process', instances: 1 },
        { id: 'T2', kind: 'process', instances: 1 },
        { id: 'R1', kind: 'resource', instances: 1 },
        { id: 'R2', kind: 'resource', instances: 1 }
      ],
      edges: [
        { from: 'T1', to: 'R1', kind: 'request' },
        { from: 'R1', to: 'T2', kind: 'assignment' },
        { from: 'T2', to: 'R2', kind: 'request' },
        { from: 'R2', to: 'T1', kind: 'assignment' }
      ]
    };
    const wfg = waitForGraph(g);
    expect([...wfg.keys()].sort()).toEqual(['T1', 'T2']);
    expect(wfg.get('T1')).toEqual(['T2']);
    expect(wfg.get('T2')).toEqual(['T1']);
  });

  it('a process holding what nobody waits on blocks nobody', () => {
    const wfg = waitForGraph(SLIDE9);
    // T3 holds R3, which T2 waits on — so T2→T3. T1 waits R1 held by T2.
    expect(wfg.get('T2')).toEqual(['T3']);
    expect(wfg.get('T1')).toEqual(['T2']);
    expect(wfg.has('T3')).toBe(false);
  });
});

describe('evaluateDetectionCadence — deck slide 41, the cost of checking', () => {
  it('opsPerSweep is the deck\'s O(m x n^2) bound from slide 38', () => {
    expect(evaluateDetectionCadence(10, 3, 5, 4).opsPerSweep).toBe(3 * 5 * 5);
  });

  it('the two costs move in opposite directions as the cadence loosens', () => {
    const tight = evaluateDetectionCadence(2, 3, 5, 4);
    const loose = evaluateDetectionCadence(30, 3, 5, 4);
    expect(tight.detectionOpsPerHour).toBeGreaterThan(loose.detectionOpsPerHour);
    expect(tight.blockedProcessMinutes).toBeLessThan(loose.blockedProcessMinutes);
  });

  it('a deadlock waits half a gap on average, and blocking scales with how many are stuck', () => {
    const c = evaluateDetectionCadence(30, 3, 5, 4);
    expect(c.meanUndetectedMinutes).toBe(15);
    expect(c.blockedProcessMinutes).toBe(15 * 4);
    expect(evaluateDetectionCadence(30, 3, 5, 2).blockedProcessMinutes).toBe(15 * 2);
  });

  it('everyMinutes is clamped to at least one minute', () => {
    expect(evaluateDetectionCadence(0, 3, 5, 4).everyMinutes).toBe(1);
  });
});
