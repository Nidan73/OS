import { describe, it, expect } from 'vitest';
import { simulatePeterson, simulateReorderingOutput } from '../../src/algorithms/synchronization.js';
import {
  publicationSteps,
  petersonGeometry,
  actRows,
  lesson12,
  lesson12Input
} from '../../src/lessons/lecture-08/lesson-12.js';

const ids = ['T1', 'T2', 'door', 'msg', 'pack'];

describe('Lesson 12 · the slide\u2019s print test, computed', () => {
  it('sequential consistency prints the announced value', () => {
    const r = simulateReorderingOutput(false);
    expect(r.output).toBe(100);
    expect(r.expectedOutput).toBe(100);
    expect(r.flipped).toBe(false);
    const print = r.steps.find(s => s.action === 'print x');
    expect(print?.x).toBe(100);
    expect(print?.printed).toBe(100);
  });

  it('reordered, the print runs before the store lands and the output flips to 0', () => {
    const r = simulateReorderingOutput(true);
    expect(r.output).toBe(0);
    expect(r.expectedOutput).toBe(100);
    expect(r.flipped).toBe(true);
    const print = r.steps.find(s => s.action === 'print x');
    expect(print?.x).toBe(0);
    expect(print?.printed).toBe(0);
    expect(r.steps[r.steps.length - 1].action).toBe('x = 100');
  });

  it('expectedOutput is computed from the intact run, never a constant', () => {
    expect(simulateReorderingOutput(true).expectedOutput)
      .toBe(simulateReorderingOutput(false).output);
  });

  it('the doorway protocol still holds without reordering and breaks with it', () => {
    expect(simulatePeterson(false).mutualExclusionViolated).toBe(false);
    expect(simulatePeterson(true).mutualExclusionViolated).toBe(true);
  });
});

describe('Lesson 12 · steps are a pure mapping of the simulation', () => {
  it('the timeline IS the print test, mapped step for step, both modes', () => {
    for (const reordered of [false, true]) {
      const result = simulateReorderingOutput(reordered);
      const steps = publicationSteps({ reordered });
      // open framing + one step per print-test op + computed verdict
      expect(steps.length).toBe(result.steps.length + 2);
      expect(steps[0].t).toBe(0);
      result.steps.forEach((s, i) => {
        expect(steps[i + 1].state.action).toBe(s.action);
        expect(steps[i + 1].state.x).toBe(s.x);
        expect(steps[i + 1].state.printed).toBe(s.printed);
        expect(steps[i + 1].caption).toBe(s.caption);
        expect(steps[i + 1].t).toBe(i + 1);
      });
      const verdict = steps[steps.length - 1];
      expect(verdict.caption).toContain(`${result.output}`);
      expect(verdict.state.printed).toBe(result.output);
    }
  });

  it('the doorway verdict travels with every step, computed by simulatePeterson', () => {
    expect(publicationSteps({ reordered: false })[0].state.bothInside).toBe(false);
    expect(publicationSteps({ reordered: true })[0].state.bothInside).toBe(true);
    expect(simulatePeterson(true).mutualExclusionViolated).toBe(true);
  });
});

describe('Lesson 12 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy layout is native: the room\u2019s furniture never reorders', () => {
    for (const id of ids) {
      const calm = petersonGeometry(0, false)[id];
      const flipped = petersonGeometry(0, true)[id];
      expect(calm).toStrictEqual(flipped);
    }
    // the two acts sit at fixed, arbitrary heights, msg high, pack low
    const g = petersonGeometry(0, false);
    expect(g.msg.y).toBeLessThan(g.pack.y);
  });

  it('mechanism layout encodes execution order: the toggle swaps the two rows', () => {
    const calm = petersonGeometry(1, false);
    const flipped = petersonGeometry(1, true);
    expect(calm.pack.y).toBeLessThan(calm.msg.y); // store first, then flag
    expect(flipped.msg.y).toBeLessThan(flipped.pack.y); // flag first, then store
    expect(calm.msg.y).not.toBe(flipped.msg.y); // the rows really move
    expect(actRows(false)).toEqual({ msg: 1, pack: 0, print: 2 });
    expect(actRows(true)).toEqual({ msg: 0, pack: 1, print: 1 });
  });

  it('geometry interpolates, every entity moves monotonically between views', () => {
    for (const reordered of [false, true]) {
      for (const id of ids) {
        const a = petersonGeometry(0, reordered)[id];
        const mid = petersonGeometry(0.5, reordered)[id];
        const b = petersonGeometry(1, reordered)[id];
        expect(mid.x).toBeGreaterThan(Math.min(a.x, b.x) - 0.5);
        expect(mid.x).toBeLessThan(Math.max(a.x, b.x) + 0.5);
        expect(mid.y).toBeGreaterThan(Math.min(a.y, b.y) - 0.5);
        expect(mid.y).toBeLessThan(Math.max(a.y, b.y) + 0.5);
      }
    }
  });

  it('the same element set exists at both extremes, both modes', () => {
    for (const reordered of [false, true]) {
      expect(Object.keys(petersonGeometry(0, reordered)).sort()).toEqual([...ids].sort());
      expect(Object.keys(petersonGeometry(1, reordered)).sort()).toEqual([...ids].sort());
    }
  });
});

describe('Lesson 12 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number', () => {
    const digits = (s: string) => [...s.matchAll(/\d+/g)].map(m => m[0]);
    expect(digits(lesson12.analogy.text)).toEqual([]);
    expect(digits(lesson12.concept)).toEqual([]);
    expect(digits(lesson12.morphReveals)).toEqual([]);
  });

  it('copy names reordering as the breaker, never asserts one printed value as certain', () => {
    expect(lesson12.concept.toLowerCase()).toContain('reorder');
    expect(lesson12.analogy.text.toLowerCase()).not.toMatch(/prints (one hundred|\d+)/);
  });
});

describe('Lesson 12 · lesson wiring', () => {
  it('opens un-reordered, on a scoped engine, declaring a real morph', () => {
    expect(lesson12Input.reordered).toBe(false);
    expect(lesson12.engineClass).toBeDefined();
    expect(lesson12.morphMode).toBe('morph');
    expect(lesson12.absorbsUnits).toEqual([44, 45, 46]);
  });
});
