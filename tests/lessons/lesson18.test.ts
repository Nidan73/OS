import { describe, expect, it } from 'vitest';
import { DiagramEngine } from '../../src/engines/diagram.js';
import {
  Lesson18DiagramEngine,
  PREVENTION_NODES,
  STRATEGY_CAPTIONS,
  applyPrevention,
  lesson18,
  preventionInput,
  type PreventionStrategy
} from '../../src/lessons/lecture-10/lesson-18.js';

const PREVENTIONS: PreventionStrategy[] = ['share', 'all-at-once', 'release', 'order'];

describe('Lesson 18 · every prevention verdict is computed', () => {
  it('deadlock remains possible only while all four necessary conditions hold', () => {
    const baseline = applyPrevention('none');
    expect(baseline.deadlockPossible).toBe(true);
    expect(Object.values(baseline.conditions)).toEqual([true, true, true, true]);

    for (const strategy of PREVENTIONS) {
      const result = applyPrevention(strategy);
      expect(result.deadlockPossible).toBe(false);
      expect(Object.values(result.conditions).filter((holds) => !holds)).toHaveLength(1);
    }
  });

  it('each strategy removes the condition named by the deck', () => {
    expect(applyPrevention('share').conditions.mutex).toBe(false);
    expect(applyPrevention('all-at-once').conditions['hold-wait']).toBe(false);
    expect(applyPrevention('release').conditions['no-preempt']).toBe(false);
    expect(applyPrevention('order').conditions.circular).toBe(false);
  });

  it('playground hooks rebuild the timeline and expose the computed result', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson18DiagramEngine(host, preventionInput('none'));
    engine.init(0);

    const hooks = engine.debugHooks();
    (hooks.setStrategy as (strategy: PreventionStrategy) => void)('order');

    expect((hooks.getStrategy as () => PreventionStrategy)()).toBe('order');
    expect((hooks.getResult as () => ReturnType<typeof applyPrevention>)()).toEqual(applyPrevention('order'));
    expect(engine.getSteps().at(-1)?.state.metrics.deadlockPossible).toBe('no');
    expect(preventionInput('order').nodes.find((node) => node.id === 'result')?.label).toBe('Deadlock impossible');
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 18 · diagram morph is structurally honest', () => {
  const geometryAt = (view: number): Record<string, { x: number; width: number }> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson18DiagramEngine(host, preventionInput('none'));
    engine.init(view);
    engine.seek(engine.getSteps().length - 1);
    engine.setView(view);
    const geometry: Record<string, { x: number; width: number }> = {};
    host.querySelectorAll('[id^="bar-"]').forEach((element) => {
      const rect = element.querySelector('rect');
      geometry[element.id] = {
        x: Number(rect?.getAttribute('x')),
        width: Number(rect?.getAttribute('width'))
      };
    });
    engine.destroy();
    host.remove();
    return geometry;
  };

  it('keeps the same five entities at both extremes', () => {
    const ids = PREVENTION_NODES.map((node) => `bar-${node.id}`).sort();
    expect(Object.keys(geometryAt(0)).sort()).toEqual(ids);
    expect(Object.keys(geometryAt(1)).sort()).toEqual(ids);
  });

  it('moves native dinner cards into the condition diagram with real interpolation', () => {
    const analogy = geometryAt(0);
    const mid = geometryAt(0.5);
    const mechanism = geometryAt(1);
    expect(analogy['bar-mutex'].x).not.toBe(mechanism['bar-mutex'].x);
    expect(mid['bar-mutex'].x).toBeGreaterThan(Math.min(analogy['bar-mutex'].x, mechanism['bar-mutex'].x));
    expect(mid['bar-mutex'].x).toBeLessThan(Math.max(analogy['bar-mutex'].x, mechanism['bar-mutex'].x));
  });
});

describe('Lesson 18 · lesson wiring and copy', () => {
  it('declares the diagram engine, units 72–75, and a real morph', () => {
    expect(lesson18.engine).toBe('diagram');
    expect(lesson18.engineClass?.prototype instanceof DiagramEngine).toBe(true);
    expect(lesson18.absorbsUnits).toEqual([72, 73, 74, 75]);
    expect(lesson18.morphMode).toBe('morph');
  });

  it('covers all four handling families and all four prevention conditions', () => {
    const copy = `${lesson18.concept} ${lesson18.analogy.text}`.toLowerCase();
    for (const family of ['prevention', 'avoidance', 'detection and recovery', 'ignoring']) {
      expect(copy).toContain(family);
    }
    for (const condition of ['mutual exclusion', 'hold and wait', 'preemption', 'circular wait']) {
      expect(`${lesson18.concept} ${lesson18.analogyMapping?.join(' ')}`.toLowerCase()).toContain(condition);
    }
  });

  it('keeps internal vocabulary out of student-facing copy', () => {
    const copy = [
      lesson18.analogy.text,
      lesson18.concept,
      lesson18.morphReveals,
      ...(lesson18.analogyMapping ?? [])
    ].join('\n');
    for (const pattern of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(pattern);
    }
  });

  it('every reveal of every strategy speaks both lenses, within the rail', () => {
    for (const strategy of ['none', ...PREVENTIONS] as PreventionStrategy[]) {
      const reveals = preventionInput(strategy).reveals;
      // intro + four conditions + strike + verdict + cost
      expect(reveals.length).toBe(8);
      for (const r of reveals) {
        expect(r.caption.length, r.caption).toBeLessThanOrEqual(320);
        expect(r.analogyCaption, `${strategy}: ${r.caption}`).toBeDefined();
        expect((r.analogyCaption ?? '').length).toBeLessThanOrEqual(320);
        expect((r.analogyCaption ?? '').length).toBeGreaterThan(0);
      }
    }
  });

  it('the analogy voice names the dinner rule each strategy applies', () => {
    const expectations: Array<[PreventionStrategy, RegExp]> = [
      ['none', /four dinner rules stand/],
      ['share', /serving spoons everyone can share/],
      ['all-at-once', /every utensil your recipe needs at once, or take none/],
      ['release', /put yours down and try again/],
      ['order', /numbers the dishes/]
    ];
    for (const [strategy, rx] of expectations) {
      const reveals = preventionInput(strategy).reveals;
      const strike = reveals.find((r) => r.caption === STRATEGY_CAPTIONS[strategy])!;
      expect(strike.analogyCaption ?? '', strategy).toMatch(rx);
      // the strike beat sits after the four condition beats it acts on
      expect(reveals.indexOf(strike)).toBe(5);
      // and the timeline closes with the computed verdict and its price
      expect(reveals[6].caption).toMatch(/deadlock (remains possible|is impossible)/);
      expect(reveals[7].caption).toBe(applyPrevention(strategy).cost);
    }
  });
});
