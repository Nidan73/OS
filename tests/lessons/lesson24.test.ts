import { describe, it, expect, beforeEach } from 'vitest';
import {
  lesson24,
  Lesson24TraceEngine,
  scenarioInput,
  runOf,
  guaranteeOf,
  programFor,
  threadsFor,
  analogyProgramFor,
  SCENARIOS,
  SCENARIO_LABELS,
  T1_PROGRAM,
  T2_PROGRAM,
  INTERRUPT_CORES,
  type Lesson24Scenario
} from '../../src/lessons/lecture-09/lesson-24.js';
import {
  simulateMemoryBarrier,
  evaluateInterruptMasking,
  simulateReorderingOutput
} from '../../src/algorithms/synchronization.js';

// Lecture 9 slides 3–5. The slides are text-only; the quoted requirements are
// slide 4 ("immediately visible to all other processors" / "may not be") and
// slide 5 ("add a memory barrier … to ensure Thread 1 outputs 100").

describe('L24 · deck fidelity — slides 3–5', () => {
  it('carries slide 5s two programs verbatim', () => {
    expect(T2_PROGRAM).toEqual(['x = 100', 'memory_barrier()', 'flag = true']);
    expect(T1_PROGRAM).toEqual(['while (!flag)', 'memory_barrier()', 'print x']);
  });

  it('drops the barrier lines when the scenario has no barrier', () => {
    expect(programFor('T2', false)).toEqual(['x = 100', 'flag = true']);
    expect(programFor('T1', false)).toEqual(['while (!flag)', 'print x']);
    expect(programFor('T2', true)).toEqual(T2_PROGRAM);
  });

  it('strongly ordered: a store is visible at once, so the output is always 100', () => {
    const r = simulateMemoryBarrier('strong', false);
    expect(r.printed).toBe(100);
    expect(r.correct).toBe(true);
    // slide 4's definition — nothing is ever in flight
    expect(r.events.every((e) => e.pending.length === 0)).toBe(true);
  });

  it('slide 5s fix does what slide 5 claims: Thread 1 outputs 100', () => {
    const r = simulateMemoryBarrier('weak', true);
    expect(r.printed).toBe(100);
    expect(r.correct).toBe(true);
  });

  it('unit 47, slide 3: masking interrupts leaves every other core running', () => {
    expect(evaluateInterruptMasking(1)).toEqual({ cores: 1, unprotectedCores: 0, safe: true });
    expect(evaluateInterruptMasking(2).safe).toBe(false);
    expect(evaluateInterruptMasking(8).unprotectedCores).toBe(7);
    // "not broadly scalable" — the exposure grows with every core added
    const exposure = INTERRUPT_CORES.map((c) => evaluateInterruptMasking(c).unprotectedCores);
    for (let i = 1; i < exposure.length; i++) expect(exposure[i]).toBeGreaterThan(exposure[i - 1]);
  });

  it('clamps nonsense core counts rather than returning negatives', () => {
    expect(evaluateInterruptMasking(0).cores).toBe(1);
    expect(evaluateInterruptMasking(-4).unprotectedCores).toBe(0);
    expect(evaluateInterruptMasking(2.7).cores).toBe(2);
  });
});

describe('L24 · the weak model, tested against every drain order', () => {
  const ORDERS: ('x' | 'flag')[][] = [
    ['x', 'flag'],
    ['flag', 'x']
  ];

  it('breaks on exactly the orderings where the flag arrives first', () => {
    const results = ORDERS.map((o) => ({ o: o.join('>'), printed: simulateMemoryBarrier('weak', false, o).printed }));
    expect(results).toEqual([
      { o: 'x>flag', printed: 100 },
      { o: 'flag>x', printed: 0 }
    ]);
  });

  it('is fixed on EVERY drain order once the barriers are in — not just the one we ship', () => {
    for (const o of ORDERS) {
      const r = simulateMemoryBarrier('weak', true, o);
      expect(r.printed, `barrier + drain ${o.join('>')}`).toBe(100);
      expect(r.correct).toBe(true);
    }
  });

  it('is fixed on every drain order under a strong model too, barrier or not', () => {
    for (const o of ORDERS) {
      for (const b of [false, true]) {
        expect(simulateMemoryBarrier('strong', b, o).printed).toBe(100);
      }
    }
  });

  it('never lets a store be read before it has drained', () => {
    const r = simulateMemoryBarrier('weak', false, ['flag', 'x']);
    for (const e of r.events) {
      // if x is still pending, the visible x cannot already be 100
      if (e.pending.some((p) => p.name === 'x')) expect(e.visible.x).toBe(0);
      if (e.pending.some((p) => p.name === 'flag')) expect(e.visible.flag).toBe(0);
    }
  });

  it('always drains everything eventually — the work was never lost, only late', () => {
    for (const o of ORDERS) {
      const r = simulateMemoryBarrier('weak', false, o);
      expect(r.events[r.events.length - 1].pending).toHaveLength(0);
      expect(r.events[r.events.length - 1].visible).toEqual({ x: 100, flag: 1 });
    }
  });

  it('terminates instead of spinning forever', () => {
    for (const model of ['strong', 'weak'] as const) {
      for (const b of [false, true]) {
        for (const o of ORDERS) {
          const r = simulateMemoryBarrier(model, b, o);
          expect(r.events.length).toBeLessThan(32);
          expect(r.printed).not.toBeNull();
        }
      }
    }
  });

  it('is deterministic and does not mutate its arguments', () => {
    const order: ('x' | 'flag')[] = ['flag', 'x'];
    const a = simulateMemoryBarrier('weak', false, order);
    expect(order).toEqual(['flag', 'x']);
    const b = simulateMemoryBarrier('weak', false, order);
    expect(a).toEqual(b);
  });

  it('runs both threads concurrently — T1 is already spinning before T2 acts', () => {
    const r = simulateMemoryBarrier('weak', false, ['flag', 'x']);
    expect(r.events[0].actor).toBe('T1');
    expect(r.events[0].kind).toBe('spin');
  });
});

describe('L24 · pairs with L12 without repeating it', () => {
  it('reaches L12s printed 0 from the buffer, not from a scripted branch', () => {
    const l12 = simulateReorderingOutput(true);
    const l24 = simulateMemoryBarrier('weak', false, ['flag', 'x']);
    expect(l12.output).toBe(0);
    expect(l24.printed).toBe(0);
    // L12 has no notion of a store being in flight; L24's is what explains it
    expect(l24.events.some((e) => e.pending.length > 0)).toBe(true);
  });

  it('offers the fix L12 cannot reach — same model, barriers on', () => {
    expect(simulateMemoryBarrier('weak', true).printed).toBe(100);
    // and L12's intact run agrees on the good case
    expect(simulateReorderingOutput(false).output).toBe(100);
  });
});

describe('L24 · scenarios', () => {
  it('gives the four outcomes the lesson claims', () => {
    expect(runOf('strong').printed).toBe(100);
    expect(runOf('lucky').printed).toBe(100);
    expect(runOf('broken').printed).toBe(0);
    expect(runOf('barrier').printed).toBe(100);
  });

  it('refuses to call the lucky run a guarantee', () => {
    expect(guaranteeOf('lucky')).toMatch(/^no/);
    expect(guaranteeOf('broken')).toMatch(/^no/);
    expect(guaranteeOf('strong')).toMatch(/^yes/);
    expect(guaranteeOf('barrier')).toMatch(/^yes/);
    // lucky and broken are the SAME configuration — only the drain order differs
    expect(SCENARIOS.lucky.model).toBe(SCENARIOS.broken.model);
    expect(SCENARIOS.lucky.barriers).toBe(SCENARIOS.broken.barriers);
    expect(guaranteeOf('lucky')).toBe(guaranteeOf('broken'));
  });

  it('keeps the analogy wording index-matched to the code, in every scenario', () => {
    for (const id of Object.keys(SCENARIOS) as Lesson24Scenario[]) {
      for (const t of threadsFor(id)) {
        expect(t.analogyInstructions, `${id}/${t.id}`).toHaveLength(t.instructions.length);
        // and the analogy side must not leak code back in
        for (const line of t.analogyInstructions!) {
          expect(line).not.toMatch(/memory_barrier|while \(|print x|flag =|x = 100/);
        }
      }
    }
    // the barrier line is the one that drops, at the same index on both sides
    expect(analogyProgramFor('T2', true)).toHaveLength(3);
    expect(analogyProgramFor('T2', false)).toHaveLength(2);
    expect(analogyProgramFor('T2', false)[1]).toBe(analogyProgramFor('T2', true)[2]);
  });

  it('shows the barrier lines only in the barrier scenario', () => {
    expect(threadsFor('barrier')[1].instructions).toContain('memory_barrier()');
    expect(threadsFor('broken')[1].instructions).not.toContain('memory_barrier()');
  });

  it('labels every scenario', () => {
    expect(Object.keys(SCENARIO_LABELS).sort()).toEqual(Object.keys(SCENARIOS).sort());
  });
});

describe('L24 · engine', () => {
  let engine: Lesson24TraceEngine;

  beforeEach(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    engine = new Lesson24TraceEngine(host, scenarioInput('broken'));
    engine.init();
  });

  it('declares the engine it actually inherits', () => {
    expect(lesson24.engine).toBe('trace');
    expect(engine).toBeInstanceOf(Lesson24TraceEngine);
  });

  it('builds one beat per mechanism event, plus the opening and closing frames', () => {
    for (const id of Object.keys(SCENARIOS) as Lesson24Scenario[]) {
      const e = new Lesson24TraceEngine(document.createElement('div'), scenarioInput(id));
      e.init();
      e.applyScenario(id);
      const expected = runOf(id).events.length + 2;
      expect(e.getSteps().length, `${id}`).toBe(expected);
    }
  });

  it('never shows a pending store as readable in any step of any scenario', () => {
    for (const id of Object.keys(SCENARIOS) as Lesson24Scenario[]) {
      const e = new Lesson24TraceEngine(document.createElement('div'), scenarioInput(id));
      e.init();
      e.applyScenario(id);
      for (const s of e.getSteps()) {
        const st = s.state as unknown as { pending: { name: string }[]; memory: Record<string, number> };
        if (st.pending.some((p) => p.name === 'x')) expect(st.memory.x).toBe(0);
      }
    }
  });

  it('keeps the step timeline monotonic', () => {
    const ts = engine.getSteps().map((s) => s.t);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });

  it('switches scenario and rebuilds from the algorithm', () => {
    engine.applyScenario('barrier');
    expect(engine.getScenario()).toBe('barrier');
    const hooks = engine.debugHooks() as Record<string, () => unknown>;
    expect((hooks.getRun() as { printed: number }).printed).toBe(100);
    engine.applyScenario('broken');
    expect((engine.debugHooks().getRun as () => { printed: number })().printed).toBe(0);
  });

  it('ignores an unknown or repeated scenario', () => {
    engine.applyScenario('broken');
    engine.applyScenario('nope' as Lesson24Scenario);
    expect(engine.getScenario()).toBe('broken');
  });

  it('emits the same element ids in both views (isomorphism, §3C.2)', () => {
    const ids = (host: Element) =>
      [...host.querySelectorAll('[id^="bar-"]')].map((e) => e.id).sort();
    engine.setView(0);
    const a = ids(engine['container'] as HTMLElement);
    engine.setView(1);
    const b = ids(engine['container'] as HTMLElement);
    expect(a).toEqual(['bar-T1', 'bar-T2']);
    expect(b).toEqual(a);
  });

  it('moves a pending write a long way between views — the carrying property', () => {
    // The previous version of this test measured the gap between the two
    // columns and asserted it moved by >= 1px. Measured, that gap moves 20 ->
    // 16, so the test passed on four pixels of drift and proved nothing. It
    // now measures the thing the lesson actually claims and demands real
    // travel, so incidental layout jitter cannot satisfy it.
    engine.applyScenario('broken');
    const steps = engine.getSteps();
    const twoPending = steps.findIndex(
      (st) => (st.state as unknown as { pending: unknown[] }).pending.length === 2
    );
    expect(twoPending, 'a step with two writes in flight').toBeGreaterThan(-1);
    engine.seek(twoPending);

    const at = (v: number) => {
      engine.setView(v);
      const c = engine['container'] as HTMLElement;
      return (['x', 'flag'] as const).map((n) => {
        const el = c.querySelector(`#inflight-${n}`) as SVGRectElement;
        return { x: parseFloat(el.getAttribute('x')!), y: parseFloat(el.getAttribute('y')!) };
      });
    };
    const a = at(0);
    const b = at(1);

    // in the hallway the two sit apart along the corridor; in the buffer they
    // share one x and are separated only by order
    expect(Math.abs(a[1].x - a[0].x)).toBeGreaterThan(80);
    expect(Math.abs(b[1].x - b[0].x)).toBeLessThan(1);
    expect(Math.abs(b[1].y - b[0].y)).toBeGreaterThan(8);
    // and each token itself travels a real distance
    for (let i = 0; i < 2; i++) {
      expect(Math.abs(b[i].x - a[i].x), `token ${i} travel`).toBeGreaterThan(60);
    }
  });

  it('keeps every in-flight label inside its own box at both views', () => {
    // The gate cannot catch this: its SVG overflow check compares text against
    // el.closest('g'), and a <g> has no intrinsic size — it is the union of
    // its children, so text can never overflow its own group. Measured here
    // against the rect the text is drawn inside.
    engine.applyScenario('broken');
    const steps = engine.getSteps();
    const c = engine['container'] as HTMLElement;
    for (let i = 0; i < steps.length; i++) {
      engine.seek(i);
      for (const v of [0, 1]) {
        engine.setView(v);
        for (const n of ['x', 'flag'] as const) {
          const box = c.querySelector(`#inflight-${n}`) as SVGRectElement | null;
          const txt = c.querySelector(`#inflight-text-${n}`) as SVGTextElement | null;
          if (!box || !txt) continue;
          const w = parseFloat(box.getAttribute('width')!);
          // happy-dom has no text metrics, so assert the budget the render
          // relies on: ~6.1px per char at 10px monospace, plus 8px padding
          const needed = (txt.textContent ?? '').length * 6.1 + 8;
          expect(needed, `step ${i} view ${v} "${txt.textContent}"`).toBeLessThanOrEqual(w);
        }
      }
    }
  });

  it('renders an in-flight token for exactly the stores that are pending', () => {
    engine.applyScenario('broken');
    const c = engine['container'] as HTMLElement;
    const steps = engine.getSteps();
    for (let i = 0; i < steps.length; i++) {
      engine.seek(i);
      const st = steps[i].state as unknown as { pending: { name: string }[] };
      const drawn = [...c.querySelectorAll('rect[id^="inflight-"]')]
        .map((e) => e.id.replace('inflight-', ''))
        .sort();
      expect(drawn, `step ${i}`).toEqual(st.pending.map((p) => p.name).sort());
    }
  });
});

describe('L24 · lesson contract', () => {
  it('claims the units and slides LESSONS.md assigns it', () => {
    expect(lesson24.id).toBe(24);
    expect(lesson24.lecture).toBe(9);
    expect(lesson24.absorbsUnits).toEqual([47, 48, 49]);
    expect(lesson24.slides).toBe('slides 3–5');
  });

  it('names a geometric property whose meaning changes, not the topic', () => {
    const m = lesson24.morphReveals!;
    // the carrying property is WHERE a pending write sits, not the old "gap"
    expect(m.toLowerCase()).toMatch(/position|where a thing sits/);
    expect(m).toMatch(/stops meaning|starts meaning/);
    expect(m.length).toBeGreaterThan(120);
  });

  it('teaches all three units in the concept', () => {
    const c = lesson24.concept.toLowerCase();
    expect(c).toContain('strongly ordered');
    expect(c).toContain('weakly ordered');
    expect(c).toContain('memory barrier');
    expect(c).toContain('disabling interrupts');
    expect(c).toContain('scalable');
  });

  it('references L12 rather than restating its trace', () => {
    expect(lesson24.concept).toMatch(/Lesson 12/);
  });

  it('maps every analogy element to a mechanism element', () => {
    expect(lesson24.analogyMapping!.length).toBeGreaterThanOrEqual(6);
    for (const row of lesson24.analogyMapping!) expect(row).toContain('➔');
  });
});
