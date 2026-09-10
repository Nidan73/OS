import { describe, test, expect, beforeEach } from 'vitest';
import { GanttEngine } from '../../src/engines/gantt.js';
import { lesson05, BASELINE_PROCESSES, AGED_PROCESSES } from '../../src/lessons/lecture-06/lesson-05.js';
import { priorityScheduling } from '../../src/algorithms/scheduling.js';

describe('Lesson 5: Priority Scheduling, Starvation & Aging (§3C)', () => {
  let host: HTMLElement;
  let engine: GanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new GanttEngine(host, JSON.parse(JSON.stringify(lesson05.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs unit 14', () => {
    expect(lesson05.id).toBe(5);
    expect(lesson05.lecture).toBe(6);
    expect(lesson05.slug).toBe('lesson-05');
    expect(lesson05.absorbsUnits).toEqual([14]);
    expect(lesson05.slides).toBe('slides 20–22');
    expect(lesson05.engine).toBe('gantt');
    expect(lesson05.analogy.domain).toBe('friends');
    expect(lesson05.analogy.text).toContain('Ammu steps in');
    expect(lesson05.morphReveals).toBe(
      'At dinner your serving order decides where you sit in the line, and waiting costs you nothing. On the timeline that same position becomes when you start — so every newly served guest slides the Afra further right, and starvation is simply a bar that never gets reached. Ammu moves them up the line as they wait.'
    );
    expect(lesson05.morphMode).toBe('morph');
    expect(lesson05.concept).toContain('Priority scheduling');
    expect(lesson05.concept).toContain('starvation');
    expect(lesson05.concept).toContain('Aging');
  });

  test('pure priority scheduling algorithm produces Lecture 6 Slide 21 baseline', () => {
    const s21 = priorityScheduling(BASELINE_PROCESSES);
    expect(s21.waiting).toEqual({ P1: 6, P2: 0, P3: 16, P4: 18, P5: 1 });
    expect(s21.avgWaiting).toBe(8.2);
    expect(s21.totalTime).toBe(19);

    // Verify dispatch sequence: P2 (0..1) -> P5 (1..6) -> P1 (6..16) -> P3 (16..18) -> P4 (18..19)
    expect(s21.bars.map(b => b.id)).toEqual(['P2', 'P5', 'P1', 'P3', 'P4']);
  });

  test('aging elevates Group 9 passenger (P4) to prevent starvation (§3C.4)', () => {
    const baseline = priorityScheduling(BASELINE_PROCESSES);
    expect(baseline.waiting.P4).toBe(18); // Starving at end of line

    const aged = priorityScheduling(AGED_PROCESSES);
    // P4 aged from Group 9 to Group 1 moves to 2nd position right after P2
    expect(aged.bars.map(b => b.id)).toEqual(['P2', 'P4', 'P5', 'P1', 'P3']);
    expect(aged.waiting.P4).toBe(1); // Wait collapsed from 18ms to 1ms
    expect(aged.avgWaiting).toBe(5.4);
  });

  test('interactive playground reorder updates GanttEngine schedule and bars', () => {
    expect(engine.getScheduleResult().avgWaiting).toBe(8.2);
    expect(engine.getScheduleResult().metrics.P4.waiting).toBe(18);

    // Switch to aged processes
    engine.reorderProcesses(AGED_PROCESSES);

    const result = engine.getScheduleResult();
    expect(result.avgWaiting).toBe(5.4);
    expect(result.metrics.P4.waiting).toBe(1);
    expect(result.bars.map(b => b.id)).toEqual(['P2', 'P4', 'P5', 'P1', 'P3']);

    // Verify SVG bar updated
    const barP4 = host.querySelector('#bar-P4');
    expect(barP4).not.toBeNull();
  });

  test('structural isomorphism rule (§3C.2): identical element IDs in view 0, 0.5, and 1', () => {
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
      'proc-P3', 'bar-P3', 'sprite-P3', 'label-P3', 'badge-P3',
      'proc-P4', 'bar-P4', 'sprite-P4', 'label-P4', 'badge-P4',
      'proc-P5', 'bar-P5', 'sprite-P5', 'label-P5', 'badge-P5'
    ];

    // At view = 0 (analogy)
    engine.setView(0);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=0`).not.toBeNull();
    }

    // At view = 0.5 (mid-morph)
    engine.setView(0.5);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=0.5`).not.toBeNull();
    }

    // At view = 1 (mechanism)
    engine.setView(1);
    for (const id of requiredIds) {
      const el = host.querySelector(`#${id}`);
      expect(el, `element #${id} missing in view=1`).not.toBeNull();
    }
  });

  test('validateMorph passes for real morph without errors (§3C.2a, §3C.3)', () => {
    expect(() => engine.validateMorph()).not.toThrow();
  });

  // §3C.2c Required tests per lesson
  test('analogy layout is native, not the mechanism restyled (§3C.2c)', () => {
    engine.setView(0);
    const widths = ['P1', 'P2', 'P3', 'P4', 'P5'].map(id =>
      parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!)
    );
    // Equal footprints in a physical boarding line (660 / 5 = 132)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  });

  test('mechanism layout encodes the quantity (§3C.2c)', () => {
    engine.setView(1);
    const wP1 = parseFloat(host.querySelector('#bar-P1')!.getAttribute('width')!);
    const wP2 = parseFloat(host.querySelector('#bar-P2')!.getAttribute('width')!);
    const wP5 = parseFloat(host.querySelector('#bar-P5')!.getAttribute('width')!);

    // Width means duration: P1 burst 10 vs P2 burst 1
    expect(wP1 / wP2).toBeCloseTo(10 / 1, 1);
    // P5 burst 5 vs P2 burst 1
    expect(wP5 / wP2).toBeCloseTo(5 / 1, 1);
  });

  test('geometry interpolates — the morph is real (§3C.2c)', () => {
    const ids = ['P1', 'P2', 'P3', 'P4', 'P5'];
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
