import { describe, it, expect, beforeEach } from 'vitest';
import { DiagramEngine, type DiagramInput } from '../../src/engines/diagram.js';

describe('DiagramEngine Lifecycle & Geometry (§3A, §3C)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const sampleInput: DiagramInput = {
    title: 'Real-Time Latency Breakdown',
    nodes: [
      { id: 'event', label: 'Event Arrival', x: 20, y: 50, width: 100, height: 40, analogyX: 20, analogyY: 50, analogyWidth: 100, analogyHeight: 40 },
      { id: 'interrupt', label: 'Interrupt Latency', x: 140, y: 50, width: 140, height: 40, analogyX: 140, analogyY: 50, analogyWidth: 80, analogyHeight: 40 },
      { id: 'dispatch', label: 'Dispatch Latency', x: 300, y: 50, width: 180, height: 40, analogyX: 240, analogyY: 50, analogyWidth: 80, analogyHeight: 40 },
      { id: 'task', label: 'Real-Time Task', x: 500, y: 50, width: 160, height: 40, analogyX: 340, analogyY: 50, analogyWidth: 160, analogyHeight: 40 }
    ],
    connections: [
      { id: 'c1', from: 'event', to: 'interrupt' },
      { id: 'c2', from: 'interrupt', to: 'dispatch' },
      { id: 'c3', from: 'dispatch', to: 'task' }
    ],
    reveals: [
      { caption: 'Step 1: Event triggers interrupt.', highlightNodeIds: ['event', 'interrupt'] },
      { caption: 'Step 2: Dispatch and conflict phase.', highlightNodeIds: ['dispatch'] },
      { caption: 'Step 3: Real-time task executes.', highlightNodeIds: ['task'] }
    ]
  };

  it('mounts SVG and initializes correctly with steps', () => {
    const engine = new DiagramEngine(container, sampleInput);
    engine.init(0);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(engine.getSteps().length).toBe(3);

    const barNodes = container.querySelectorAll('[id^="bar-"]');
    expect(barNodes.length).toBe(4);
    engine.destroy();
  });

  it('interpolates node geometry monotonically between view 0 and view 1', () => {
    const engine = new DiagramEngine(container, sampleInput);
    engine.init(0);

    const getNodeWidth = (id: string) => {
      const rect = container.querySelector(`#bar-${id} rect`);
      return parseFloat(rect?.getAttribute('width') ?? '0');
    };

    engine.setView(0);
    const w0 = getNodeWidth('interrupt'); // analogyWidth = 80
    expect(w0).toBe(80);

    engine.setView(0.5);
    const wMid = getNodeWidth('interrupt'); // mid = 110
    expect(wMid).toBe(110);

    engine.setView(1);
    const w1 = getNodeWidth('interrupt'); // mechWidth = 140
    expect(w1).toBe(140);

    expect(wMid).toBeGreaterThan(w0);
    expect(wMid).toBeLessThan(w1);

    engine.destroy();
  });
});
