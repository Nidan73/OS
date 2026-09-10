import { describe, test, expect, beforeEach } from 'vitest';
import { lesson08, SCENARIO_EVENTS, MigrationQueueEngine } from '../../src/lessons/lecture-07/lesson-08.js';

describe('Lesson 8: Multiprocessor Load Balancing & Processor Affinity (§3C)', () => {
  let host: HTMLElement;
  let engine: MigrationQueueEngine;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    engine = new MigrationQueueEngine(host, JSON.parse(JSON.stringify(lesson08.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test('lesson definition matches LESSONS.md and absorbs units 24, 25, 26', () => {
    expect(lesson08.id).toBe(8);
    expect(lesson08.lecture).toBe(7);
    expect(lesson08.slug).toBe('lesson-08');
    expect(lesson08.absorbsUnits).toEqual([24, 25, 26]);
    expect(lesson08.slides).toBe('slides 15–17');
    expect(lesson08.engine).toBe('queue');
    expect(lesson08.analogy.domain).toBe('food');
    expect(lesson08.concept).toContain('Multiprocessor scheduling');
    expect(lesson08.morphReveals).toBe(
      'In the restaurant, walking to a busier section is free — sideways distance costs nothing but a few steps, so the host always evens the sections. Across cores that same sideways move throws away a warm cache, so horizontal distance turns into a price paid in reload time. Balance and locality pull opposite ways.'
    );
    expect(lesson08.morphMode).toBe('morph');
  });

  // §3C.2c Required Test 1: Analogy layout is native
  test('analogy layout is native, not the mechanism restyled (§3C.2c)', () => {
    engine.setView(0);
    const widths = ['P1', 'P2', 'P3'].map(id => {
      const rect = host.querySelector<SVGRectElement>(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    });
    // Equal footprints in a physical queue
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    expect(widths[0]).toBe(50);
  });

  // §3C.2c Required Test 2: Mechanism layout encodes the quantity
  test('mechanism layout encodes the quantity (§3C.2c)', () => {
    engine.setView(1);
    const wP1 = parseFloat(host.querySelector<SVGRectElement>('#bar-P1 rect')?.getAttribute('width') ?? '0');
    const wP2 = parseFloat(host.querySelector<SVGRectElement>('#bar-P2 rect')?.getAttribute('width') ?? '0');
    const wP3 = parseFloat(host.querySelector<SVGRectElement>('#bar-P3 rect')?.getAttribute('width') ?? '0');

    // In mechanism view, bar width reflects CPU burst duration (burst * 5px)
    expect(wP1).toBe(12 * 5);
    expect(wP2).toBe(15 * 5);
    expect(wP3).toBe(20 * 5);
    expect(wP3).toBeGreaterThan(wP2);
    expect(wP2).toBeGreaterThan(wP1);
    expect(wP3 / wP1).toBeCloseTo(20 / 12, 5);
  });

  // §3C.2c Required Test 3: Geometry interpolates — the morph is real
  test('geometry interpolates — the morph is real (§3C.2c)', () => {
    const ids = ['P1', 'P2', 'P3'];
    const widthAt = (view: number, id: string) => {
      engine.setView(view);
      const rect = host.querySelector<SVGRectElement>(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    };

    const expectedB: Record<string, number> = { P1: 60, P2: 75, P3: 100 };
    for (const id of ids) {
      const [a, mid, b] = [widthAt(0, id), widthAt(0.5, id), widthAt(1, id)];
      expect(a).toBe(50);
      expect(b).toBe(expectedB[id]);
      // Strictly between endpoints
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
      expect(mid).toBeCloseTo((50 + expectedB[id]) / 2, 1);
    }
  });

  test('structural isomorphism: element IDs exist at view 0, 0.5, and 1', () => {
    const ids = ['bar-P1', 'bar-P2', 'bar-P3'];
    for (const v of [0, 0.5, 1]) {
      engine.setView(v);
      for (const id of ids) {
        const el = host.querySelector(`#${id}`);
        expect(el, `element #${id} missing at view=${v}`).not.toBeNull();
      }
    }
  });

  test('push migration scenario correctly balances workload to core 1', () => {
    const steps = engine.getSteps();
    expect(steps.length).toBe(14); // Initial step + 3 arrivals + dispatch/run + tick/migrate/dispatch/stall/run + dispatch/run + verdict

    // Initial state: new work stages in the incoming lane
    expect(steps[0].state.queues.incoming).toEqual(['P1', 'P2', 'P3']);
    expect(steps[0].state.cores.core0).toBeNull();
    expect(steps[0].state.cores.core1).toBeNull();

    // Arrivals join Core 0's runqueue one by one
    expect(steps[1].state.queues.q_core0).toEqual(['P1']);
    expect(steps[3].state.queues.q_core0).toEqual(['P1', 'P2', 'P3']);

    // P1 runs and completes on Core 0 before the balancer acts
    expect(steps[4].state.cores.core0).toBe('P1');
    expect(steps[5].state.completed).toContain('P1');

    // The balancer tick fires before the move — detection and migration differ
    expect(steps[6].caption).toMatch(/Balancer tick/);
    const stepPush = steps[7];
    expect(stepPush.state.queues.q_core1).toContain('P3');

    // Core 1 dispatches P3, then the cold lines refill mid-execution
    const stepDispatchCore1 = steps[8];
    expect(stepDispatchCore1.state.cores.core1).toBe('P3');
    expect(steps[9].caption).toMatch(/cold/);
    expect(steps[10].state.completed).toContain('P3');

    // Core 0 dispatches P2, warm throughout, and the verdict closes
    expect(steps[11].state.cores.core0).toBe('P2');
    expect(steps[12].state.completed).toContain('P2');
    expect(steps[13].caption).toMatch(/Balanced/);
  });

  test('playground scenarios reconfigure steps properly', () => {
    // Pull scenario
    engine.reconfigure(SCENARIO_EVENTS.pull);
    expect(engine.getSteps().length).toBe(14);
    expect(engine.getSteps()[7].caption).toContain('steals');

    // Affinity scenario: the refusal is two honest beats — the tick fires,
    // then the move is forbidden — instead of one lesson doing two jobs
    engine.reconfigure(SCENARIO_EVENTS.affinity);
    expect(engine.getSteps().length).toBe(13);
    expect(engine.getSteps()[6].caption).toContain('tick');
    expect(engine.getSteps()[7].caption).toContain('forbidden');
  });
});
