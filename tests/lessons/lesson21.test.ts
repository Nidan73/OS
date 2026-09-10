import { describe, it, expect } from 'vitest';
import {
  CADENCE_SAMPLES,
  COLLAPSE_NODES,
  FLAT_NAMES,
  Lesson21GraphEngine,
  SWEEP_ALLOCATION,
  SWEEP_AVAILABLE,
  SWEEP_NODES,
  SWEEP_REQUEST_T0,
  SWEEP_REQUEST_T1,
  SWEEP_TOTALS,
  cadenceOf,
  collapseEvents,
  lesson21,
  ringOf,
  scenarioInput,
  sweepOf,
  type Lesson21Scenario
} from '../../src/lessons/lecture-10/lesson-21.js';
import { detectionAlgorithm, evaluateDetectionCadence } from '../../src/algorithms/deadlock.js';

const mount = (scenario: Lesson21Scenario) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const engine = new Lesson21GraphEngine(host, scenarioInput(scenario));
  engine.init(0);
  return { host, engine };
};

describe('Lesson 21 · the deck reproduces itself', () => {
  it('slide 39 snapshot: everyone finishes, nobody deadlocked', () => {
    const r = sweepOf(SWEEP_REQUEST_T0);
    expect(r.deadlocked).toEqual([]);
    expect(r.finish).toEqual([true, true, true, true, true]);
  });

  it('slide 40: P2 asks one more C and the deck\'s exact four are deadlocked', () => {
    const r = sweepOf(SWEEP_REQUEST_T1);
    expect(r.deadlocked).toEqual(['P1', 'P2', 'P3', 'P4']);
    // Slide 40: "Can reclaim resources held by P0" — P0 alone finishes.
    expect(r.finish).toEqual([true, false, false, false, false]);
  });

  it('the two snapshots differ in exactly one cell — P2\'s C request', () => {
    let diffs = 0;
    SWEEP_REQUEST_T0.forEach((row, i) =>
      row.forEach((v, j) => {
        if (v !== SWEEP_REQUEST_T1[i][j]) diffs++;
      })
    );
    expect(diffs).toBe(1);
    expect(SWEEP_REQUEST_T1[2][2]).toBe(SWEEP_REQUEST_T0[2][2] + 1);
  });

  it('Available is derived from totals minus allocation, never typed', () => {
    expect(SWEEP_AVAILABLE).toEqual([0, 0, 0]);
    SWEEP_TOTALS.forEach((total, j) => {
      const held = SWEEP_ALLOCATION.reduce((sum, row) => sum + row[j], 0);
      expect(SWEEP_AVAILABLE[j]).toBe(total - held);
    });
  });

  it('verdicts come from detectionAlgorithm, not from stored answers', () => {
    expect(sweepOf(SWEEP_REQUEST_T1).deadlocked).toEqual(
      detectionAlgorithm(SWEEP_AVAILABLE, SWEEP_ALLOCATION, SWEEP_REQUEST_T1).deadlocked
    );
  });
});

describe('Lesson 21 · the collapse is computed, not drawn', () => {
  it('the driveway closes a ring before the collapse', () => {
    const { engine } = mount('collapse');
    const steps = engine.getSteps();
    const ringStep = steps.find((s) => s.state.cycleIds.length > 0);
    expect(ringStep).toBeDefined();
    expect(ringStep!.state.cycleIds.length).toBeGreaterThan(0);
    engine.destroy();
  });

  it('the wait-for edges are waitForGraph output, and drop every resource', () => {
    const events = collapseEvents();
    const collapse = events.find((e) => (e as { removeEdges?: unknown[] }).removeEdges);
    expect(collapse).toBeDefined();
    const added = (collapse as unknown as { addEdges: { from: string; to: string }[] }).addEdges;
    // Every wait-for arrow runs flat-to-flat: no spot id survives the collapse.
    for (const e of added) {
      expect(e.from.startsWith('H')).toBe(true);
      expect(e.to.startsWith('H')).toBe(true);
    }
  });

  it('the ring survives the collapse — same loop, half the arrows', () => {
    const { engine } = mount('collapse');
    const steps = engine.getSteps();
    const last = steps[steps.length - 1].state;
    const onlyFlats = last.edges.every((e) => e.from.startsWith('H') && e.to.startsWith('H'));
    expect(onlyFlats).toBe(true);
    expect(ringOf(COLLAPSE_NODES, last.edges).length).toBeGreaterThan(0);
    engine.destroy();
  });

  it('the flat that never parked is in no ring', () => {
    const { engine } = mount('collapse');
    const last = engine.getSteps()[engine.getSteps().length - 1].state;
    expect(ringOf(COLLAPSE_NODES, last.edges)).not.toContain('H4');
    engine.destroy();
  });
});

describe('Lesson 21 · unit 87 is a cost the learner can move', () => {
  it('cadence cost comes from evaluateDetectionCadence with the deck\'s O(m x n^2)', () => {
    const c = cadenceOf(30, 4);
    expect(c.opsPerSweep).toBe(SWEEP_TOTALS.length * FLAT_NAMES.length * FLAT_NAMES.length);
    expect(c).toEqual(
      evaluateDetectionCadence(30, SWEEP_TOTALS.length, SWEEP_ALLOCATION.length, 4)
    );
  });

  it('the two costs move in opposite directions — that is the trade', () => {
    const tight = cadenceOf(CADENCE_SAMPLES[0], 4);
    const loose = cadenceOf(CADENCE_SAMPLES[1], 4);
    expect(tight.detectionOpsPerHour).toBeGreaterThan(loose.detectionOpsPerHour);
    expect(tight.blockedProcessMinutes).toBeLessThan(loose.blockedProcessMinutes);
  });

  it('the cadence beats quote the computed numbers, never typed ones', () => {
    const stuck = sweepOf(SWEEP_REQUEST_T1).deadlocked.length;
    const tight = cadenceOf(CADENCE_SAMPLES[0], stuck);
    const loose = cadenceOf(CADENCE_SAMPLES[1], stuck);
    const captions = scenarioInput('cadence').events.map((e) => e.caption).join(' ');
    // Both sides of the trade appear as computed figures, not prose.
    expect(captions).toContain(String(tight.detectionOpsPerHour));
    expect(captions).toContain(String(loose.blockedProcessMinutes));
    expect(captions).toContain(String(loose.meanUndetectedMinutes));
  });
});

describe('Lesson 21 · both fates are reachable through the playground', () => {
  it('the same driveway clears at T0 and deadlocks at T1', () => {
    const { engine } = mount('sweep-t0');
    const hooks = engine.debugHooks();
    (hooks.setScenario as (id: Lesson21Scenario) => void)('sweep-t0');
    expect((hooks.getDeadlocked as () => string[])()).toEqual([]);
    (hooks.setScenario as (id: Lesson21Scenario) => void)('sweep-t1');
    expect((hooks.getDeadlocked as () => string[])()).toEqual(['P1', 'P2', 'P3', 'P4']);
    engine.destroy();
  });

  it('every scenario rebuilds a complete, non-empty timeline', () => {
    for (const id of ['collapse', 'sweep-t0', 'sweep-t1', 'cadence'] as Lesson21Scenario[]) {
      const { engine } = mount(id);
      (engine.debugHooks().setScenario as (s: Lesson21Scenario) => void)(id);
      expect(engine.getSteps().length).toBeGreaterThan(5);
      engine.destroy();
    }
  });
});

describe('Lesson 21 · the morph is geometric, not cosmetic (§3C.2c)', () => {
  const widthsAt = (view: number, scenario: Lesson21Scenario): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson21GraphEngine(host, scenarioInput(scenario));
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

  it('analogy layout is native: every flat and spot takes the same width', () => {
    const w = widthsAt(0, 'collapse');
    const vals = Object.values(w);
    expect(vals.length).toBe(COLLAPSE_NODES.length);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
  });

  it('mechanism layout encodes holdings: the crate pool outgrows a single flat', () => {
    const w = widthsAt(1, 'sweep-t0');
    const pools = SWEEP_NODES.filter((n) => n.kind === 'resource').map((n) => w[`bar-${n.id}`]);
    const flats = SWEEP_NODES.filter((n) => n.kind === 'process').map((n) => w[`bar-${n.id}`]);
    expect(Math.max(...pools)).toBeGreaterThan(Math.min(...flats));
    // Different entities differ — a uniform resize is a reskin.
    expect(new Set([...pools, ...flats].map((v) => Math.round(v))).size).toBeGreaterThan(1);
  });

  it('geometry interpolates — every entity moves monotonically between views', () => {
    const a = widthsAt(0, 'sweep-t0');
    const mid = widthsAt(0.5, 'sweep-t0');
    const b = widthsAt(1, 'sweep-t0');
    for (const id of Object.keys(a)) {
      expect(mid[id]).toBeGreaterThan(Math.min(a[id], b[id]) - 0.5);
      expect(mid[id]).toBeLessThan(Math.max(a[id], b[id]) + 0.5);
    }
  });

  it('the same element set exists at both extremes', () => {
    expect(Object.keys(widthsAt(0, 'collapse')).sort()).toEqual(
      Object.keys(widthsAt(1, 'collapse')).sort()
    );
  });
});

describe('Lesson 21 · copy agrees with the mechanism', () => {
  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson21.analogy.text,
      lesson21.concept,
      lesson21.morphReveals,
      ...(lesson21.analogyMapping ?? []),
      ...scenarioInput('collapse').events.map((e) => e.caption),
      ...scenarioInput('sweep-t1').events.map((e) => e.caption)
    ].join(' ');
    expect(copy).not.toMatch(/§\s*\d|Atlas unit|isomorph|morphMode|SPEC\.md|ABSORBS/i);
  });

  it('every caption fits the 120-char rail', () => {
    for (const id of ['collapse', 'sweep-t0', 'sweep-t1', 'cadence'] as Lesson21Scenario[]) {
      for (const ev of scenarioInput(id).events) {
        expect(ev.caption.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it('declares the graph engine it really extends, and absorbs units 84–87', () => {
    expect(lesson21.engine).toBe('graph');
    expect(lesson21.absorbsUnits).toEqual([84, 85, 86, 87]);
    expect(lesson21.morphMode).toBe('morph');
  });

  it('the analogy names no outcome the playground can falsify', () => {
    expect(lesson21.analogy.text).not.toMatch(/\b\d+\s*(flat-minutes|deadlocked)\b/);
    expect(lesson21.concept.toLowerCase()).toContain('cycle is not enough');
  });
});
