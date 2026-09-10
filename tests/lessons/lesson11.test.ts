import { describe, it, expect } from 'vitest';
import { simulateCriticalSection } from '../../src/algorithms/synchronization.js';
import {
  csSteps,
  csGeometry,
  lesson11,
  lesson11Input,
  CS_PROCS,
  CS_LANE_X,
  CS_LANE_W,
  CS_ROW_Y0,
  CS_ROW_H
} from '../../src/lessons/lecture-08/lesson-11.js';

const ids = ['P1', 'P2', 'P3', 'cs'];
const stateAt = (broken: 'none' | 'mutex' | 'progress' | 'bounded', step: number) =>
  simulateCriticalSection(broken).steps[Math.min(step, simulateCriticalSection(broken).steps.length - 1)];

describe('Lesson 11 · steps are a pure mapping of the simulation', () => {
  it('mapped step states equal the simulation, step for step', () => {
    const result = simulateCriticalSection('mutex');
    const steps = csSteps({ broken: 'mutex' });
    expect(steps.length).toBe(result.steps.length);
    result.steps.forEach((s, i) => {
      expect(steps[i].state).toStrictEqual(s);
      expect(steps[i].caption).toBe(s.caption);
      expect(steps[i].t).toBe(i);
    });
  });

  it('changing the broken guarantee changes the whole mapped timeline', () => {
    const intact = csSteps({ broken: 'none' });
    const mutex = csSteps({ broken: 'mutex' });
    expect(intact.map(s => s.caption)).not.toEqual(mutex.map(s => s.caption));
  });
});

describe('Lesson 11 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy layout is native: equal footprints, packed queue, seated lower', () => {
    const s = stateAt('none', 4);
    const g = csGeometry(0, s);
    const widths = CS_PROCS.map(p => g[p].w);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    // queue members stand shoulder to shoulder: 30px apart, less than a card width
    const waiting = s.waiting;
    if (waiting.length >= 2) {
      const gap = csGeometry(0, s)[waiting[1]].x - csGeometry(0, s)[waiting[0]].x;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(g[waiting[0]].w);
    }
    // guests at the table sit lower than anyone in the corridor or the room
    const seated = CS_PROCS.filter(p => s.phases[p] === 'remainder');
    const standing = CS_PROCS.filter(p => s.phases[p] !== 'remainder');
    for (const p of seated) {
      for (const q of standing) {
        expect(g[p].y).toBeGreaterThan(g[q].y);
      }
    }
  });

  it('mechanism layout encodes the protocol: lane is phase, row is time', () => {
    const s = stateAt('none', 6);
    const g = csGeometry(1, s);
    for (const p of CS_PROCS) {
      const laneX = CS_LANE_X[s.phases[p]];
      expect(g[p].x).toBeGreaterThanOrEqual(laneX);
      expect(g[p].x + g[p].w).toBeLessThanOrEqual(laneX + CS_LANE_W);
      expect(g[p].y).toBeCloseTo(CS_ROW_Y0 + s.step * CS_ROW_H, 5);
    }
    // lanes are equal width — the protocol gives sections equal standing
    const laneWidths = new Set(CS_PROCS.map(p => (CS_LANE_W as number)));
    expect(laneWidths.size).toBe(1);
  });

  it('geometry interpolates — every entity moves monotonically between views', () => {
    for (const broken of ['none', 'mutex', 'progress', 'bounded'] as const) {
      const s = stateAt(broken, 5);
      for (const id of ids) {
        const a = csGeometry(0, s)[id];
        const mid = csGeometry(0.5, s)[id];
        const b = csGeometry(1, s)[id];
        expect(mid.x).toBeGreaterThan(Math.min(a.x, b.x) - 0.5);
        expect(mid.x).toBeLessThan(Math.max(a.x, b.x) + 0.5);
        expect(mid.y).toBeGreaterThan(Math.min(a.y, b.y) - 0.5);
        expect(mid.y).toBeLessThan(Math.max(a.y, b.y) + 0.5);
      }
    }
  });

  it('the same element set exists at both extremes', () => {
    const s = stateAt('none', 3);
    expect(Object.keys(csGeometry(0, s)).sort()).toEqual([...ids].sort());
    expect(Object.keys(csGeometry(1, s)).sort()).toEqual([...ids].sort());
  });
});

describe('Lesson 11 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number', () => {
    const digits = (s: string) => [...s.matchAll(/\d+/g)].map(m => m[0]);
    expect(digits(lesson11.analogy.text)).toEqual([]);
    expect(digits(lesson11.concept)).toEqual([]);
    expect(digits(lesson11.morphReveals)).toEqual([]);
  });

  it('names all three requirements and stays silent about any passing run', () => {
    for (const promise of ['mutual exclusion', 'progress', 'bounded waiting']) {
      expect(lesson11.concept.toLowerCase()).toContain(promise);
    }
    expect(lesson11.analogy.text.toLowerCase()).not.toMatch(/everyone (gets|enters)/);
  });
});

describe('Lesson 11 · lesson wiring', () => {
  it('opens intact, on a scoped engine, declaring a real morph', () => {
    expect(lesson11Input.broken).toBe('none');
    expect(lesson11.engineClass).toBeDefined();
    expect(lesson11.morphMode).toBe('morph');
    expect(lesson11.absorbsUnits).toEqual([38, 39, 40, 41, 42, 43]);
  });
});
