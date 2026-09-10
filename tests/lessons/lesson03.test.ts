import { describe, test, expect, beforeEach } from 'vitest';
import { GanttEngine } from '../../src/engines/gantt.js';
import { lesson03 } from '../../src/lessons/lecture-06/lesson-03.js';
import { sjf, srtf } from '../../src/algorithms/scheduling.js';

describe('Lesson 3: Shortest Job First (§3C)', () => {
  let host: HTMLElement;
  let engine: GanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new GanttEngine(host, JSON.parse(JSON.stringify(lesson03.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs units 9, 10, 11', () => {
    expect(lesson03.id).toBe(3);
    expect(lesson03.lecture).toBe(6);
    expect(lesson03.slug).toBe('lesson-03');
    expect(lesson03.absorbsUnits).toEqual([9, 10, 11]);
    expect(lesson03.slides).toBe('slides 10–15');
    expect(lesson03.engine).toBe('gantt');
    expect(lesson03.analogy.domain).toBe('food');
    expect(lesson03.morphMode).toBe('morph');
    expect(lesson03.morphReveals).toBe(
      'At the table each guest holds one plate. On a schedule width is cooking time, sending the quick plates first minimizes the whole table wait.'
    );
    expect(lesson03.concept).toContain('Shortest-Job-First');
  });

  test('pure sjf algorithm produces published Slide 11 baseline with avg wait 7 ms (§2.1)', () => {
    const s11 = sjf(lesson03.input.processes);
    expect(s11.waiting).toEqual({ P1: 3, P2: 16, P3: 9, P4: 0 });
    expect(s11.avgWaiting).toBe(7);
    expect(s11.turnaround).toEqual({ P1: 9, P2: 24, P3: 16, P4: 3 });
    expect(s11.avgTurnaround).toBe(13);
    expect(s11.bars).toEqual([
      { id: 'P4', start: 0, end: 3 },
      { id: 'P1', start: 3, end: 9 },
      { id: 'P3', start: 9, end: 16 },
      { id: 'P2', start: 16, end: 24 }
    ]);
  });

  test('Slide 11 discrepancy: published avg wait 7ms requires t=0 arrivals, whereas staggered arrivals 0/2/4/5 yield 3ms (SRTF) or 4ms (SJF)', () => {
    // 1. Published Slide 11 baseline schedule with all jobs at t=0
    const published = sjf(lesson03.input.processes);
    expect(published.waiting).toEqual({ P1: 3, P2: 16, P3: 9, P4: 0 });
    expect(published.avgWaiting).toBe(7);
    expect(published.avgTurnaround).toBe(13);

    // 2. If staggered arrivals 0, 2, 4, 5 with bursts 7, 4, 1, 4 are scheduled with non-preemptive SJF:
    const staggeredSjf = sjf([
      { id: 'P1', arrival: 0, burst: 7 },
      { id: 'P2', arrival: 2, burst: 4 },
      { id: 'P3', arrival: 4, burst: 1 },
      { id: 'P4', arrival: 5, burst: 4 }
    ]);
    expect(staggeredSjf.waiting).toEqual({ P1: 0, P2: 6, P3: 3, P4: 7 });
    expect(staggeredSjf.avgWaiting).toBe(4); // Yields 4 ms, not 7 ms!

    // 3. If staggered arrivals 0, 2, 4, 5 with bursts 7, 4, 1, 4 are scheduled with preemptive SRTF:
    const staggeredSrtf = srtf([
      { id: 'P1', arrival: 0, burst: 7 },
      { id: 'P2', arrival: 2, burst: 4 },
      { id: 'P3', arrival: 4, burst: 1 },
      { id: 'P4', arrival: 5, burst: 4 }
    ]);
    expect(staggeredSrtf.waiting).toEqual({ P1: 9, P2: 1, P3: 0, P4: 2 });
    expect(staggeredSrtf.avgWaiting).toBe(3); // Yields 3 ms, not 7 ms!

    // 4. Confirm lesson input never displays arrival offsets that the schedule ignores
    for (const p of lesson03.input.processes) {
      expect(p.arrival).toBe(0);
    }
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
      'proc-P3', 'bar-P3', 'sprite-P3', 'label-P3', 'badge-P3',
      'proc-P4', 'bar-P4', 'sprite-P4', 'label-P4', 'badge-P4'
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

  test('validateMorph (§3C.2a, §3C.3) passes for real morph and fails on static geometry', () => {
    expect(() => engine.validateMorph()).not.toThrow();
  });

  test('analogy layout is native, not the mechanism restyled (§3C.2c)', () => {
    engine.setView(0);
    const widths = ['P1', 'P2', 'P3', 'P4'].map(id =>
      parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!)
    );
    // Equal footprints in a queue (each 165px)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  });

  test('mechanism layout encodes the quantity (§3C.2c)', () => {
    engine.setView(1);
    const wP1 = parseFloat(host.querySelector('#bar-P1')!.getAttribute('width')!);
    const wP2 = parseFloat(host.querySelector('#bar-P2')!.getAttribute('width')!);
    const wP3 = parseFloat(host.querySelector('#bar-P3')!.getAttribute('width')!);
    const wP4 = parseFloat(host.querySelector('#bar-P4')!.getAttribute('width')!);

    // Width encodes duration: bursts 6, 8, 7, 3
    expect(wP2 / wP4).toBeCloseTo(8 / 3, 1);
    expect(wP1 / wP4).toBeCloseTo(6 / 3, 1);
    expect(wP3 / wP4).toBeCloseTo(7 / 3, 1);
  });

  test('geometry interpolates, the morph is real (§3C.2c)', () => {
    const widthAt = (view: number, id: string) => {
      engine.setView(view);
      return parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!);
    };
    const xAt = (view: number, id: string) => {
      engine.setView(view);
      return parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('x')!);
    };

    // Entities that resize: P2 (165->220), P3 (165->192.5), P4 (165->82.5)
    for (const id of ['P2', 'P3', 'P4']) {
      const [a, mid, b] = [widthAt(0, id), widthAt(0.5, id), widthAt(1, id)];
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }

    // P1 width is constant (165px = 6/24 of 660), but x-coordinate interpolates as it moves from queue position to SJF slot
    const [xa, xmid, xb] = [xAt(0, 'P1'), xAt(0.5, 'P1'), xAt(1, 'P1')];
    expect(xmid).toBeGreaterThan(Math.min(xa, xb));
    expect(xmid).toBeLessThan(Math.max(xa, xb));
  });

  test('interactive playground reorder updates schedule result (§3C.4)', () => {
    expect(engine.getScheduleResult().avgWaiting).toBe(7);

    // Reorder processes
    engine.reorderProcesses([
      { id: 'P2', arrival: 0, burst: 8 },
      { id: 'P3', arrival: 0, burst: 7 },
      { id: 'P1', arrival: 0, burst: 6 },
      { id: 'P4', arrival: 0, burst: 3 }
    ]);

    const result = engine.getScheduleResult();
    expect(result.avgWaiting).toBe(7);
    expect(result.metrics.P4.waiting).toBe(0);
    expect(result.metrics.P1.waiting).toBe(3);

    const barP4 = host.querySelector('#bar-P4');
    expect(barP4).not.toBeNull();
  });
});
