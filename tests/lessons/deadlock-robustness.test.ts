import { describe, it, expect } from 'vitest';
import { recoveryRounds, evaluateDetectionCadence, detectionAlgorithm } from '../../src/algorithms/deadlock.js';
import { CANDIDATES, ROUNDS } from '../../src/lessons/lecture-10/lesson-22.js';
import {
  SWEEP_ALLOCATION,
  SWEEP_AVAILABLE,
  SWEEP_REQUEST_T0,
  SWEEP_REQUEST_T1,
  FLAT_NAMES,
  sweepEvents,
  sweepOf
} from '../../src/lessons/lecture-10/lesson-21.js';

describe('L21/L22 robustness, the verdicts are not artifacts of their fixtures', () => {
  it('L22 starvation is not an artifact of ROUNDS=5', () => {
    for (const r of [2, 3, 7, 12, 50]) {
      expect(recoveryRounds(CANDIDATES, r, false).starved).toBe(true);
      expect(recoveryRounds(CANDIDATES, r, true).starved).toBe(false);
    }
  });
  it('L22 starvation is not an artifact of these three candidates', () => {
    const alt = CANDIDATES.map((c, i) => ({ ...c, priority: 5 - i, computedMinutes: 5 + i * 30 }));
    expect(recoveryRounds(alt, 6, false).starved).toBe(true);
    expect(recoveryRounds(alt, 6, true).starved).toBe(false);
  });
  it('L22 selection is deterministic, same input, same picks, every time', () => {
    const a = recoveryRounds(CANDIDATES, ROUNDS, true).picks;
    for (let i = 0; i < 20; i++) expect(recoveryRounds(CANDIDATES, ROUNDS, true).picks).toEqual(a);
  });
  it('L22 recoveryRounds does not mutate the caller\'s candidates', () => {
    const before = JSON.stringify(CANDIDATES);
    recoveryRounds(CANDIDATES, 10, true);
    expect(JSON.stringify(CANDIDATES)).toBe(before);
  });
  it('L21 slide-40 verdict is not sensitive to row order', () => {
    const order = [4, 0, 3, 1, 2];
    const alloc = order.map((i) => SWEEP_ALLOCATION[i]);
    const req = order.map((i) => SWEEP_REQUEST_T1[i]);
    const r = detectionAlgorithm(SWEEP_AVAILABLE, alloc, req);
    const backToOriginal = r.deadlocked.map((p) => `P${order[Number(p.slice(1))]}`).sort();
    expect(backToOriginal).toEqual(['P1', 'P2', 'P3', 'P4']);
  });
  it('L21 cadence: blocking cost is zero when nothing is deadlocked', () => {
    expect(evaluateDetectionCadence(30, 3, 5, 0).blockedProcessMinutes).toBe(0);
  });
  it('L21 cadence handles absurd input without NaN', () => {
    for (const v of [0, -5, 1e6]) {
      const c = evaluateDetectionCadence(v, 3, 5, 4);
      expect(Number.isFinite(c.detectionOpsPerHour)).toBe(true);
      expect(Number.isFinite(c.blockedProcessMinutes)).toBe(true);
    }
  });
  it('L21 sweep is pure, repeated calls agree', () => {
    const a = sweepOf(SWEEP_REQUEST_T1);
    expect(sweepOf(SWEEP_REQUEST_T1).deadlocked).toEqual(a.deadlocked);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Caption truth, added after an audit found a caption that contradicted the
// mechanism it described. The gate cannot read prose and no test bound these
// strings to the algorithm, so a sentence could claim any ordering it liked.
//
// The defect: detectionAlgorithm scans P0→Pn each pass and reclaims only the
// FIRST satisfiable process, but keeps scanning, so several probes report
// satisfied while one is reclaimed. A caption read "Flat 4 fits too, but
// Flat 1 came first in this pass, so Flat 4 finishes next" when the real
// reclaim order was 0 → 2 → 1 → 3 → 4, i.e. Flat 3 finished next.
// ─────────────────────────────────────────────────────────────────────────────

describe('L21 · every caption is true of the sweep it describes', () => {
  /** Reclaim order, derived independently of the lesson's own pass-splitting. */
  const reclaimOrder = (request: number[][]): number[] => {
    const order: number[] = [];
    const work = [...SWEEP_AVAILABLE];
    const finish = SWEEP_ALLOCATION.map((row) => row.every((v) => v === 0));
    for (;;) {
      let found = -1;
      for (let i = 0; i < SWEEP_ALLOCATION.length && found < 0; i++) {
        if (finish[i]) continue;
        if (request[i].every((v, j) => v <= work[j])) found = i;
      }
      if (found < 0) break;
      SWEEP_ALLOCATION[found].forEach((v, j) => (work[j] += v));
      finish[found] = true;
      order.push(found);
    }
    return order;
  };

  for (const [name, request] of [
    ['slide 39 (t0)', SWEEP_REQUEST_T0],
    ['slide 40 (t1)', SWEEP_REQUEST_T1]
  ] as const) {
    it(`states the right successor in every "gets its turn after" caption, ${name}`, () => {
      const order = reclaimOrder(request);
      const captions = sweepEvents(request).map((e) => e.caption);
      const turns = captions.filter((c) => c.includes('gets its turn after'));

      for (const c of turns) {
        const m = c.match(/^(Flat \d) fits too.*after (Flat \d)\.$/);
        expect(m, `unparsed caption: ${c}`).not.toBeNull();
        const [, who, after] = m!;
        const whoPid = FLAT_NAMES.indexOf(who);
        const afterPid = FLAT_NAMES.indexOf(after);
        const at = order.indexOf(whoPid);
        expect(at, `${who} is claimed to finish but never does`).toBeGreaterThan(0);
        // the named predecessor must be the one immediately before it
        expect(FLAT_NAMES[order[at - 1]], `caption: ${c}`).toBe(after);
        expect(order.indexOf(afterPid)).toBe(at - 1);
      }
    });

    it(`never says a deadlocked flat finishes, ${name}`, () => {
      const order = reclaimOrder(request);
      const stuck = SWEEP_ALLOCATION.map((_, i) => i).filter((i) => !order.includes(i));
      for (const c of sweepEvents(request).map((e) => e.caption)) {
        for (const pid of stuck) {
          if (!c.startsWith(`${FLAT_NAMES[pid]} `)) continue;
          expect(c, `${FLAT_NAMES[pid]} never finishes, but a caption says it does`).not.toMatch(
            /it finishes and hands everything back|gets its turn after/
          );
        }
      }
    });

    it(`claims exactly one flat finishes per pass, ${name}`, () => {
      const order = reclaimOrder(request);
      const finishes = sweepEvents(request)
        .map((e) => e.caption)
        .filter((c) => c.includes('it finishes and hands everything back'));
      expect(finishes).toHaveLength(order.length);
      // and in the order the algorithm reclaims them
      finishes.forEach((c, i) => expect(c.startsWith(FLAT_NAMES[order[i]])).toBe(true));
    });
  }

  it('the t1 sweep really does strand four flats, the deck slide-40 tip', () => {
    expect(reclaimOrder(SWEEP_REQUEST_T1)).toEqual([0]);
    expect(reclaimOrder(SWEEP_REQUEST_T0)).toEqual([0, 2, 1, 3, 4]);
  });
});
