import { describe, it, expect } from 'vitest';
import {
  simulateAtomicSteps,
  simulateAtomicIncrement,
  simulateCompareAndSwap,
  simulateTestAndSetLock,
  type AtomicMechanism
} from '../../src/algorithms/synchronization.js';
import { CounterEngine } from '../../src/engines/counter.js';
import {
  AtomicCounterEngine,
  DEFAULT_ATOMIC,
  atomicIncrement,
  atomicLessonInput,
  atomicSteps,
  atomicTrace,
  lesson13,
  lesson13Input
} from '../../src/lessons/lecture-09/lesson-13.js';

const COMBOS: Array<{ mechanism: AtomicMechanism; atomic: boolean }> = [
  { mechanism: 'tas', atomic: false },
  { mechanism: 'tas', atomic: true },
  { mechanism: 'cas', atomic: false },
  { mechanism: 'cas', atomic: true }
];

describe('Lesson 13 · every displayed outcome is computed', () => {
  it('the trace IS simulateAtomicSteps, with the deck lock values', () => {
    for (const c of COMBOS) {
      const expected = simulateAtomicSteps(c.mechanism, c.atomic);
      const got = atomicTrace(c);
      expect(got).toStrictEqual(expected);
      expect(got.mechanism).toBe(c.mechanism);
      expect(got.atomic).toBe(c.atomic);
      // deck slides 8/10: the lock is 0 free, 1 held — never anything else
      for (const s of got.steps) expect([0, 1]).toContain(s.lock);
    }
  });

  it('split modes corrupt, fused modes hold — both primitives', () => {
    expect(simulateAtomicSteps('tas', false).bothEnteredCS).toBe(true);
    expect(simulateAtomicSteps('tas', true).bothEnteredCS).toBe(false);
    expect(simulateAtomicSteps('cas', false).bothEnteredCS).toBe(true);
    expect(simulateAtomicSteps('cas', true).bothEnteredCS).toBe(false);
    // and the short verdict twins agree
    expect(simulateTestAndSetLock(false).bothEnteredCS).toBe(true);
    expect(simulateTestAndSetLock(true).bothEnteredCS).toBe(false);
    expect(simulateCompareAndSwap(false).bothEnteredCS).toBe(true);
    expect(simulateCompareAndSwap(true).bothEnteredCS).toBe(false);
  });

  it('CAS refuses on a stale expectation — the slide-9 rule, executed', () => {
    const r = simulateCompareAndSwap(true);
    expect(r.thread1Acquired).toBe(true);
    expect(r.thread2Acquired).toBe(false);
    expect(r.lockValue).toBe(1);
  });

  it('the tally: plain loses one update, CAS retries once and loses none', () => {
    const r = simulateAtomicIncrement();
    expect(r).toStrictEqual(atomicIncrement());
    expect(r.start).toBe(0);
    expect(r.expected).toBe(2);
    expect(r.finalPlain).toBe(1);
    expect(r.lostPlain).toBe(1);
    expect(r.finalCAS).toBe(2);
    expect(r.retriesCAS).toBe(1);
  });

  it('mapped steps carry the trace 1:1 — lock, holders, waiting, captions', () => {
    for (const c of COMBOS) {
      const trace = simulateAtomicSteps(c.mechanism, c.atomic);
      const steps = atomicSteps(c);
      // one step per trace act, then the five computed tally beats (unit 55)
      expect(steps.length).toBe(trace.steps.length + 5);
      trace.steps.forEach((s, i) => {
        const st = steps[i].state;
        expect(st.value).toBe(s.lock === 0 ? 1 : 0);
        expect(st.holders).toStrictEqual(s.entered);
        expect(st.waiting).toStrictEqual(s.waiting);
        expect(steps[i].caption).toBe(s.caption.slice(0, 120));
        expect(steps[i].caption.length).toBeLessThanOrEqual(120);
        expect(steps[i].t).toBe(i);
      });
      for (const tail of steps.slice(trace.steps.length)) {
        expect(tail.caption.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it('the tally beats carry simulateAtomicIncrement 1:1 — plain loses, CAS keeps', () => {
    const inc = simulateAtomicIncrement();
    for (const c of COMBOS) {
      const trace = simulateAtomicSteps(c.mechanism, c.atomic);
      const steps = atomicSteps(c);
      const tally = steps.slice(trace.steps.length);
      expect(tally.length).toBe(5);
      expect(tally[0].caption).toContain(`${inc.expected}`);
      expect(tally[2].caption).toContain(`${inc.finalPlain}`);
      expect(tally[4].caption).toContain(`${inc.finalCAS}`);
      expect(tally[4].state.holders.length).toBe(2);
    }
  });

  it('mapped holders disagree with the meter exactly when corruption does', () => {
    for (const c of COMBOS) {
      const steps = atomicSteps(c);
      const trace = simulateAtomicSteps(c.mechanism, c.atomic);
      const raceBeats = steps.slice(0, trace.steps.length);
      const corrupt = raceBeats.some((s) => s.state.holders.length > 1);
      expect(corrupt).toBe(trace.bothEnteredCS);
    }
  });
});

describe('Lesson 13 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy tokens are native: equal footprints, sized like bodies', () => {
    // CounterEngine renders analogy tokens at a fixed 54px — equal by construction.
    // The assertion that matters here: our lesson uses that path (analogy names
    // set, so view<0.5 shows people, not threads).
    const input = atomicLessonInput(DEFAULT_ATOMIC);
    expect(input.actors.map((a) => a.analogyName)).toEqual(['Friend A', 'Friend B']);
    expect(input.analogy?.resourceLabel).toContain('HOOK');
  });

  it('mechanism encodes the quantity: holders change, width carries the window', () => {
    const brokenTrace = simulateAtomicSteps('tas', false);
    const fusedTrace = simulateAtomicSteps('tas', true);
    const broken = atomicSteps({ mechanism: 'tas', atomic: false }).slice(0, brokenTrace.steps.length);
    const fused = atomicSteps({ mechanism: 'tas', atomic: true }).slice(0, fusedTrace.steps.length);
    const brokenHolders = broken.map((s) => s.state.holders.length);
    const fusedHolders = fused.map((s) => s.state.holders.length);
    expect(Math.max(...brokenHolders)).toBe(2);
    expect(Math.max(...fusedHolders)).toBe(1);
    expect(brokenHolders).not.toStrictEqual(fusedHolders);
  });

  it('handover, not hang-back: the fused run ends holding, first waiter served', () => {
    for (const m of ['tas', 'cas'] as const) {
      const trace = simulateAtomicSteps(m, true);
      expect(trace.handoffOrder).toStrictEqual(['T1', 'T2']);
      expect(trace.steps[trace.steps.length - 1].handoffTo).toBe('T2');
    }
  });

  it('the same two threads run in every mode — only fused-vs-split changes', () => {
    for (const c of COMBOS) {
      const input = atomicLessonInput(c);
      expect(input.actors.map((a) => a.id)).toEqual(['T1', 'T2']);
    }
  });
});

describe('Lesson 13 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number the playground can change', () => {
    const strip = (s: string): string => s.replace(/test_and_set|compare_and_swap|slides?\s*\d[\d–-]*/gi, '');
    const digits = (s: string): string[] => [...strip(s).matchAll(/\d+/g)].map((m) => m[0]);
    expect(digits(lesson13.analogy.text)).toEqual([]);
    expect(digits(lesson13.concept)).toEqual([]);
    expect(digits(lesson13.morphReveals)).toEqual([]);
  });

  it('the analogy asserts the fused outcome only for the fused motion, never in general', () => {
    expect(lesson13.analogy.text).toMatch(/single motion|one.*motion|indivisible/i);
    expect(lesson13.analogy.text.toLowerCase()).not.toMatch(/never.*both|always.*one/);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson13.analogy.text,
      lesson13.concept,
      lesson13.morphReveals,
      ...(lesson13.analogyMapping ?? []),
      ...atomicSteps(DEFAULT_ATOMIC).map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 13 · CAS addition to the algorithm suite', () => {
  it('the CAS verdict twins the TAS verdict in both modes', () => {
    for (const atomic of [false, true]) {
      const tas = simulateTestAndSetLock(atomic);
      const cas = simulateCompareAndSwap(atomic);
      expect(cas.bothEnteredCS).toBe(tas.bothEnteredCS);
      expect(cas.lockValue).toBe(tas.lockValue);
    }
  });

  it('all four traces open free and close held-or-handed', () => {
    for (const c of COMBOS) {
      const trace = simulateAtomicSteps(c.mechanism, c.atomic);
      expect(trace.steps[0].lock).toBe(0);
      expect(trace.steps[0].entered).toEqual([]);
      const last = trace.steps[trace.steps.length - 1];
      expect([0, 1]).toContain(last.lock);
    }
  });
});

describe('Lesson 13 · lesson wiring', () => {
  it('declares the counter engine it really extends, and absorbs units 50–55', () => {
    expect(lesson13.engine).toBe('counter');
    expect(lesson13.engineClass).toBeDefined();
    expect(lesson13.engineClass?.prototype instanceof CounterEngine).toBe(true);
    expect(lesson13.absorbsUnits).toEqual([50, 51, 52, 53, 54, 55]);
    expect(lesson13.id).toBe(13);
    expect(lesson13.slug).toBe('lesson-13');
  });

  it('opens split — the corruption first, then the fix one toggle away', () => {
    expect(lesson13Input.params).toStrictEqual(DEFAULT_ATOMIC);
    expect(DEFAULT_ATOMIC.atomic).toBe(false);
    expect(atomicTrace(lesson13Input.params).bothEnteredCS).toBe(true);
    expect(lesson13.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 13 · geometry on actual coordinates (§3C.2c)', () => {
  const widthsAt = (view: number, step: number): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new AtomicCounterEngine(host, atomicLessonInput(DEFAULT_ATOMIC));
    engine.init(view);
    engine.seek(step);
    engine.setView(view);
    const out: Record<string, number> = {};
    for (const id of ['T1', 'T2']) {
      const rect = host.querySelector(`#bar-${id} rect`);
      out[id] = parseFloat(rect?.getAttribute('width') ?? 'NaN');
    }
    engine.destroy();
    host.remove();
    return out;
  };

  // The mounted engine runs DEFAULT_ATOMIC (tas-split). Find the first step
  // with a holder AND a waiter in the ENGINE's own steps — the picture's
  // occupancy, not a parallel computation's.
  const mountSteps = (): ReturnType<typeof atomicSteps> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new AtomicCounterEngine(host, atomicLessonInput(DEFAULT_ATOMIC));
    engine.init(0);
    const steps = engine.getSteps().map((s) => ({ ...s, state: { ...s.state } }));
    engine.destroy();
    host.remove();
    return steps as ReturnType<typeof atomicSteps>;
  };
  const occupiedStep = (): number =>
    mountSteps().findIndex((s) => s.state.holders.length > 0 && s.state.waiting.length > 0);

  it('analogy layout is native, not the mechanism restyled', () => {
    const w = widthsAt(0, occupiedStep());
    expect(Math.max(w.T1, w.T2) - Math.min(w.T1, w.T2)).toBeLessThan(1);
    expect(w.T1).toBeCloseTo(54, 5);
    expect(w.T2).toBeCloseTo(54, 5);
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

  it('geometry interpolates — the morph is real', () => {
    const step = occupiedStep();
    for (const id of ['T1', 'T2']) {
      const a = widthsAt(0, step)[id];
      const mid = widthsAt(0.5, step)[id];
      const b = widthsAt(1, step)[id];
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
