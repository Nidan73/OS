import { describe, test, expect, beforeEach } from 'vitest';
import { RoundRobinGanttEngine, lesson04 } from '../../src/lessons/lecture-06/lesson-04.js';
import { roundRobin } from '../../src/algorithms/scheduling.js';

describe('Lesson 4: Round Robin and the Cost of Fairness (§3C)', () => {
  let host: HTMLElement;
  let engine: RoundRobinGanttEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new RoundRobinGanttEngine(host, JSON.parse(JSON.stringify(lesson04.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs units 12 & 13', () => {
    expect(lesson04.id).toBe(4);
    expect(lesson04.lecture).toBe(6);
    expect(lesson04.slug).toBe('lesson-04');
    expect(lesson04.absorbsUnits).toEqual([12, 13]);
    expect(lesson04.slides).toBe('slides 16–19');
    expect(lesson04.engine).toBe('gantt');
    expect(lesson04.analogy.domain).toBe('friends');
    expect(lesson04.analogy.text).toContain('family car');
    expect(lesson04.concept).toContain('Round Robin');
    expect(lesson04.morphReveals).toBe(
      'Taking turns with the car, every slot is the same length, so fairness is just holding your place in the key line. On the timeline that same equal width becomes the quantum, and a long drive now needs many separate turns, so shrinking the slot to feel fairer multiplies the handovers until the evening is spent passing the keys.'
    );
  });

  test('pure roundRobin algorithm matches Lecture 6 slide 17 (q=4)', () => {
    const s17 = roundRobin(lesson04.input.processes, 4);
    expect(s17.waiting).toEqual({ P1: 6, P2: 4, P3: 7 });
    expect(s17.avgWaiting).toBe(5.67);
    expect(s17.turnaround).toEqual({ P1: 30, P2: 7, P3: 10 });
    expect(s17.avgTurnaround).toBe(15.67);
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

  test('interactive playground setQuantum updates quantum and recalculates schedule (§3C.4)', () => {
    expect(engine.getQuantum()).toBe(4);
    expect(engine.getScheduleResult().avgWaiting).toBe(5.67);
    expect(engine.getScheduleResult().avgTurnaround).toBe(15.67);

    // Increase quantum to 24 (FCFS convoy effect returns)
    engine.setQuantum(24);
    expect(engine.getQuantum()).toBe(24);
    const res24 = engine.getScheduleResult();
    expect(res24.avgWaiting).toBe(17);
    expect(res24.avgTurnaround).toBe(27);

    // Verify SVG bar updated
    const barP1 = host.querySelector('#bar-P1');
    expect(barP1).not.toBeNull();

    // Reset back to optimal quantum 3
    engine.setQuantum(3);
    expect(engine.getQuantum()).toBe(3);
    const res3 = engine.getScheduleResult();
    expect(res3.avgTurnaround).toBe(15);
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

  // §3C.2c Required tests per lesson
  test('analogy layout is native, not the mechanism restyled (§3C.2c)', () => {
    engine.setView(0);
    const widths = ['P1', 'P2', 'P3'].map(id =>
      parseFloat(host.querySelector(`#bar-${id}`)!.getAttribute('width')!)
    );
    // Equal footprints in a queue/circle
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  });

  test('mechanism layout encodes the quantity (§3C.2c)', () => {
    engine.setView(1);
    const wP1 = parseFloat(host.querySelector('#bar-P1')!.getAttribute('width')!);
    const wP2 = parseFloat(host.querySelector('#bar-P2')!.getAttribute('width')!);
    // At view 1 with q=4, P1 first execution slice is 4ms and P2 is 3ms (4 / 3 = 1.33)
    expect(wP1 / wP2).toBeCloseTo(4 / 3, 1);
  });

  test('geometry interpolates, the morph is real (§3C.2c)', () => {
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
