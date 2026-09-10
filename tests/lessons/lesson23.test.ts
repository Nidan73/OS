import { describe, it, expect, beforeEach } from 'vitest';
import {
  lesson23,
  Lesson23GanttEngine,
  scenarioInput,
  comparisonFor,
  verdictFor,
  simulation,
  workloadOf,
  DECK_BURSTS,
  DECK_ORDER,
  ASCENDING_ORDER,
  DECK_QUANTUM,
  DECK_LITTLE,
  SCENARIOS,
  SCENARIO_LABELS,
  type Lesson23Scenario
} from '../../src/lessons/lecture-07/lesson-23.js';
import {
  fcfs,
  sjf,
  roundRobin,
  littlesLaw,
  bestOf,
  orderingsOf,
  simulateOrderings
} from '../../src/algorithms/scheduling.js';

// Lecture 7 slides 24–30, read off the slide images (slide 24 = image16.png,
// slide 25 = image17/18/19.png) before the lesson was written. If any of these
// fail, the deck and the lesson have diverged, fix the lesson, never the deck.

describe('L23 · deck fidelity, slide 24 workload', () => {
  it('carries slide 24s five bursts, all arriving at time 0', () => {
    expect(DECK_BURSTS).toEqual({ P1: 10, P2: 29, P3: 3, P4: 7, P5: 12 });
    expect(workloadOf(DECK_ORDER).every((p) => p.arrival === 0)).toBe(true);
    expect(workloadOf(DECK_ORDER)).toHaveLength(5);
  });

  it('reproduces slide 25s three published averages exactly', () => {
    const w = workloadOf(DECK_ORDER);
    expect(fcfs(w).avgWaiting).toBe(28);
    expect(sjf(w).avgWaiting).toBe(13);
    expect(roundRobin(w, DECK_QUANTUM).avgWaiting).toBe(23);
  });

  it('reproduces the three Gantt charts drawn on slide 25, boundary for boundary', () => {
    const w = workloadOf(DECK_ORDER);
    const seg = (bars: { id: string; start: number; end: number }[]) =>
      bars.map((b) => `${b.id}:${b.start}-${b.end}`).join(' ');
    // image17. FCFS: 0 · 10 · 39 · 42 · 49 · 61
    expect(seg(fcfs(w).bars)).toBe('P1:0-10 P2:10-39 P3:39-42 P4:42-49 P5:49-61');
    // image18. SJF: 0 · 3 · 10 · 20 · 32 · 61
    expect(seg(sjf(w).bars)).toBe('P3:0-3 P4:3-10 P1:10-20 P5:20-32 P2:32-61');
    // image19. RR q=10, eight segments ending at 61
    const rr = roundRobin(w, DECK_QUANTUM);
    expect(rr.bars).toHaveLength(8);
    expect(seg(rr.bars)).toBe('P1:0-10 P2:10-20 P3:20-23 P4:23-30 P5:30-40 P2:40-50 P5:50-52 P2:52-61');
  });

  it('conserves total work, every rule finishes at 61', () => {
    const w = workloadOf(DECK_ORDER);
    for (const r of [fcfs(w), sjf(w), roundRobin(w, DECK_QUANTUM)]) {
      expect(r.totalTime).toBe(61);
    }
  });
});

describe('L23 · Littles formula (slide 27) closes in all three directions', () => {
  it('solves W from the decks own example: 7 arrive, 14 queue, wait 2', () => {
    const r = littlesLaw({ n: 14, lambda: 7 });
    expect(r.w).toBe(2);
    expect(r.solvedFor).toBe('w');
  });

  it('solves n and lambda from the same triple', () => {
    expect(littlesLaw({ lambda: 7, w: 2 })).toMatchObject({ n: 14, solvedFor: 'n' });
    expect(littlesLaw({ n: 14, w: 2 })).toMatchObject({ lambda: 7, solvedFor: 'lambda' });
  });

  it('is self-consistent: whichever term is derived, n = lambda x W still holds', () => {
    for (const known of [{ n: 14, lambda: 7 }, { lambda: 7, w: 2 }, { n: 14, w: 2 }]) {
      const r = littlesLaw(known);
      expect(Math.abs(r.n - r.lambda * r.w)).toBeLessThan(0.01);
    }
  });

  it('refuses ambiguous or over-specified input rather than guessing', () => {
    expect(() => littlesLaw({ n: 14 })).toThrow(/exactly two/);
    expect(() => littlesLaw({})).toThrow(/exactly two/);
    expect(() => littlesLaw({ n: 14, lambda: 7, w: 2 })).toThrow(/exactly two/);
  });

  it('refuses to divide by zero instead of returning Infinity', () => {
    expect(() => littlesLaw({ n: 14, w: 0 })).toThrow();
    expect(() => littlesLaw({ n: 14, lambda: 0 })).toThrow();
    expect(littlesLaw({ lambda: 0, w: 5 }).n).toBe(0);
  });

  it('holds at the decks stated scale and at other scales, it is unit-agnostic', () => {
    expect(littlesLaw({ lambda: DECK_LITTLE.lambda, w: 2 }).n).toBe(DECK_LITTLE.n);
    expect(littlesLaw({ lambda: 0.5, w: 30 }).n).toBe(15);
    expect(littlesLaw({ n: 1000, lambda: 250 }).w).toBe(4);
  });
});

describe('L23 · simulation over every ordering (slides 28–30)', () => {
  const sim = simulation();

  it('enumerates all 120 orderings of the five tickets', () => {
    expect(sim.orderings).toBe(120);
    expect(orderingsOf([10, 29, 3, 7, 12])).toHaveLength(120);
  });

  it('shows SJF invariant at 13, optimality demonstrated, not asserted', () => {
    const s = sim.spread.find((r) => r.algorithm === 'sjf')!;
    expect(s.invariant).toBe(true);
    expect(s.min).toBe(13);
    expect(s.max).toBe(13);
    expect(sim.winCounts.sjf).toBe(120);
  });

  it('shows FCFS and RR swinging with the ordering, which is the whole point', () => {
    const f = sim.spread.find((r) => r.algorithm === 'fcfs')!;
    const r = sim.spread.find((r) => r.algorithm === 'rr')!;
    expect(f.invariant).toBe(false);
    expect(r.invariant).toBe(false);
    expect(f.min).toBe(13);
    expect(f.max).toBe(35.8);
    expect(r.min).toBe(15);
    expect(r.max).toBe(31.8);
    // the single deterministic run on slide 25 sits inside those ranges and
    // tells you nothing about their width
    expect(f.min).toBeLessThan(28);
    expect(f.max).toBeGreaterThan(28);
  });

  it('deduplicates orderings of a multiset with repeats', () => {
    expect(orderingsOf([5, 5, 5])).toHaveLength(1);
    expect(orderingsOf([1, 1, 2])).toHaveLength(3);
  });

  it('guards the factorial rather than hanging', () => {
    expect(() => orderingsOf([1, 2, 3, 4, 5, 6, 7, 8, 9])).toThrow(/too many/);
  });

  it('is deterministic, the same sweep twice gives the same spread', () => {
    expect(simulateOrderings([10, 29, 3, 7, 12], 10)).toEqual(simulateOrderings([10, 29, 3, 7, 12], 10));
  });
});

describe('L23 · scenarios compute, never declare', () => {
  it('gives slide 25s numbers for the three deck-order rules', () => {
    expect(verdictFor('fcfs').avgWaiting).toBe(28);
    expect(verdictFor('sjf').avgWaiting).toBe(13);
    expect(verdictFor('rr').avgWaiting).toBe(23);
  });

  it('flips the FCFS/RR ranking on a different booking order, same five tickets', () => {
    // deck order: RR (23) beats FCFS (28)
    const deck = comparisonFor('fcfs');
    const deckF = deck.find((v) => v.algorithm === 'fcfs')!.avgWaiting;
    const deckR = deck.find((v) => v.algorithm === 'rr')!.avgWaiting;
    expect(deckR).toBeLessThan(deckF);

    // ascending order: FCFS (13) now beats RR (15)
    const alt = comparisonFor('reorder');
    const altF = alt.find((v) => v.algorithm === 'fcfs')!.avgWaiting;
    const altR = alt.find((v) => v.algorithm === 'rr')!.avgWaiting;
    expect(altF).toBe(13);
    expect(altR).toBe(15);
    expect(altF).toBeLessThan(altR);
  });

  it('changes nothing about the workload between those two scenarios except order', () => {
    const a = workloadOf(DECK_ORDER)
      .map((p) => p.burst)
      .sort((x, y) => x - y);
    const b = workloadOf(ASCENDING_ORDER)
      .map((p) => p.burst)
      .sort((x, y) => x - y);
    expect(a).toEqual(b);
    expect(new Set(ASCENDING_ORDER)).toEqual(new Set(DECK_ORDER));
  });

  it('keeps SJF at 13 under the reorder, the invariant survives the snapshot change', () => {
    expect(comparisonFor('reorder').find((v) => v.algorithm === 'sjf')!.avgWaiting).toBe(13);
  });

  it('picks the winner by computation and resolves ties to the earliest listed', () => {
    expect(bestOf(comparisonFor('fcfs')).algorithm).toBe('sjf');
    // on the ascending sheet FCFS ties SJF at 13; fcfs is listed first
    expect(bestOf(comparisonFor('reorder')).algorithm).toBe('fcfs');
    expect(bestOf(comparisonFor('reorder')).avgWaiting).toBe(13);
  });

  it('exposes a label for every scenario and an input for every label', () => {
    const ids = Object.keys(SCENARIOS) as Lesson23Scenario[];
    expect(Object.keys(SCENARIO_LABELS).sort()).toEqual(ids.sort());
    for (const id of ids) {
      expect(scenarioInput(id).processes).toHaveLength(5);
      expect(scenarioInput(id).quantum).toBe(DECK_QUANTUM);
    }
  });
});

describe('L23 · engine', () => {
  let host: HTMLElement;
  let engine: Lesson23GanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new Lesson23GanttEngine(host, scenarioInput('fcfs'));
    engine.init();
  });

  it('declares the engine it actually inherits', () => {
    expect(lesson23.engine).toBe('gantt');
    expect(engine).toBeInstanceOf(Lesson23GanttEngine);
  });

  it('meets the density floor on every scenario and stays under the ceiling', () => {
    for (const id of Object.keys(SCENARIOS) as Lesson23Scenario[]) {
      const e = new Lesson23GanttEngine(document.createElement('div'), scenarioInput(id));
      e.init();
      const n = e.getSteps().length;
      expect(n, `${id} step count`).toBeGreaterThanOrEqual(12);
      expect(n, `${id} step count`).toBeLessThanOrEqual(30);
    }
  });

  it('splices one tally beat per party plus the divide, ahead of the summary', () => {
    const steps = engine.getSteps();
    // 1 arrival + 2 per bar (5 bars) + 5 tally + 1 average + 1 engine summary
    expect(steps.length).toBe(1 + 10 + 5 + 1 + 1);
  });

  it('derives the average before the engine summary states it', () => {
    const steps = engine.getSteps();
    // both lenses are student-facing; the tally wording lives on the analogy side
    const both = (st: { caption: string; analogyCaption?: string }) =>
      `${st.caption} ${st.analogyCaption ?? ''}`;
    const derived = steps.findIndex((s) => both(s).includes('minutes each'));
    const stated = steps.findIndex((s) => both(s).includes('Avg Wait'));
    expect(derived).toBeGreaterThan(-1);
    expect(stated).toBeGreaterThan(-1);
    expect(derived).toBeLessThan(stated);
  });

  it('keeps the timeline monotonic after the splice', () => {
    const ts = engine.getSteps().map((s) => s.t);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });

  it('reads the running total off the schedule, so the tally sums to the average', () => {
    const steps = engine.getSteps();
    const divide = steps.find((s) => `${s.caption} ${s.analogyCaption ?? ''}`.includes('minutes each'))!;
    const result = engine.getScheduleResult();
    const total = Object.values(result.waiting).reduce((a, b) => a + b, 0);
    expect(`${divide.caption} ${divide.analogyCaption ?? ''}`).toContain(String(total));
    expect(divide.state.averages.avgWaiting).toBe(result.avgWaiting);
    expect(divide.state.averages.avgWaiting).toBe(28);
    // and the running totals actually accumulate to it, beat by beat
    const tally = steps.filter((s) => `${s.caption} ${s.analogyCaption ?? ''}`.includes('Running total'));
    expect(tally).toHaveLength(5);
    expect(
      `${tally[tally.length - 1].caption} ${tally[tally.length - 1].analogyCaption ?? ''}`
    ).toContain(String(total));
  });

  it('moves the highlight to a different party on each tally beat', () => {
    const steps = engine.getSteps();
    const tally = steps.slice(-7, -2);
    const seen = tally.map((s) => s.state.activeProcessId);
    expect(new Set(seen).size).toBe(5);
    expect(seen).toEqual(DECK_ORDER);
  });

  it('switches scenario and rebuilds the schedule from the algorithm', () => {
    engine.applyScenario('sjf');
    expect(engine.getScenario()).toBe('sjf');
    expect(engine.getScheduleResult().avgWaiting).toBe(13);
    engine.applyScenario('rr');
    expect(engine.getScheduleResult().avgWaiting).toBe(23);
    engine.applyScenario('reorder');
    expect(engine.getScheduleResult().avgWaiting).toBe(13);
  });

  it('ignores an unknown or repeated scenario instead of rebuilding', () => {
    engine.applyScenario('fcfs');
    expect(engine.getScenario()).toBe('fcfs');
    engine.applyScenario('nonsense' as Lesson23Scenario);
    expect(engine.getScenario()).toBe('fcfs');
  });

  it('keeps the two supplied Little terms when the derived one changes', () => {
    expect(engine.getLittle()).toMatchObject({ n: 14, lambda: 7, w: 2, solvedFor: 'w' });
    engine.setSolveFor('n');
    expect(engine.getLittle()).toMatchObject({ n: 14, lambda: 7, w: 2, solvedFor: 'n' });
    engine.setSolveFor('lambda');
    expect(engine.getLittle()).toMatchObject({ n: 14, lambda: 7, w: 2, solvedFor: 'lambda' });
  });

  it('re-derives the third term when a supplied term moves', () => {
    engine.setSolveFor('n');
    engine.setLittleTerm('lambda', 10);
    expect(engine.getLittle().n).toBe(20);
    engine.setLittleTerm('w', 3);
    expect(engine.getLittle().n).toBe(30);
  });

  it('refuses to set the derived term directly', () => {
    engine.setSolveFor('n');
    engine.setLittleTerm('n', 999);
    expect(engine.getLittle().n).toBe(14);
  });

  it('holds the isomorphism and the morph the gantt engine defines', () => {
    expect(() => engine.validateIsomorphism()).not.toThrow();
    expect(() => engine.validateMorph()).not.toThrow();
  });

  it('exposes the playground state through debug hooks', () => {
    const hooks = engine.debugHooks() as Record<string, () => unknown>;
    expect(hooks.getScenario()).toBe('fcfs');
    expect(hooks.getComparison()).toHaveLength(3);
    expect((hooks.getSimulation() as { orderings: number }).orderings).toBe(120);
  });
});

describe('L23 · lesson contract', () => {
  it('claims the units and slides LESSONS.md assigns it', () => {
    expect(lesson23.id).toBe(23);
    expect(lesson23.lecture).toBe(7);
    expect(lesson23.absorbsUnits).toEqual([31, 32, 33]);
    expect(lesson23.slides).toBe('slides 24–30');
  });

  it('names a geometric property whose meaning changes, not the topic', () => {
    const m = lesson23.morphReveals!;
    expect(m.toLowerCase()).toContain('width');
    // the reveal must say what width stops meaning and starts meaning
    expect(m).toMatch(/stops meaning|starts meaning/);
    expect(m.length).toBeGreaterThan(120);
  });

  it('teaches all three evaluation methods in the concept, not just the Gantt one', () => {
    const c = lesson23.concept.toLowerCase();
    expect(c).toContain('deterministic');
    expect(c).toContain('queueing');
    expect(c).toContain('simulation');
    expect(c).toContain('implementation');
    expect(c).toContain('little');
  });

  it('quotes the decks published numbers in the concept and nowhere invents others', () => {
    expect(lesson23.concept).toContain('28');
    expect(lesson23.concept).toContain('13');
    expect(lesson23.concept).toContain('23');
  });

  it('maps every analogy element to a mechanism element', () => {
    expect(lesson23.analogyMapping!.length).toBeGreaterThanOrEqual(6);
    for (const row of lesson23.analogyMapping!) {
      expect(row).toContain('➔');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Added after an audit caught an arithmetic error in morphReveals: it claimed
// the engagement party was "wider than the other four together" when 29 < 32.
// Nothing bound that sentence to DECK_BURSTS, so prose could assert anything.
// ─────────────────────────────────────────────────────────────────────────────

describe('L23 · the prose agrees with the burst data', () => {
  const biggest = Math.max(...Object.values(DECK_BURSTS));
  const rest = Object.values(DECK_BURSTS).reduce((a, b) => a + b, 0) - biggest;

  it('quotes both figures, and they are the real ones', () => {
    expect(biggest).toBe(29);
    expect(rest).toBe(32);
    expect(lesson23.morphReveals).toContain(String(biggest));
    expect(lesson23.morphReveals).toContain(String(rest));
  });

  it('does not claim the biggest exceeds the rest, because it does not', () => {
    expect(biggest).toBeLessThan(rest);
    expect(lesson23.morphReveals!.toLowerCase()).not.toMatch(
      /wider than the other four together|larger than the other four together/
    );
    // it must say "almost", which is the true relation
    expect(lesson23.morphReveals!.toLowerCase()).toMatch(/almost as wide/);
  });

  it('every number in morphReveals is one the algorithms produce', () => {
    const known = new Set<number>([
      ...Object.values(DECK_BURSTS),
      biggest,
      rest,
      ...comparisonFor('fcfs').map((v) => v.avgWaiting),
      Object.keys(DECK_BURSTS).length
    ]);
    const quoted = (lesson23.morphReveals!.match(/\b\d+(\.\d+)?\b/g) ?? []).map(Number);
    expect(quoted.length).toBeGreaterThan(0);
    for (const n of quoted) {
      expect(known.has(n), `morphReveals quotes ${n}, which no algorithm produces`).toBe(true);
    }
  });

  it('the tally walks the chart, not the input order. SJF reorders the bars', () => {
    const e = new Lesson23GanttEngine(document.createElement('div'), scenarioInput('sjf'));
    e.init();
    e.applyScenario('sjf');
    const tally = e
      .getSteps()
      .filter((s) => `${s.caption} ${s.analogyCaption ?? ''}`.includes('Running total'))
      .map((s) => s.state.activeProcessId);
    const barOrder = Array.from(new Set(e.getScheduleResult().bars.map((b) => b.id)));
    expect(tally).toEqual(barOrder);
    // and SJF genuinely reorders, so this is not vacuously true
    expect(barOrder).not.toEqual(DECK_ORDER);
  });
});
