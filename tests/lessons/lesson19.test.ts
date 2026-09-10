import { describe, expect, it } from 'vitest';
import { GraphEngine } from '../../src/engines/graph.js';
import { detectionAlgorithm, safetyAlgorithm } from '../../src/algorithms/deadlock.js';
import {
  CLAIM_NODES,
  Lesson19GraphEngine,
  MAX_CLAIMS,
  TOTAL_NOTES,
  allocationOf,
  availableOf,
  claimsEvents,
  friendlyEvents,
  grantEvents,
  grantWouldCloseRing,
  hostileEvents,
  ledgerEvents,
  lesson19,
  lesson19Input,
  regionOf,
  safeSequenceOf,
  scenarioEvents,
  scenarioInput,
  stateAfterEvents,
  stuckOf,
  type Lesson19Scenario,
  type Lesson19State,
  type Region
} from '../../src/lessons/lecture-10/lesson-19.js';

const SCENARIOS: Lesson19Scenario[] = ['ledger', 'grant', 'friendly', 'hostile', 'claims'];
const LAST = (s: Lesson19Scenario) =>
  stateAfterEvents(scenarioEvents(s), s === 'hostile');

describe('Lesson 19 · every verdict is computed', () => {
  it('the declared-ceiling draw is safe, in the deck sequence', () => {
    const end = LAST('ledger');
    const safety = safetyAlgorithm(
      [availableOf(end)],
      MAX_CLAIMS.map((m) => [m]),
      allocationOf(end).map((a) => [a])
    );
    expect(safety.safe).toBe(true);
    expect(safety.sequence).toEqual([1, 0, 2]);
    expect(safeSequenceOf(end)).toBe('Mother → Father → Elder Sister');
    expect(regionOf(end)).toBe('safe');
  });

  it('the grant loses the guarantee — unsafe, yet nobody is stuck', () => {
    const end = LAST('grant');
    const safety = safetyAlgorithm(
      [availableOf(end)],
      MAX_CLAIMS.map((m) => [m]),
      allocationOf(end).map((a) => [a])
    );
    expect(safety.safe).toBe(false);
    expect(allocationOf(end)).toEqual([5, 2, 3]);
    expect(availableOf(end)).toBe(2);
    expect(regionOf(end)).toBe('unsafe');
    expect(stuckOf(end)).toEqual([]);
  });

  it('friendly completion finishes everyone — unsafe was not stuck', () => {
    const end = LAST('friendly');
    expect(allocationOf(end)).toEqual([0, 0, 0]);
    expect(availableOf(end)).toBe(TOTAL_NOTES);
    expect(regionOf(end)).toBe('complete');
  });

  it('the same unsafe state turns stuck when everyone asks the rest at once', () => {
    const end = LAST('hostile');
    const detection = detectionAlgorithm(
      [availableOf(end)],
      allocationOf(end).map((a) => [a]),
      MAX_CLAIMS.map((m, i) => [m - allocationOf(end)[i]])
    );
    expect(detection.deadlocked).toEqual(['P0', 'P2']);
    expect(regionOf(end)).toBe('deadlock');
  });

  it('the claim check refuses the ring and allows the same grant without the claim', () => {
    const events = claimsEvents();
    // After the ask beat (index 4): Father's claim T1→C2 still stands.
    const withClaim = stateAfterEvents(events.slice(0, 5));
    expect(grantWouldCloseRing(CLAIM_NODES, withClaim.edges)).toBe(true);
    // After Father drops his claim (index 7), the same grant closes no ring.
    const withoutClaim = stateAfterEvents(events.slice(0, 8));
    expect(grantWouldCloseRing(CLAIM_NODES, withoutClaim.edges)).toBe(false);
  });

  it('the refusal verdict and the allowed grant are both in the script', () => {
    const events = claimsEvents();
    expect(events[5].caption).toMatch(/Refused/);
    expect(events[5].setCycle).toEqual(['T1', 'C2', 'T2', 'C1']);
    expect(events[events.length - 1].caption).toMatch(/Mother gets Car 1/);
  });
});

describe('Lesson 19 · steps are complete event sets', () => {
  it('script lengths: ledger 7, grant 9, friendly 13, hostile 11, claims 9 events', () => {
    expect(ledgerEvents().length).toBe(7);
    expect(grantEvents().length).toBe(9);
    expect(friendlyEvents().length).toBe(13);
    expect(hostileEvents().length).toBe(11);
    expect(claimsEvents().length).toBe(9);
  });

  it('mounted timelines add the idle frame and carry the hostile flag', () => {
    for (const id of SCENARIOS) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const engine = new Lesson19GraphEngine(host, scenarioInput(id));
      engine.init(0);
      const steps = engine.getSteps();
      expect(steps.length).toBe(scenarioEvents(id).length + 1);
      const last = steps[steps.length - 1].state as Lesson19State;
      expect(last.allAskNeed).toBe(id === 'hostile');
      engine.destroy();
      host.remove();
    }
  });

  it('debug hooks expose the computed region after the scenario plays out', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson19GraphEngine(host, scenarioInput('ledger'));
    engine.init(0);
    const hooks = engine.debugHooks();
    (hooks.setScenario as (s: Lesson19Scenario) => void)('grant');
    engine.seek(engine.getSteps().length - 1);
    expect((hooks.getRegion as () => Region)()).toBe('unsafe');
    (hooks.setScenario as (s: Lesson19Scenario) => void)('friendly');
    engine.seek(engine.getSteps().length - 1);
    expect((hooks.getRegion as () => Region)()).toBe('complete');
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 19 · the morph is geometric, not cosmetic (§3C.2a, §3C.2c)', () => {
  const widthsAt = (view: number, scenario: Lesson19Scenario): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson19GraphEngine(host, scenarioInput(scenario));
    engine.init(view);
    engine.seek(engine.getSteps().length - 1);
    engine.setView(view);
    const out: Record<string, number> = {};
    host.querySelectorAll('[id^="bar-"]').forEach((el) => {
      const rect = el.querySelector('rect');
      const w = parseFloat(rect?.getAttribute('width') ?? 'NaN');
      if (Number.isFinite(w)) out[(el as Element).id] = w;
    });
    engine.destroy();
    host.remove();
    return out;
  };

  it('analogy layout is native: equal purses around the table', () => {
    const w = widthsAt(0, 'ledger');
    const vals = Object.values(w);
    expect(vals.length).toBe(4);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
  });

  it('mechanism layout encodes holdings: the fund is as wide as twelve notes', () => {
    const w = widthsAt(1, 'ledger');
    expect(w['bar-R']).toBeGreaterThan(Math.max(w['bar-P0'], w['bar-P1'], w['bar-P2']));
    const wClaim = widthsAt(1, 'claims');
    expect(wClaim['bar-C1']).toBeLessThan(w['bar-R']);
  });

  it('geometry interpolates — the morph is real', () => {
    const a = widthsAt(0, 'ledger');
    const mid = widthsAt(0.5, 'ledger');
    const b = widthsAt(1, 'ledger');
    for (const id of Object.keys(a)) {
      if (Math.abs(a[id] - b[id]) < 1) continue;
      expect(mid[id]).toBeGreaterThan(Math.min(a[id], b[id]));
      expect(mid[id]).toBeLessThan(Math.max(a[id], b[id]));
    }
  });

  it('mounted cycle state agrees with the claim rule', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson19GraphEngine(host, scenarioInput('claims'));
    engine.init(0);
    engine.seek(6); // the refusal beat
    const st = engine.getSteps()[6].state;
    expect(st.cycleIds).toEqual(['T1', 'C2', 'T2', 'C1']);
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 19 · lesson wiring and copy', () => {
  it('declares the graph engine it really extends, and absorbs units 76–79', () => {
    expect(lesson19.engine).toBe('graph');
    expect(lesson19.engineClass).toBeDefined();
    expect(lesson19.engineClass?.prototype instanceof GraphEngine).toBe(true);
    expect(lesson19.absorbsUnits).toEqual([76, 77, 78, 79]);
    expect(lesson19.id).toBe(19);
    expect(lesson19.slug).toBe('lesson-19');
  });

  it('opens on the declared-ceiling ledger with a real morph', () => {
    expect(lesson19.morphMode).toBe('morph');
    expect(lesson19Input.nodes.find((n) => n.id === 'R')?.instances).toBe(TOTAL_NOTES);
    expect(lesson19Input.events.length).toBe(ledgerEvents().length);
  });

  it('keeps bare outcome numbers out of analogy, concept and morph copy', () => {
    const digits = (s: string) => [...s.matchAll(/\d+/g)].map((m) => m[0]);
    expect(digits(lesson19.analogy.text)).toEqual([]);
    expect(digits(lesson19.concept)).toEqual([]);
    expect(digits(lesson19.morphReveals)).toEqual([]);
  });

  it('carries the lesson: unsafe is not stuck, and the register stays household', () => {
    const allCopy = [
      lesson19.analogy.text,
      lesson19.concept,
      lesson19.morphReveals,
      ...friendlyEvents().map((e) => e.caption),
      ...grantEvents().map((e) => e.caption)
    ].join('\n').toLowerCase();
    expect(allCopy).toContain('unsafe means no guarantee');
    expect(allCopy).toContain('nobody is stuck yet');
    for (const word of ['mother', 'father', 'sister']) {
      expect(allCopy).toContain(word);
    }
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson19.analogy.text,
      lesson19.concept,
      lesson19.morphReveals,
      ...(lesson19.analogyMapping ?? []),
      ...SCENARIOS.flatMap((s) => scenarioEvents(s).map((e) => e.caption))
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});
