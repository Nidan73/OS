import { describe, it, expect, beforeEach } from 'vitest';
import { QueueEngine, type QueueInput } from '../../src/engines/queue.js';

describe('QueueEngine Lifecycle and Morphing', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const sampleInput: QueueInput = {
    queues: [
      { id: 'q0', label: 'Q0 (RR q=8)' },
      { id: 'q1', label: 'Q1 (FCFS)' }
    ],
    cores: [
      { id: 'core0', label: 'Core 0' }
    ],
    items: [
      { id: 'P1', burst: 20, queueId: 'q0' },
      { id: 'P2', burst: 5, queueId: 'q0' }
    ],
    analogy: {
      domain: 'food',
      serviceLabel: 'Chef Station',
      queueLabels: { q0: 'Fast Counter', q1: 'Main Dining' },
      itemLabels: {
        P1: { name: 'Party Order' },
        P2: { name: 'Single Coffee' }
      }
    }
  };

  it('builds valid steps and initial step t=0', () => {
    const engine = new QueueEngine(container, sampleInput);
    engine.init(0);
    const steps = engine.getSteps();
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].t).toBe(0);
    expect(steps[0].state.queues.q0).toEqual(['P1', 'P2']);
    engine.destroy();
  });

  it('isomorphic elements [id^="bar-"] exist at both view extremes', () => {
    const engine = new QueueEngine(container, sampleInput);
    engine.init(0);
    const getBarIds = () =>
      Array.from(container.querySelectorAll('[id^="bar-"]')).map(el => el.id).sort();

    engine.setView(0);
    const ids0 = getBarIds();

    engine.setView(1);
    const ids1 = getBarIds();

    expect(ids0).toEqual(['bar-P1', 'bar-P2']);
    expect(ids1).toEqual(['bar-P1', 'bar-P2']);
    engine.destroy();
  });

  it('geometry interpolates strictly between view=0 and view=1', () => {
    const engine = new QueueEngine(container, sampleInput);
    engine.init(0);

    const getWidth = (id: string) => {
      const el = container.querySelector<SVGGraphicsElement>(`#bar-${id} rect`);
      return parseFloat(el?.getAttribute('width') ?? '0');
    };

    engine.setView(0);
    const w0_P1 = getWidth('P1');
    const w0_P2 = getWidth('P2');
    expect(w0_P1).toBe(50);
    expect(w0_P2).toBe(50); // equal footprint in analogy

    engine.setView(1);
    const w1_P1 = getWidth('P1');
    const w1_P2 = getWidth('P2');
    expect(w1_P1).toBeGreaterThan(w1_P2); // mechanism width reflects burst!

    engine.setView(0.5);
    const wMid_P1 = getWidth('P1');
    expect(wMid_P1).toBeGreaterThan(Math.min(w0_P1, w1_P1));
    expect(wMid_P1).toBeLessThan(Math.max(w0_P1, w1_P1));

    engine.destroy();
  });
});
