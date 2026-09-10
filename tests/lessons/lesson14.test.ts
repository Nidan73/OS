import { describe, it, expect } from 'vitest';
import { evaluateLockCost } from '../../src/algorithms/synchronization.js';
import { CounterEngine } from '../../src/engines/counter.js';
import {
  DEFAULT_LOCK,
  LOCK_RANGES,
  LockCounterEngine,
  lesson14,
  lesson14Input,
  lockCosts,
  lockLessonInput,
  lockSteps
} from '../../src/lessons/lecture-09/lesson-14.js';

describe('Lesson 14 · every displayed number is computed', () => {
  it('the cost model IS evaluateLockCost, never re-derived', () => {
    const cases = [
      { ...DEFAULT_LOCK },
      { csDurationUs: 1, contextSwitchCostUs: 40, cpuFreqGHz: 1, mode: 'spin' as const },
      { csDurationUs: 40, contextSwitchCostUs: 1, cpuFreqGHz: 5, mode: 'block' as const }
    ];
    for (const p of cases) {
      expect(lockCosts(p)).toStrictEqual(
        evaluateLockCost(p.csDurationUs, p.contextSwitchCostUs, p.cpuFreqGHz)
      );
    }
  });

  it('mapped steps carry the model 1:1, stay, prices, verdict', () => {
    const steps = lockSteps(DEFAULT_LOCK);
    const m = evaluateLockCost(
      DEFAULT_LOCK.csDurationUs, DEFAULT_LOCK.contextSwitchCostUs, DEFAULT_LOCK.cpuFreqGHz
    );
    expect(steps.length).toBe(12);
    expect(steps[2].caption).toContain(`${m.csDurationUs}µs`);
    // one step per arrival: T2 queues alone before T3 joins, then settles
    expect(steps[3].state.waiting).toStrictEqual(['T2']);
    expect(steps[4].state.waiting).toStrictEqual(['T2', 'T3']);
    const verdict = steps[9].caption;
    expect(verdict).toContain(`${m.spinWastedCycles}`);
    expect(verdict).toContain(`${m.contextSwitchWastedCycles}`);
    for (const s of steps) expect(s.caption.length).toBeLessThanOrEqual(320);
  });

  it('sliders reach both sides of the crossover', () => {
    const lo = lockCosts({ ...DEFAULT_LOCK, csDurationUs: LOCK_RANGES.csDurationUs.min });
    const hi = lockCosts({ ...DEFAULT_LOCK, csDurationUs: LOCK_RANGES.csDurationUs.max });
    expect(lo.preferSpinlock).toBe(true);
    expect(hi.preferSpinlock).toBe(false);
    expect(lo.crossoverThresholdUs).toBe(DEFAULT_LOCK.contextSwitchCostUs);
    expect(hi.crossoverThresholdUs).toBe(DEFAULT_LOCK.contextSwitchCostUs);
    // the switch cost itself is a slider: moving it moves the crossover
    const moved = lockCosts({ ...DEFAULT_LOCK, contextSwitchCostUs: 30 });
    expect(moved.crossoverThresholdUs).toBe(30);
    expect(moved.preferSpinlock).toBe(true);
  });

  it('the switch cost and clock are inputs, never invisible defaults', () => {
    const a = lockCosts({ ...DEFAULT_LOCK, cpuFreqGHz: 1 });
    const b = lockCosts({ ...DEFAULT_LOCK, cpuFreqGHz: 5 });
    expect(a.spinWastedCycles).not.toBe(b.spinWastedCycles);
    expect(a.contextSwitchWastedCycles).not.toBe(b.contextSwitchWastedCycles);
  });
});

describe('Lesson 14 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy tokens are native: family at the door, equal footprints', () => {
    const input = lockLessonInput(DEFAULT_LOCK);
    expect(input.actors.map((a) => a.analogyName)).toEqual(['Ammu', 'Arijit', 'Abbu']);
    expect(input.analogy?.waitingLabel).toContain('DOOR');
  });

  it('mechanism encodes the price: the stay moves the verdict, the queue does not', () => {
    const short = lockSteps({ ...DEFAULT_LOCK, csDurationUs: 2 });
    const long = lockSteps({ ...DEFAULT_LOCK, csDurationUs: 30 });
    expect(short[9].state.holders).toStrictEqual(long[9].state.holders);
    expect(short[9].caption).not.toBe(long[9].caption);
    expect(short[9].caption).toMatch(/Short stay/);
    expect(long[9].caption).toMatch(/Long stay/);
  });

  it('handoff, not hang-back: the bathroom goes to the first waiter', () => {
    const steps = lockSteps(DEFAULT_LOCK);
    const last = steps[steps.length - 1];
    expect(last.state.holders).toStrictEqual(['T2']);
    expect(last.state.waiting).toStrictEqual(['T3']);
  });

  it('spin and block price the same stay differently', () => {
    const spin = lockSteps({ ...DEFAULT_LOCK, mode: 'spin' });
    const block = lockSteps({ ...DEFAULT_LOCK, mode: 'block' });
    expect(spin[6].caption).not.toBe(block[6].caption);
    expect(spin[6].caption).toMatch(/jiggle/i);
    expect(block[6].caption).toMatch(/sit/i);
  });
});

describe('Lesson 14 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number the playground can change', () => {
    const strip = (s: string): string => s.replace(/slides?\s*\d[\d–-]*/gi, '');
    const digits = (s: string): string[] => [...strip(s).matchAll(/\d+/g)].map((m) => m[0]);
    expect(digits(lesson14.analogy.text)).toEqual([]);
    expect(digits(lesson14.concept)).toEqual([]);
    expect(digits(lesson14.morphReveals)).toEqual([]);
  });

  it('the analogy conditions the verdict on the stay, never asserts one winner', () => {
    expect(lesson14.analogy.text).toMatch(/depends|however long|how long/i);
    expect(lesson14.concept).toMatch(/crossover|wakeup price/i);
  });

  it('the provenance is stated: the deck never gives the constants', () => {
    expect(lesson14.concept + lesson14.morphReveals).not.toMatch(/10\s*µs|3\.0\s*GHz/);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson14.analogy.text,
      lesson14.concept,
      lesson14.morphReveals,
      ...(lesson14.analogyMapping ?? []),
      ...lockSteps(DEFAULT_LOCK).map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 14 · lesson wiring', () => {
  it('declares the counter engine it really extends, and absorbs units 56–57', () => {
    expect(lesson14.engine).toBe('counter');
    expect(lesson14.engineClass).toBeDefined();
    expect(lesson14.engineClass?.prototype instanceof CounterEngine).toBe(true);
    expect(lesson14.absorbsUnits).toEqual([56, 57]);
    expect(lesson14.id).toBe(14);
    expect(lesson14.slug).toBe('lesson-14');
  });

  it('opens on a short stay where spinning wins, one drag from flipping', () => {
    expect(lesson14Input.params).toStrictEqual(DEFAULT_LOCK);
    expect(lockCosts(lesson14Input.params).preferSpinlock).toBe(true);
    expect(lesson14.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 14 · geometry on actual coordinates (§3C.2c)', () => {
  const widthsAt = (view: number, step: number): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new LockCounterEngine(host, lockLessonInput(DEFAULT_LOCK));
    engine.init(view);
    engine.seek(step);
    engine.setView(view);
    const out: Record<string, number> = {};
    for (const id of ['T1', 'T2', 'T3']) {
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
    const engine = new LockCounterEngine(host, lockLessonInput(DEFAULT_LOCK));
    engine.init(0);
    const steps = engine.getSteps().map((s) => ({ ...s, state: { ...s.state } }));
    engine.destroy();
    host.remove();
    return steps;
  };
  const occupiedStep = (): number =>
    mountSteps().findIndex((s) => s.state.holders.length > 0 && s.state.waiting.length > 0);

  it('analogy layout is native, not the mechanism restyled', () => {
    const w = widthsAt(0, occupiedStep());
    expect(Math.max(w.T1, w.T2, w.T3) - Math.min(w.T1, w.T2, w.T3)).toBeLessThan(1);
    expect(w.T1).toBeCloseTo(54, 5);
  });

  it('mechanism layout encodes occupancy: holder fills wide, waiter compresses', () => {
    const step = occupiedStep();
    expect(step).toBeGreaterThanOrEqual(0);
    const w = widthsAt(1, step);
    const states = mountSteps()[step].state;
    const holder = states.holders[0];
    const waiter = states.waiting[0];
    expect(w[holder]).toBeCloseTo(96, 5);
    expect(w[waiter]).toBeCloseTo(60, 5);
    expect(w[holder] / w[waiter]).toBeCloseTo(96 / 60, 5);
  });

  it('geometry interpolates, the morph is real', () => {
    const step = occupiedStep();
    for (const id of ['T1', 'T2', 'T3']) {
      const a = widthsAt(0, step)[id];
      const mid = widthsAt(0.5, step)[id];
      const b = widthsAt(1, step)[id];
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
