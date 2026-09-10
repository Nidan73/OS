import { describe, it, expect } from 'vitest';
import { simulateSemaphoreOps } from '../../src/algorithms/synchronization.js';
import { CounterEngine } from '../../src/engines/counter.js';
import {
  DEFAULT_SEM,
  SEM_RANGES,
  SemaphoreCounterEngine,
  lesson15,
  lesson15Input,
  semaphoreLessonInput,
  semaphoreOps,
  semaphoreRun,
  semaphoreSteps
} from '../../src/lessons/lecture-09/lesson-15.js';

describe('Lesson 15 · every displayed outcome is computed', () => {
  it('the run IS simulateSemaphoreOps over the staged script', () => {
    const scripts = [
      { ...DEFAULT_SEM },
      { ...DEFAULT_SEM, initial: 1 },
      { ...DEFAULT_SEM, mistake: 'swap' as const },
      { ...DEFAULT_SEM, mistake: 'double' as const },
      { ...DEFAULT_SEM, mistake: 'omit' as const }
    ];
    for (const p of scripts) {
      expect(semaphoreRun(p)).toStrictEqual(simulateSemaphoreOps(p.initial, semaphoreOps(p)));
    }
  });

  it('the sign change carries meaning: negative count equals seated waiters', () => {
    const run = semaphoreRun(DEFAULT_SEM);
    for (const s of run.steps) {
      if (s.value < 0) {
        expect(Math.abs(s.value)).toBe(s.waitingQueue.length);
      }
    }
    const last = run.steps[run.steps.length - 1];
    // one release wakes one waiter; one traveller is still seated, so the
    // count stays negative — the sign keeps meaning "waiters here"
    expect(last.value).toBeLessThan(0);
    expect(last.waitingQueue.length).toBeGreaterThan(0);
  });

  it('mapped steps carry the simulation 1:1 — count, holders, seated queue', () => {
    const run = semaphoreRun(DEFAULT_SEM);
    const steps = semaphoreSteps(DEFAULT_SEM);
    // one step per op plus the computed room verdict at the end
    expect(steps.length).toBe(run.steps.length + 2);
    run.steps.forEach((s, i) => {
      const st = steps[i + 1].state;
      expect(st.value).toBe(s.value);
      expect(st.holders).toStrictEqual(s.holders);
      expect(st.waiting).toStrictEqual(s.waitingQueue);
      expect(steps[i + 1].caption.length).toBeLessThanOrEqual(120);
    });
    const verdict = steps[steps.length - 1];
    const last = run.steps[run.steps.length - 1];
    expect(verdict.state.value).toBe(run.finalValue);
    expect(verdict.state.holders).toStrictEqual(last.holders);
    expect(verdict.state.waiting).toStrictEqual(last.waitingQueue);
    expect(verdict.caption.length).toBeLessThanOrEqual(120);
  });

  it('the intact run wakes in order; the dock slider reaches the binary lock', () => {
    const run = semaphoreRun(DEFAULT_SEM);
    expect(run.deadlocked).toBe(false);
    const binary = semaphoreRun({ ...DEFAULT_SEM, initial: SEM_RANGES.initial.min });
    expect(binary.steps[0].holders).toStrictEqual(['T1']);
    const five = semaphoreRun({ ...DEFAULT_SEM, initial: SEM_RANGES.initial.max });
    // five ports absorb five takes before anyone seats themselves
    expect(five.steps[4].waitingQueue).toStrictEqual([]);
    expect(five.steps[5].waitingQueue.length).toBeGreaterThan(0);
  });

  it('each of slide 22\'s three failures is its own reachable, computed state', () => {
    const swap = semaphoreRun({ ...DEFAULT_SEM, mistake: 'swap' });
    const double = semaphoreRun({ ...DEFAULT_SEM, mistake: 'double' });
    const omit = semaphoreRun({ ...DEFAULT_SEM, mistake: 'omit' });
    const intact = semaphoreRun(DEFAULT_SEM);
    // all three differ from the intact run — none is a canned animation.
    // (swap lands on the same final number by a different road: one phantom
    // release, one extra take — so compare traces, not just finals)
    expect(swap.steps.map((s) => s.action)).not.toStrictEqual(intact.steps.map((s) => s.action));
    expect(swap.steps[0].value).toBe(DEFAULT_SEM.initial + 1);
    expect(omit.deadlocked).toBe(true);
    expect(intact.deadlocked).toBe(false);
    // double holds two ports on one traveller — the room disagrees with the
    // board even where the final numbers coincide
    expect(double.steps.some((s) => s.holders.filter((h) => h === 'T1').length > 1)).toBe(true);
  });
});

describe('Lesson 15 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy tokens are native: family at the lot, equal footprints', () => {
    const input = semaphoreLessonInput(DEFAULT_SEM);
    expect(input.actors.length).toBe(7);
    expect(input.actors[0].analogyName).toBe('Father');
    expect(input.analogy?.resourceLabel).toContain('BOARD');
  });

  it('mechanism encodes the count: the lot size moves the waiting point', () => {
    const five = semaphoreSteps({ ...DEFAULT_SEM, initial: 5 });
    const one = semaphoreSteps({ ...DEFAULT_SEM, initial: 1 });
    const firstSeated = (steps: ReturnType<typeof semaphoreSteps>): number =>
      steps.findIndex((s) => s.state.waiting.length > 0);
    expect(firstSeated(five)).toBeGreaterThan(firstSeated(one));
  });

  it('spin and block label the queue differently for the same simulation', () => {
    const spin = semaphoreLessonInput({ ...DEFAULT_SEM, mode: 'spin' });
    const block = semaphoreLessonInput({ ...DEFAULT_SEM, mode: 'block' });
    expect(spin.analogy?.waitingLabel).toMatch(/HOVER/);
    expect(block.analogy?.waitingLabel).toMatch(/BENCH/);
    expect(semaphoreRun(spin.params).finalValue).toBe(semaphoreRun(block.params).finalValue);
  });
});

describe('Lesson 15 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number the playground can change', () => {
    const strip = (s: string): string => s.replace(/slides?\s*\d[\d–-]*/gi, '');
    const digits = (s: string): string[] => [...strip(s).matchAll(/\d+/g)].map((m) => m[0]);
    // the analogy names no count at all — the lot slider owns the number
    expect(digits(lesson15.analogy.text)).toEqual([]);
    // concept/morph name only the slider endpoints (five/one) and the slide
    // number — never a live outcome
    for (const copy of [lesson15.concept, lesson15.morphReveals]) {
      for (const d of digits(copy)) {
        expect(['5', '22', '1'].includes(d)).toBe(true);
      }
    }
  });

  it('the negative-count claim is conditional on overflow — true in every state', () => {
    expect(lesson15.analogy.text).toMatch(/When every spot is taken|past zero/i);
    expect(lesson15.concept).toMatch(/negative|waiting|bench|token/i);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson15.analogy.text,
      lesson15.concept,
      lesson15.morphReveals,
      ...(lesson15.analogyMapping ?? []),
      ...semaphoreSteps(DEFAULT_SEM).map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 15 · lesson wiring', () => {
  it('declares the counter engine it really extends, and absorbs units 58–62', () => {
    expect(lesson15.engine).toBe('counter');
    expect(lesson15.engineClass).toBeDefined();
    expect(lesson15.engineClass?.prototype instanceof CounterEngine).toBe(true);
    expect(lesson15.absorbsUnits).toEqual([58, 59, 60, 61, 62]);
    expect(lesson15.id).toBe(15);
    expect(lesson15.slug).toBe('lesson-15');
  });

  it('opens on five spots with seven contenders — overflow is one run away', () => {
    expect(lesson15Input.params).toStrictEqual(DEFAULT_SEM);
    expect(DEFAULT_SEM.initial).toBe(5);
    const run = semaphoreRun(lesson15Input.params);
    expect(run.steps.some((s) => s.value < 0)).toBe(true);
    expect(lesson15.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 15 · geometry on actual coordinates (§3C.2c)', () => {
  const IDS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const widthsAt = (view: number, step: number): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new SemaphoreCounterEngine(host, semaphoreLessonInput(DEFAULT_SEM));
    engine.init(view);
    engine.seek(step);
    engine.setView(view);
    const out: Record<string, number> = {};
    for (const id of IDS) {
      const rect = host.querySelector(`#bar-${id} rect`);
      out[id] = parseFloat(rect?.getAttribute('width') ?? 'NaN');
    }
    engine.destroy();
    host.remove();
    return out;
  };

  const mountSteps = () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new SemaphoreCounterEngine(host, semaphoreLessonInput(DEFAULT_SEM));
    engine.init(0);
    const steps = engine.getSteps().map((s) => ({ ...s, state: { ...s.state } }));
    engine.destroy();
    host.remove();
    return steps;
  };
  // A step where the lot holds AND waits — wide holders against narrow waiting.
  const occupiedStep = (): number =>
    mountSteps().findIndex((s) => s.state.holders.length > 0 && s.state.waiting.length > 0);

  it('analogy layout is native, not the mechanism restyled', () => {
    const w = widthsAt(0, occupiedStep());
    const vals = IDS.map((id) => w[id]);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
    expect(w.T1).toBeCloseTo(54, 5);
  });

  it('mechanism layout encodes occupancy: parked wide, waiting compressed', () => {
    const step = occupiedStep();
    expect(step).toBeGreaterThanOrEqual(0);
    const states = mountSteps()[step].state;
    // Crowded lots shrink to fit, but the holder:waiter RATIO survives —
    // assert the ratio, not the absolute pixel constants.
    const w = widthsAt(1, step);
    const holder = states.holders[0];
    const waiter = states.waiting[0];
    expect(w[holder] / w[waiter]).toBeCloseTo(96 / 60, 1);
    expect(w[holder]).toBeGreaterThan(w[waiter]);
  });

  it('geometry interpolates — the morph is real', () => {
    const step = occupiedStep();
    for (const id of IDS) {
      const a = widthsAt(0, step)[id];
      const mid = widthsAt(0.5, step)[id];
      const b = widthsAt(1, step)[id];
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
