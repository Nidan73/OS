import { describe, test, expect, beforeEach } from 'vitest';
import { GanttEngine } from '../../src/engines/gantt.js';
import { lesson02 } from '../../src/lessons/lecture-06/lesson-02.js';
import { fcfs } from '../../src/algorithms/scheduling.js';

describe('Lesson 2: FCFS and Convoy Effect (§3C)', () => {
  let host: HTMLElement;
  let engine: GanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new GanttEngine(host, JSON.parse(JSON.stringify(lesson02.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs units 7 & 8', () => {
    expect(lesson02.id).toBe(2);
    expect(lesson02.lecture).toBe(6);
    expect(lesson02.slug).toBe('lesson-02');
    expect(lesson02.absorbsUnits).toEqual([7, 8]);
    expect(lesson02.slides).toBe('slides 8–9');
    expect(lesson02.engine).toBe('gantt');
    expect(lesson02.analogy.domain).toBe('food');
    expect(lesson02.concept).toContain('First-Come, First-Served');
  });

  test('pure fcfs algorithm produces Slide 8 baseline and Slide 9 reversal (§2.1)', () => {
    const s8 = fcfs(lesson02.input.processes);
    expect(s8.waiting).toEqual({ P1: 0, P2: 24, P3: 27 });
    expect(s8.avgWaiting).toBe(17);
    expect(s8.avgTurnaround).toBe(27);

    const s9 = fcfs([
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 },
      { id: 'P1', arrival: 0, burst: 24 }
    ]);
    expect(s9.waiting).toEqual({ P2: 0, P3: 3, P1: 6 });
    expect(s9.avgWaiting).toBe(3);
    expect(s9.avgTurnaround).toBe(13);
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

  test('interactive playground reorder collapses average wait from 17 to 3 (§3C.4)', () => {
    expect(engine.getScheduleResult().avgWaiting).toBe(17);

    // Reorder to [P2, P3, P1]
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

    // Verify SVG updated
    const barP2 = host.querySelector('#bar-P2');
    expect(barP2).not.toBeNull();
  });

  test('view axis morphs smoothly between analogy and mechanism (§3C.3)', async () => {
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
});
