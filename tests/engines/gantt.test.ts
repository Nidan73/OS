import { describe, test, expect, beforeEach } from 'vitest';
import { GanttEngine } from '../../src/engines/gantt.js';

describe('GanttEngine (§4.1)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
  });

  test('GanttEngine initializes and mounts SVG and metrics table', () => {
    const engine = new GanttEngine(host, {
      algorithm: 'fcfs',
      processes: [
        { id: 'P1', arrival: 0, burst: 24 },
        { id: 'P2', arrival: 0, burst: 3 },
        { id: 'P3', arrival: 0, burst: 3 }
      ]
    });

    engine.init();
    expect(engine.getSteps().length).toBeGreaterThan(0);
    expect(host.querySelector('svg')).not.toBeNull();
    expect(host.querySelector('.gantt-metrics-table')).not.toBeNull();

    // Verify initial step caption and state
    const initialStep = engine.getSteps()[0];
    expect(initialStep.t).toBe(0);
    expect(initialStep.caption).toMatch(/T=0/);

    // Verify final step computed metrics
    const finalStep = engine.getSteps().at(-1)!;
    expect(finalStep.state.averages.avgWaiting).toBe(17);
    expect(finalStep.state.averages.avgTurnaround).toBe(27);
  });

  test('GanttEngine seek is idempotent', () => {
    const engine = new GanttEngine(host, {
      algorithm: 'srtf',
      processes: [
        { id: 'P1', arrival: 0, burst: 8 },
        { id: 'P2', arrival: 1, burst: 4 },
        { id: 'P3', arrival: 2, burst: 9 },
        { id: 'P4', arrival: 3, burst: 5 }
      ]
    });
    engine.init();

    engine.seek(3);
    const textAt3 = host.textContent;
    engine.seek(3);
    expect(host.textContent).toBe(textAt3);

    // Seek back and forward
    engine.seek(1);
    engine.seek(3);
    expect(host.textContent).toBe(textAt3);
  });

  test('GanttEngine rejects empty process input', () => {
    const engine = new GanttEngine(host, {
      algorithm: 'fcfs',
      processes: []
    });
    expect(() => engine.init()).toThrow();
  });
});
