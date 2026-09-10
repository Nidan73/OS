import { describe, it, expect } from 'vitest';
import { GraphEngine, type GraphInput } from '../../src/engines/graph.js';
import { MatrixEngine, type MatrixInput } from '../../src/engines/matrix.js';

// ── B4 engine self-check ────────────────────────────────────────────────────
//
// Before any lesson exists, each new engine must prove its morph is not a
// reskin: mount with a fixture, read geometry off the rendered DOM at view 0,
// 0.5 and 1 the way widthsAt() does in tests/lessons/lesson13.test.ts, and
// assert that at view 1 DIFFERENT ENTITIES HAVE DIFFERENT GEOMETRY. Both
// TraceEngine and CounterEngine shipped a render() whose view changed only
// uniform sizes and passed the gate, this check runs first so Wave 3
// lessons cannot inherit that.

const GRAPH_FIXTURE: GraphInput = {
  nodes: [
    { id: 'T1', kind: 'process', analogyLabel: 'Friend A' },
    { id: 'T2', kind: 'process', analogyLabel: 'Friend B' },
    { id: 'R1', kind: 'resource', instances: 1 },
    { id: 'R2', kind: 'resource', instances: 3 }
  ],
  initialEdges: [{ from: 'R2', to: 'T1', kind: 'assignment' }],
  events: [
    { caption: 'T1 asks for the last chopstick.', addEdge: { from: 'T1', to: 'R1', kind: 'request' } },
    {
      caption: 'T2 takes two, the ring closes.',
      addEdge: { from: 'R1', to: 'T2', kind: 'assignment' },
      setCycle: ['T1', 'R1', 'T2', 'R2']
    }
  ]
};

const MATRIX_FIXTURE: MatrixInput = {
  resources: ['A', 'B', 'C'],
  processes: ['P0', 'P1', 'P2'],
  available: [3, 3, 2],
  max: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2]
  ],
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2]
  ],
  events: [
    {
      caption: 'P0 needs more than is free, refused.',
      probeCells: [[0, 0], [0, 1], [0, 2]],
      work: [3, 3, 2],
      activeRow: 0
    },
    {
      caption: 'P1 fits, reclaim its row.',
      probeCells: [[1, 0], [1, 1], [1, 2]],
      finishedRows: [1],
      work: [5, 3, 2],
      activeRow: 1
    }
  ]
};

function widthsAt(
  mount: (host: HTMLElement) => { engine: { setView(v: number): void; destroy(): void } },
  view: number
): Record<string, number> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const { engine } = mount(host);
  engine.setView(view);
  const out: Record<string, number> = {};
  host.querySelectorAll('[id^="bar-"]').forEach((el) => {
    const rect = el.tagName.toLowerCase() === 'g' ? el.querySelector('rect') : el;
    const w = parseFloat(rect?.getAttribute('width') ?? 'NaN');
    if (Number.isFinite(w)) out[(el as Element).id] = w;
  });
  engine.destroy();
  host.remove();
  return out;
}

describe('B4 · GraphEngine is not a reskin', () => {
  const mount = (host: HTMLElement) => {
    const engine = new GraphEngine(host, JSON.parse(JSON.stringify(GRAPH_FIXTURE)));
    engine.init(0);
    engine.seek(engine.getSteps().length - 1);
    return { engine };
  };

  it('analogy tokens share one footprint, the scene is native', () => {
    const w = widthsAt(mount, 0);
    expect(Object.keys(w).length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...Object.values(w)) - Math.min(...Object.values(w))).toBeLessThan(1);
  });

  it('mechanism widths differ per entity, holdings and instances encoded', () => {
    const w = widthsAt(mount, 1);
    const widths = Object.values(w);
    // R2 (3 instances) is wider than R1 (1); T2 (holds R1) wider than T1 (holds R2: 1 each, so check resource spread).
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(1);
    expect(w['bar-R2']).toBeGreaterThan(w['bar-R1']);
  });

  it('geometry interpolates, every entity moves monotonically', () => {
    for (const id of ['bar-T1', 'bar-T2', 'bar-R1', 'bar-R2']) {
      const a = widthsAt(mount, 0)[id];
      const mid = widthsAt(mount, 0.5)[id];
      const b = widthsAt(mount, 1)[id];
      if (Math.abs(a - b) < 1) continue;
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });

  it('renders edges, and the closing step highlights the cycle', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new GraphEngine(host, JSON.parse(JSON.stringify(GRAPH_FIXTURE)));
    engine.init(0);
    engine.seek(engine.getSteps().length - 1);
    engine.setView(1);
    const st = engine.getSteps()[engine.getSteps().length - 1].state;
    expect(st.cycleIds).toEqual(['T1', 'R1', 'T2', 'R2']);
    expect(host.querySelectorAll('[id^="edge-"]').length).toBeGreaterThan(0);
    engine.destroy();
    host.remove();
  });
});

describe('B4 · MatrixEngine is not a reskin', () => {
  const mount = (host: HTMLElement) => {
    const engine = new MatrixEngine(host, JSON.parse(JSON.stringify(MATRIX_FIXTURE)));
    engine.init(0);
    engine.seek(engine.getSteps().length - 1);
    return { engine };
  };

  it('analogy cells share one footprint, the slips are native', () => {
    const w = widthsAt(mount, 0);
    expect(Object.keys(w).length).toBeGreaterThanOrEqual(9);
    expect(Math.max(...Object.values(w)) - Math.min(...Object.values(w))).toBeLessThan(1);
  });

  it('mechanism widths differ per cell, amount encoded, not uniform', () => {
    const w = widthsAt(mount, 1);
    const widths = Object.values(w);
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(1);
    // Need[P0,A]=7 is wider than Need[P1,A]=1: same column, different claims.
    expect(w['bar-need-P0-A']).toBeGreaterThan(w['bar-need-P1-A']);
  });

  it('geometry interpolates, every entity moves monotonically', () => {
    const ids = Object.keys(widthsAt(mount, 0));
    for (const id of ids) {
      const a = widthsAt(mount, 0)[id];
      const mid = widthsAt(mount, 0.5)[id];
      const b = widthsAt(mount, 1)[id];
      if (Math.abs(a - b) < 1) continue;
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });

  it('Need derives as Max − Allocation, and the sweep dims finished rows', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new MatrixEngine(host, JSON.parse(JSON.stringify(MATRIX_FIXTURE)));
    engine.init(0);
    expect(engine.getNeed()).toEqual([
      [7, 4, 3],
      [1, 2, 2],
      [6, 0, 0]
    ]);
    engine.seek(engine.getSteps().length - 1);
    expect(engine.getSteps()[engine.getSteps().length - 1].state.finishedRows).toEqual([1]);
    engine.destroy();
    host.remove();
  });
});
