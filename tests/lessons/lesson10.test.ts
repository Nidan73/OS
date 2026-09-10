import { describe, it, expect } from 'vitest';
import { simulateRaceCondition, RACE_INSTRUCTIONS } from '../../src/algorithms/synchronization.js';
import {
  raceSteps,
  actGeometry,
  actOrder,
  lesson10,
  lesson10Input,
  ACT_TEXT,
  toThreadIds,
  ROW_BASE,
  ROW_H
} from '../../src/lessons/lecture-08/lesson-10.js';
import type { TraceInput } from '../../src/engines/trace.js';

// The slide's verbatim interleaving, Lecture 8 slide 6 (S0–S5), count = 5:
//   S0 T1 read, S1 T1 add, S2 T2 read, S3 T2 sub, S4 T1 write, S5 T2 write
const SLIDE_ORDER = [0, 0, 1, 1, 0, 1];
// The brief's shorthand for the same race: T1,T2,T1,T1,T2,T2
const BRIEF_ORDER = [0, 1, 0, 0, 1, 1];
const SERIAL_ORDER = [0, 0, 0, 1, 1, 1];

const ids = Object.keys(actGeometry(0, SLIDE_ORDER));

function withInput(counter: number, order: number[]): TraceInput {
  return { ...lesson10Input, initial: { counter }, interleaving: [...order] };
}

describe('Lesson 10 · the last slide numbers (§2.1)', () => {
  it('reproduces the slide verbatim: count = 5, S0–S5 -> counter 4, R1 6, R2 4', () => {
    const r = simulateRaceCondition(5, toThreadIds(SLIDE_ORDER));
    expect(r.steps.map(s => s.counter)).toEqual([5, 5, 5, 5, 6, 4]);
    expect(r.steps.map(s => s.register1)).toEqual([5, 6, 6, 6, 6, 6]);
    expect(r.steps.map(s => s.register2)).toEqual([null, null, 5, 4, 4, 4]);
    expect(r.finalCounter).toBe(4);
    expect(r.expectedCounter).toBe(5);
    expect(r.isCorrupted).toBe(true);
  });

  it('the brief\'s shorthand order (T1,T2,T1,T1,T2,T2) reproduces the same stated answer', () => {
    const r = simulateRaceCondition(5, toThreadIds(BRIEF_ORDER));
    expect(r.finalCounter).toBe(4);
    expect(r.steps[r.steps.length - 1].register1).toBe(6);
    expect(r.steps[r.steps.length - 1].register2).toBe(4);
  });

  it('the cake story: 3 pieces, both look, both write "2"', () => {
    const r = simulateRaceCondition(3, toThreadIds(SLIDE_ORDER));
    expect(r.finalCounter).toBe(2);
    expect(r.isCorrupted).toBe(true);
  });

  it('serial execution is not corrupted — only some orders break', () => {
    expect(simulateRaceCondition(5, toThreadIds(SERIAL_ORDER)).finalCounter).toBe(5);
    expect(simulateRaceCondition(5, toThreadIds(SERIAL_ORDER)).isCorrupted).toBe(false);
  });
});

describe('Lesson 10 · mapped steps agree with the algorithm (§2.1)', () => {
  it('every register and memory value in the mapped steps comes from simulateRaceCondition', () => {
    const input = withInput(5, SLIDE_ORDER);
    const result = simulateRaceCondition(5, toThreadIds(SLIDE_ORDER));
    const steps = raceSteps(input);

    expect(steps.length).toBe(result.steps.length + 1); // initial frame + one per action
    result.steps.forEach((rs, i) => {
      const s = steps[i + 1].state;
      expect(s.registers.R1).toBe(rs.register1);
      expect(s.registers.R2).toBe(rs.register2);
      expect(s.memory.counter).toBe(rs.counter);
      expect(s.activeThreadIndex).toBe(rs.threadId === 'T1' ? 0 : 1);
    });

    const finalState = steps[steps.length - 1].state;
    expect(finalState.memory.counter).toBe(result.finalCounter);
    expect(steps[steps.length - 1].caption).toContain(`ends at ${result.finalCounter}`);
    expect(steps[steps.length - 1].caption).toContain(`expected ${result.expectedCounter}`);
  });

  it('registers start null and pointers advance exactly with the mapped steps', () => {
    const steps = raceSteps(withInput(3, SLIDE_ORDER));
    expect(steps[0].state.registers).toEqual({ R1: null, R2: null });
    expect(steps[0].state.memory.counter).toBe(3);
    steps.forEach((s, i) => {
      expect(s.state.threadPointers[0] + s.state.threadPointers[1]).toBe(i);
    });
    expect(steps[steps.length - 1].state.threadPointers).toEqual([3, 3]);
  });
});

describe('Lesson 10 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy layout is native: act cards have equal footprints at view 0', () => {
    const g = actGeometry(0, SLIDE_ORDER);
    const widths = ids.filter(k => k.startsWith('act-')).map(k => g[k].w);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  });

  it('analogy vertical position carries NO time: each parent\'s acts run bottom-up', () => {
    const g = actGeometry(0, SLIDE_ORDER);
    // story order act0 -> act2, but y strictly DECREASES: place, not time
    expect(g['act-T1-0'].y).toBeGreaterThan(g['act-T1-1'].y);
    expect(g['act-T1-1'].y).toBeGreaterThan(g['act-T1-2'].y);
    expect(g['act-T2-0'].y).toBeGreaterThan(g['act-T2-1'].y);
    expect(g['act-T2-1'].y).toBeGreaterThan(g['act-T2-2'].y);
  });

  it('mechanism layout encodes time: y is exactly the execution slot', () => {
    const g = actGeometry(1, SLIDE_ORDER);
    const order = actOrder(SLIDE_ORDER);
    (['T1', 'T2'] as const).forEach((t, tIdx) => {
      [0, 1, 2].forEach(i => {
        expect(g[`act-${t}-${i}`].y).toBeCloseTo(ROW_BASE + order[tIdx][i] * ROW_H, 5);
      });
    });
    // horizontal split is whose register: T1 column strictly left of T2 column
    expect(g['act-T1-0'].x).toBeLessThan(g['act-T2-0'].x);
    expect(g['act-T1-1'].x).toBeCloseTo(g['act-T1-0'].x, 5);
    expect(g['act-T2-1'].x).toBeCloseTo(g['act-T2-0'].x, 5);
  });

  it('geometry interpolates — every entity moves monotonically between views', () => {
    for (const id of ids) {
      const a = actGeometry(0, SLIDE_ORDER)[id];
      const mid = actGeometry(0.5, SLIDE_ORDER)[id];
      const b = actGeometry(1, SLIDE_ORDER)[id];
      expect(mid.y).toBeGreaterThan(Math.min(a.y, b.y) - 0.5);
      expect(mid.y).toBeLessThan(Math.max(a.y, b.y) + 0.5);
      expect(mid.x).toBeGreaterThan(Math.min(a.x, b.x) - 0.5);
      expect(mid.x).toBeLessThan(Math.max(a.x, b.x) + 0.5);
    }
  });

  it('the same element set exists at both extremes', () => {
    expect(Object.keys(actGeometry(0, SLIDE_ORDER)).sort()).toEqual(Object.keys(actGeometry(1, SLIDE_ORDER)).sort());
  });
});

describe('Lesson 10 · words agree with the mechanism', () => {
  it('displayed instruction strings ARE the algorithm\'s instructions — no drift possible', () => {
    expect(lesson10Input.threads[0].instructions).toEqual(RACE_INSTRUCTIONS.T1);
    expect(lesson10Input.threads[1].instructions).toEqual(RACE_INSTRUCTIONS.T2);
  });

  it('each analogy act label points the same way as the sign in its instruction', () => {
    (['T1', 'T2'] as const).forEach((t, tIdx) => {
      const sign = lesson10Input.threads[tIdx].instructions[1].includes('+') ? 1 : -1;
      const label = ACT_TEXT[t][1].toLowerCase();
      if (sign > 0) {
        expect(label).toMatch(/puts|add/);
        expect(label).not.toMatch(/takes|removes/);
      } else {
        expect(label).toMatch(/takes|removes/);
        expect(label).not.toMatch(/puts back|add/);
      }
    });
  });

  it('expectedCounter equals the initial count for the default input', () => {
    const r = simulateRaceCondition(
      lesson10Input.initial.counter,
      toThreadIds(lesson10Input.interleaving)
    );
    expect(r.expectedCounter).toBe(lesson10Input.initial.counter);
  });

  it('no copy claims mother and father make the same-direction edit', () => {
    expect(lesson10.analogy.text.toLowerCase()).not.toMatch(/both (mother and father )?(take|write|put)/);
    expect(lesson10.concept.toLowerCase()).not.toMatch(/both (parents )?(take one|write back "2")/);
    expect(ACT_TEXT.T1[1].toLowerCase()).not.toBe(ACT_TEXT.T2[1].toLowerCase());
  });

  it('analogy, concept and morph copy contain no bare outcome number the playground can change', () => {
    // Every digit the playground can put on screen lives in the scenarios:
    // initial 3/800/14/5 and the outcomes initial-1/initial/initial+1. Copy
    // must state the mechanism conditionally, never one run's result — so
    // after removing identifier tokens (register1, R2, …), no digits remain.
    const stripIdentifiers = (s: string) => s.replace(/register\d|R\d/gi, '');
    const digits = (s: string) => [...stripIdentifiers(s).matchAll(/\d+/g)].map(m => m[0]);
    expect(digits(lesson10.analogy.text)).toEqual([]);
    expect(digits(lesson10.concept)).toEqual([]);
    expect(digits(lesson10.morphReveals)).toEqual([]);
  });
});

describe('Lesson 10 · lesson wiring', () => {
  it('opens on the slide\'s verbatim trace and declares a real morph on a scoped engine', () => {
    expect(lesson10Input.interleaving).toEqual(SLIDE_ORDER);
    expect(lesson10.engineClass).toBeDefined();
    expect(lesson10.morphMode).toBe('morph');
    expect(lesson10.absorbsUnits).toEqual([34, 35, 36, 37]);
  });
});
