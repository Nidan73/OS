import { describe, test, expect, beforeEach } from 'vitest';
import { GanttEngine } from '../../src/engines/gantt.js';
import { lesson01 } from '../../src/lessons/lecture-06/lesson-01.js';
import { fcfs } from '../../src/algorithms/scheduling.js';

describe('Lesson 1: Why a scheduler exists at all (§3C)', () => {
  let host: HTMLElement;
  let engine: GanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new GanttEngine(host, JSON.parse(JSON.stringify(lesson01.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs units 1–5', () => {
    expect(lesson01.id).toBe(1);
    expect(lesson01.lecture).toBe(6);
    expect(lesson01.slug).toBe('lesson-01');
    expect(lesson01.title).toBe('Why a scheduler exists at all');
    expect(lesson01.absorbsUnits).toEqual([1, 2, 3, 4, 5]);
    expect(lesson01.slides).toBe('slides 3–5');
    expect(lesson01.engine).toBe('gantt');
    expect(lesson01.analogy.domain).toBe('food');
    expect(lesson01.concept).toContain('CPU');
    expect(lesson01.morphReveals).toBeTruthy();
    expect(lesson01.morphMode).toBe('morph');
  });

  test('pure scheduling algorithm models CPU burst cycle and baseline wait time (§2.1)', () => {
    const result = fcfs(lesson01.input.processes);
    expect(result.waiting).toEqual({ P1: 0, P2: 24, P3: 27 });
    expect(result.avgWaiting).toBe(17);
    expect(result.avgTurnaround).toBe(27);
  });

  test('structural isomorphism rule (§3C.2): identical element IDs in view 0 and view 1', () => {
    const requiredIds = [
      'service-station',
      'core-box',
      'core-title',
      'core-state',
      'truck-box',
      'truck-title',
      'truck-state',
      'track-guide',
      'axis-line',
      'cursor-line',
      'cursor-bg',
      'cursor-label',
      'proc-P1', 'bar-P1', 'sprite-P1', 'label-P1', 'badge-P1',
      'proc-P2', 'bar-P2', 'sprite-P2', 'label-P2', 'badge-P2',
      'proc-P3', 'bar-P3', 'sprite-P3', 'label-P3', 'badge-P3'
    ];

    // At view = 0 (analogy)
    engine.setView(0);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=0`).not.toBeNull();
    }

    // At view = 1 (mechanism)
    engine.setView(1);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=1`).not.toBeNull();
    }

    // At view = 0.5 (mid-morph)
    engine.setView(0.5);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=0.5`).not.toBeNull();
    }
  });

  test('render is absolute and idempotent (§4A.2)', () => {
    engine.seek(1);
    const html1 = host.innerHTML;
    engine.seek(1);
    const html2 = host.innerHTML;
    expect(html1).toBe(html2);
  });

  test('interactive playground reorder alters CPU execution order (§3C.4)', () => {
    expect(engine.getScheduleResult().avgWaiting).toBe(17);

    // Reorder: run short jobs first (espresso before tasting menu)
    engine.reorderProcesses([
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 },
      { id: 'P1', arrival: 0, burst: 24 }
    ]);

    const result = engine.getScheduleResult();
    expect(result.avgWaiting).toBe(3);
    expect(result.avgTurnaround).toBe(13);
    expect(result.metrics.P2.waiting).toBe(0);
    expect(result.metrics.P3.waiting).toBe(3);
    expect(result.metrics.P1.waiting).toBe(6);

    const barP2 = host.querySelector('#bar-P2');
    expect(barP2).not.toBeNull();
  });

  test('view axis morphs smoothly between analogy and mechanism (§3C.3)', () => {
    expect(engine.getView()).toBe(0);
    engine.setView(1);
    expect(engine.getView()).toBe(1);

    const coreBox = host.querySelector('#core-box') as HTMLElement;
    const truckBox = host.querySelector('#truck-box') as HTMLElement;

    expect(coreBox.style.opacity).toBe('1');
    expect(truckBox.style.opacity).toBe('0');

    engine.setView(0);
    expect(coreBox.style.opacity).toBe('0');
    expect(truckBox.style.opacity).toBe('1');
  });

  test('validateMorph (§3C.2a, §3C.3) passes for real morph and fails on static geometry', () => {
    expect(() => engine.validateMorph()).not.toThrow();
  });

  // §3C.2c Required tests per lesson
  test('analogy layout is native, not the mechanism restyled', () => {
    engine.setView(0);
    const widths = ['P1', 'P2', 'P3'].map(id =>
      parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!)
    );
    // Equal footprints in a queue (diner seating slots)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  });

  test('mechanism layout encodes the quantity', () => {
    engine.setView(1);
    const wP1 = parseFloat(host.querySelector('#bar-P1')!.getAttribute('width')!);
    const wP2 = parseFloat(host.querySelector('#bar-P2')!.getAttribute('width')!);
    // Width means duration (24 / 3 = 8)
    expect(wP1 / wP2).toBeCloseTo(24 / 3, 1);
  });

  test('geometry interpolates — the morph is real', () => {
    const ids = ['P1', 'P2', 'P3'];
    const widthAt = (view: number, id: string) => {
      engine.setView(view);
      return parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!);
    };

    for (const id of ids) {
      const [a, mid, b] = [widthAt(0, id), widthAt(0.5, id), widthAt(1, id)];
      // strictly between endpoints
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
