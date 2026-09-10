import { describe, it, expect, beforeEach } from 'vitest';
import { QueueEngine } from '../../src/engines/queue.js';
import { lesson06 } from '../../src/lessons/lecture-07/lesson-06.js';

describe('Lesson 06 — Queues within queues (MLFQ)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // ── SPEC §3C.2c Required Test 1: Analogy layout is native, not mechanism restyled
  it('analogy layout is native, not the mechanism restyled', () => {
    const engine = new QueueEngine(container, lesson06.input);
    engine.init(0);
    engine.setView(0);

    const widths = ['P1', 'P2', 'P3'].map(id => {
      const rect = container.querySelector<SVGGraphicsElement>(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    });

    // In a physical line, each passenger/token occupies equal footprint
    expect(widths).toEqual([50, 50, 50]);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    engine.destroy();
  });

  // ── SPEC §3C.2c Required Test 2: Mechanism layout encodes the quantity
  it('mechanism layout encodes the quantity', () => {
    const engine = new QueueEngine(container, lesson06.input);
    engine.init(0);
    engine.setView(1);

    const getWidth = (id: string) => {
      const rect = container.querySelector<SVGGraphicsElement>(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    };

    const wP1 = getWidth('P1');
    const wP2 = getWidth('P2');
    const wP3 = getWidth('P3');

    // Width directly corresponds to burst duration: P1(30ms) > P3(15ms) > P2(8ms)
    expect(wP1).toBe(100);
    expect(wP2).toBe(40);
    expect(wP3).toBe(75);
    expect(wP1).toBeGreaterThan(wP3);
    expect(wP3).toBeGreaterThan(wP2);
    expect(wP1 / wP2).toBe(2.5);
    engine.destroy();
  });

  // ── SPEC §3C.2c Required Test 3: Geometry interpolates — the morph is real
  it('geometry interpolates — the morph is real', () => {
    const engine = new QueueEngine(container, lesson06.input);
    engine.init(0);

    const getWidth = (id: string) => {
      const rect = container.querySelector<SVGGraphicsElement>(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    };

    for (const id of ['P1', 'P2', 'P3']) {
      engine.setView(0);
      const a = getWidth(id);

      engine.setView(0.5);
      const mid = getWidth(id);

      engine.setView(1);
      const b = getWidth(id);

      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
    engine.destroy();
  });

  it('has valid metadata conforming to LESSONS.md and Atlas absorption', () => {
    expect(lesson06.id).toBe(6);
    expect(lesson06.lecture).toBe(7);
    expect(lesson06.slug).toBe('lesson-06');
    expect(lesson06.absorbsUnits).toEqual([15, 16]);
    expect(lesson06.slides).toBe('slides 3–6');
    expect(lesson06.engine).toBe('queue');
    expect(lesson06.analogy.domain).toBe('travel');
    expect(lesson06.morphMode).toBe('morph');
    expect(lesson06.morphReveals).toBe(
      'At the airport, which lane you stand in is printed on your ticket — a fact about who you are before you arrive. In the feedback queues that same vertical position is earned: every job that outlives its time slice drops a row. Height stops describing what a job is and starts recording how it has behaved.'
    );
  });

  it('isomorphic elements [id^="bar-"] are identical at both view extremes', () => {
    const engine = new QueueEngine(container, lesson06.input);
    engine.init(0);

    const getBarIds = () =>
      Array.from(container.querySelectorAll('[id^="bar-"]'))
        .map(el => el.id)
        .sort();

    engine.setView(0);
    const ids0 = getBarIds();

    engine.setView(1);
    const ids1 = getBarIds();

    expect(ids0).toEqual(['bar-P1', 'bar-P2', 'bar-P3']);
    expect(ids1).toEqual(['bar-P1', 'bar-P2', 'bar-P3']);
    engine.destroy();
  });

  it('produces valid MLFQ demotion and completion events', () => {
    const engine = new QueueEngine(container, lesson06.input);
    engine.init(0);
    const steps = engine.getSteps();

    expect(steps.length).toBe(16); // Initial t=0 + 3 arrivals + 12 dispatch/demote/complete beats
    expect(steps[0].state.queues.incoming).toEqual(['P1', 'P2', 'P3']);
    expect(steps[3].state.queues.Q0).toEqual(['P1', 'P2', 'P3']);

    // P1 runs its Q0 quantum, then demotes to Q1
    expect(steps[4].state.cores.cpu0).toBe('P1');
    expect(steps[5].state.queues.Q1).toContain('P1');

    // P2 runs its Q0 quantum, then completes inside Q0
    expect(steps[6].state.cores.cpu0).toBe('P2');
    expect(steps[7].state.completed).toContain('P2');

    // P3 runs its Q0 quantum, then demotes to Q1
    expect(steps[9].state.queues.Q1).toContain('P3');

    // P1 runs its Q1 quantum, then demotes to Q2
    expect(steps[11].state.queues.Q2).toContain('P1');

    // P3 runs its Q1 remainder and completes; P1 runs Q2 to completion
    expect(steps[13].state.completed).toContain('P3');
    expect(steps[15].state.completed).toContain('P1');

    engine.destroy();
  });
});
