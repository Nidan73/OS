import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import {
  GraphEngine,
  type GraphEvent,
  type GraphInput,
  type GraphNodeInput,
  type GraphState
} from '../../engines/graph.js';
import {
  detectCycle,
  isDeadlock,
  type RagEdge,
  type RagGraph
} from '../../algorithms/deadlock.js';

// ─────────────────────────────────────────────────────────────────────────────
// L17 · Seeing it as a graph (ATLAS units 69–71, slides 8–12)
//
// LESSONS.md (verbatim): "**L17 · Seeing it as a graph** — units 69–71.
// Analogy: a map of who holds which car key. Playground: draw edges and watch
// cycle detection fire — including the cycle that is *not* a deadlock because
// spare instances exist."
//
// ATLAS rows (verbatim):
// | 69 | `graph` | Resource-Allocation Graph | slides 8–9 | travel | A map of
// |    |         |                           |            |        | who's
// |    |         |                           |            |        | holding
// |    |         |                           |            |        | which car
// |    |         |                           |            |        | key and
// |    |         |                           |            |        | who's
// |    |         |                           |            |        | waiting on
// |    |         |                           |            |        | it. Request
// |    |         |                           |            |        | edges point
// |    |         |                           |            |        | one way,
// |    |         |                           |            |        | assignment
// |    |         |                           |            |        | edges the
// |    |         |                           |            |        | other. |
// | 70 | `graph` | A Graph With a Deadlock | slide 10 | travel | The cycle
// |    |         |                         |          |        | lights up on
// |    |         |                         |          |        | the map as you
// |    |         |                         |          |        | trace it.
// |    |         |                         |          |        | Single instance
// |    |         |                         |          |        | per resource
// |    |         |                         |          |        | type, so the
// |    |         |                         |          |        | cycle is
// |    |         |                         |          |        | conclusive. |
// | 71 | `graph` | A Cycle With No Deadlock | slides 11–12 | travel | The same
// |    |         |                          |              |        | ring, but
// |    |         |                          |              |        | there are
// |    |         |                          |              |        | two spare
// |    |         |                          |              |        | cars in
// |    |         |                          |              |        | the lot —
// |    |         |                          |              |        | someone
// |    |         |                          |              |        | finishes,
// |    |         |                          |              |        | releases,
// |    |         |                          |              |        | and the
// |    |         |                          |              |        | ring
// |    |         |                          |              |        | dissolves.
// |    |         |                          |              |        | Cycles are
// |    |         |                          |              |        | necessary,
// |    |         |                          |              |        | not
// |    |         |                          |              |        | sufficient. |
//
// ENGINE VERDICT (a): extend GraphEngine and use its render() unmodified.
// Why: the lesson IS a resource-allocation graph built edge by edge — exactly
// what GraphEngine renders (bipartite nodes, request vs assignment edges,
// cycle highlight, [id^="bar-*"] widths computed from instances and holdings).
// Overriding render() would reimplement identical interpolation for no gain.
//
// The carrying property of the morph is WIDTH (and with it, x-position). In
// the lot every driver and car takes the same space — position is just where
// they parked. On the graph width stops meaning a body and starts meaning
// holdings: a lot is as wide as its keys, a driver as wide as what they hold.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A rule, applied from the start): 16 steps — the idle frame,
// four takes (one per key claimed), two asks (one per waiter), the ring
// verdict, the T2 release and the break it causes, the granted take plus the
// withdrawn ask (a satisfied request is fulfilled, not left pending — leaving
// it would re-ring and contradict the computed verdict), the T4 release with
// its withdrawn ask and granted take, and the closing verdict. No beat repeats
// a state with new words: each moves edges (claim, wait, release, satisfy) or
// names the computed verdict. The deadlock and chain alternates are shorter
// (8 each) because their graphs are smaller — complete event sets, not cuts.

export type Lesson17Scenario = 'spare' | 'deadlock' | 'chain';

const SPARE_NODES: GraphNodeInput[] = [
  { id: 'T1', kind: 'process', label: 'T1', analogyLabel: 'Driver A' },
  { id: 'T2', kind: 'process', label: 'T2', analogyLabel: 'Driver B' },
  { id: 'T3', kind: 'process', label: 'T3', analogyLabel: 'Driver C' },
  { id: 'T4', kind: 'process', label: 'T4', analogyLabel: 'Driver D' },
  { id: 'R1', kind: 'resource', instances: 2, label: 'R1 · 2', analogyLabel: 'Lot R1' },
  { id: 'R2', kind: 'resource', instances: 2, label: 'R2 · 2', analogyLabel: 'Lot R2' }
];

const DEADLOCK_NODES: GraphNodeInput[] = [
  { id: 'T1', kind: 'process', label: 'T1', analogyLabel: 'Driver A' },
  { id: 'T2', kind: 'process', label: 'T2', analogyLabel: 'Driver B' },
  { id: 'T3', kind: 'process', label: 'T3', analogyLabel: 'Driver C' },
  { id: 'R1', kind: 'resource', instances: 1, label: 'R1 · 1', analogyLabel: 'Car R1' },
  { id: 'R2', kind: 'resource', instances: 1, label: 'R2 · 1', analogyLabel: 'Car R2' },
  { id: 'R3', kind: 'resource', instances: 1, label: 'R3 · 1', analogyLabel: 'Car R3' }
];

const CHAIN_NODES: GraphNodeInput[] = [
  { id: 'T1', kind: 'process', label: 'T1', analogyLabel: 'Driver A' },
  { id: 'T2', kind: 'process', label: 'T2', analogyLabel: 'Driver B' },
  { id: 'T3', kind: 'process', label: 'T3', analogyLabel: 'Driver C' },
  { id: 'R1', kind: 'resource', instances: 1, label: 'R1 · 1', analogyLabel: 'Car R1' },
  { id: 'R2', kind: 'resource', instances: 2, label: 'R2 · 2', analogyLabel: 'Lot R2' },
  { id: 'R3', kind: 'resource', instances: 1, label: 'R3 · 1', analogyLabel: 'Car R3' }
];

export const SCENARIO_NODES: Record<Lesson17Scenario, GraphNodeInput[]> = {
  spare: SPARE_NODES,
  deadlock: DEADLOCK_NODES,
  chain: CHAIN_NODES
};

function ragOf(nodes: GraphNodeInput[], edges: RagEdge[]): RagGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    })),
    edges: edges.map((e) => ({ ...e }))
  };
}

/** Verdict caption, branched on the computed isDeadlock — never typed. */
function ringCaption(nodes: GraphNodeInput[], edges: RagEdge[]): string {
  const v = isDeadlock(ragOf(nodes, edges));
  if (v.deadlocked) {
    return `Ring closes and nobody can move — deadlock. Each waits on the next.`.slice(0, 120);
  }
  return `Ring on the map — but T2 and T4 wait on nothing, so nobody is stuck.`.slice(0, 120);
}

function ringCycle(nodes: GraphNodeInput[], edges: RagEdge[]): string[] {
  const cycles = detectCycle(ragOf(nodes, edges));
  return cycles.length > 0 ? [...cycles[0]] : [];
}

/**
 * The spare story (unit 71, the lesson): a ring closes around two lots with
 * two keys each — then the off-ring holders finish, release, and the ring
 * dissolves. Cycle highlights and verdict captions fall out of detectCycle /
 * isDeadlock run on the edge prefix, not out of stored answers.
 */
export function spareEvents(): GraphEvent[] {
  const nodes = SPARE_NODES;
  const edges: RagEdge[] = [];
  const take = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const out: GraphEvent[] = [
    take('T2 takes a key from lot R1 — one of two.', { from: 'R1', to: 'T2', kind: 'assignment' }),
    take('T3 takes the second R1 key — the lot is empty.', { from: 'R1', to: 'T3', kind: 'assignment' }),
    take('T1 takes a key from lot R2 — one of two.', { from: 'R2', to: 'T1', kind: 'assignment' }),
    take('T4 takes the second R2 key — both lots empty.', { from: 'R2', to: 'T4', kind: 'assignment' }),
    take('T1 asks lot R1 for a key — both are out.', { from: 'T1', to: 'R1', kind: 'request' }),
    take('T3 asks lot R2 — both out. The ring closes.', { from: 'T3', to: 'R2', kind: 'request' })
  ];
  out.push({ caption: ringCaption(nodes, edges), setCycle: ringCycle(nodes, edges) });
  const rel1 = { from: 'R1', to: 'T2' };
  edges.splice(edges.findIndex((e) => e.from === rel1.from && e.to === rel1.to), 1);
  out.push({
    caption: 'T2 finishes its trip and returns the R1 key.'.slice(0, 120),
    removeEdge: { ...rel1 }
  });
  out.push({ caption: 'The ring breaks — R1 has a free key, T1 can move.'.slice(0, 120), clearCycle: true });
  const grant1 = { from: 'R1', to: 'T1', kind: 'assignment' as const };
  edges.push({ ...grant1 });
  out.push({ caption: 'T1 takes the freed R1 key.'.slice(0, 120), addEdge: { ...grant1 } });
  const rel2 = { from: 'R2', to: 'T4' };
  edges.splice(edges.findIndex((e) => e.from === rel2.from && e.to === rel2.to), 1);
  out.push({
    caption: 'T4 finishes and returns its R2 key.'.slice(0, 120),
    removeEdge: { ...rel2 }
  });
  const req2 = { from: 'T3', to: 'R2', kind: 'request' as const };
  edges.splice(edges.findIndex((e) => e.from === req2.from && e.to === req2.to), 1);
  out.push({
    caption: 'With a key free, the R2 wait is over — T3 stops asking.'.slice(0, 120),
    removeEdge: { from: req2.from, to: req2.to }
  });
  const grant2 = { from: 'R2', to: 'T3', kind: 'assignment' as const };
  edges.push({ ...grant2 });
  out.push({ caption: 'T3 takes the freed R2 key.'.slice(0, 120), addEdge: { ...grant2 } });
  const req1 = { from: 'T1', to: 'R1', kind: 'request' as const };
  edges.splice(edges.findIndex((e) => e.from === req1.from && e.to === req1.to), 1);
  out.push({
    caption: 'T1 stops asking too — the freed key answered it.'.slice(0, 120),
    removeEdge: { from: req1.from, to: req1.to }
  });
  out.push({
    caption: 'Everyone finishes — the ring dissolved. A cycle is not a deadlock.'.slice(0, 120),
    clearCycle: true
  });
  return out;
}

/** The conclusive ring (unit 70): single instance per type, nobody can leave. */
export function deadlockEvents(): GraphEvent[] {
  const nodes = DEADLOCK_NODES;
  const edges: RagEdge[] = [];
  const take = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const out: GraphEvent[] = [
    take('T2 takes the only R1 key.', { from: 'R1', to: 'T2', kind: 'assignment' }),
    take('T3 takes the only R2 key.', { from: 'R2', to: 'T3', kind: 'assignment' }),
    take('T1 takes the only R3 key.', { from: 'R3', to: 'T1', kind: 'assignment' }),
    take('T1 asks R1 — T2 holds it.', { from: 'T1', to: 'R1', kind: 'request' }),
    take('T2 asks R2 — T3 holds it.', { from: 'T2', to: 'R2', kind: 'request' }),
    take('T3 asks R3 — T1 holds it. The ring closes.', { from: 'T3', to: 'R3', kind: 'request' })
  ];
  out.push({ caption: ringCaption(nodes, edges), setCycle: ringCycle(nodes, edges) });
  return out;
}

/** The open chain (unit 69): requests without a ring. */
export function chainEvents(): GraphEvent[] {
  const take = (caption: string, edge: RagEdge): GraphEvent => ({
    caption: caption.slice(0, 120),
    addEdge: { ...edge }
  });
  return [
    take('T1 takes an R2 key.', { from: 'R2', to: 'T1', kind: 'assignment' }),
    take('T1 asks R1.', { from: 'T1', to: 'R1', kind: 'request' }),
    take('T2 holds the R1 key.', { from: 'R1', to: 'T2', kind: 'assignment' }),
    take('T2 takes the second R2 key.', { from: 'R2', to: 'T2', kind: 'assignment' }),
    take('T2 asks R3.', { from: 'T2', to: 'R3', kind: 'request' }),
    take('T3 holds the R3 key.', { from: 'R3', to: 'T3', kind: 'assignment' }),
    { caption: 'No ring on the map — a chain waits, but nobody waits in a circle.'.slice(0, 120) }
  ];
}

export function scenarioEvents(id: Lesson17Scenario): GraphEvent[] {
  switch (id) {
    case 'deadlock':
      return deadlockEvents();
    case 'chain':
      return chainEvents();
    default:
      return spareEvents();
  }
}

export function scenarioInput(id: Lesson17Scenario): GraphInput {
  return {
    nodes: SCENARIO_NODES[id].map((n) => ({ ...n })),
    initialEdges: [],
    events: scenarioEvents(id),
    analogy: { domain: 'travel', title: 'Car lots and keys' }
  };
}

/** The RAG behind any step state — what the scoreboard verdict computes from. */
export function ragOfState(scenario: Lesson17Scenario, state: GraphState): RagGraph {
  return ragOf(SCENARIO_NODES[scenario], state.edges);
}

const SCENARIO_LABELS: Record<Lesson17Scenario, string> = {
  spare: '🔑 Spare keys (cycle, no deadlock)',
  deadlock: '🔴 No spare (deadlock)',
  chain: '⛓️ Open chain (no cycle)'
};

/**
 * Lesson 17's engine, scoped to this lesson. Uses GraphEngine.render()
 * unchanged — the lesson adds the deadlock story: scenario scripts whose
 * verdicts and cycle highlights fall out of isDeadlock/detectCycle, and a
 * playground that reaches a deadlock, a free cycle, and an open chain.
 */
export class Lesson17GraphEngine extends GraphEngine implements PlaygroundCapable {
  private scenario: Lesson17Scenario = 'spare';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson17Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getVerdict: () => isDeadlock(ragOfState(this.scenario, this.getSteps()[this.getCurrentIndex()].state))
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Draw the map three ways — only one gets stuck</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson17Scenario[]).map((id) => `
            <button type="button" class="l17-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Scrub edge by edge: each arrow is one take, one ask, or one return. The ring verdict is computed, not drawn.</div>
    `;
    host.querySelectorAll('.l17-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson17Scenario);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.renderScoreboard());
    this.renderScoreboard();
  }

  private applyScenario(id: Lesson17Scenario): void {
    this.scenario = id;
    this.input.nodes = SCENARIO_NODES[id].map((n) => ({ ...n }));
    this.input.initialEdges = [];
    this.setEvents(scenarioEvents(id));
    const host = this.container.closest('.unit-center-col')?.querySelector('#playground');
    if (host) this.renderPlayground(host as HTMLElement, this.scoreboardHost ?? undefined);
    else this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const steps = this.getSteps();
    const state = steps[this.getCurrentIndex()]?.state;
    const finalState = steps[steps.length - 1]?.state;
    if (!state || !finalState) return;
    const now = isDeadlock(ragOfState(this.scenario, state));
    const end = isDeadlock(ragOfState(this.scenario, finalState));
    const badge = (v: { deadlocked: boolean; cycles: string[][] }): string => {
      if (v.deadlocked) {
        return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);">🔴 Stuck — nobody can move</div>`;
      }
      if (v.cycles.length > 0) {
        return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(0, 102, 204, 0.08); color: var(--accent); border: 1px solid var(--accent);">🔵 Ring — but someone can still finish</div>`;
      }
      return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);">🟢 No ring — nobody waits in a circle</div>`;
    };
    const fmtCycle = (v: { cycles: string[][] }): string =>
      v.cycles.length > 0 ? v.cycles[0].join(' → ') : '—';
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Ring check · ${SCENARIO_LABELS[this.scenario]}</h3>
        ${badge(end)}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Right now</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: ${now.deadlocked ? 'var(--waiting)' : 'var(--ink)'};">${now.deadlocked ? `stuck: ${now.deadlockedProcesses.join(', ')}` : now.cycles.length > 0 ? 'ring, not stuck' : 'no ring'}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">step ${this.getCurrentIndex() + 1} of ${steps.length}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">This map ends</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: ${end.deadlocked ? 'var(--waiting)' : 'var(--running)'};">${end.deadlocked ? `deadlock: ${end.deadlockedProcesses.join(', ')}` : end.cycles.length > 0 ? 'ring dissolves' : 'chain, never stuck'}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">computed from the edges</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Ring on the map</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px;">${fmtCycle(end)}</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson17Input: GraphInput = scenarioInput('spare');

export const lesson17: Lesson<GraphInput, GraphState> = {
  id: 17,
  lecture: 10,
  slug: 'lesson-17',
  title: 'Seeing it as a graph',
  absorbsUnits: [69, 70, 71],
  slides: 'slides 8–12',
  engine: 'graph',
  engineClass: Lesson17GraphEngine,
  lensLabels: {
    analogy: '🚗 Car lots and keys',
    mechanism: '🕸️ Allocation graph',
    analogyTitle: 'View as drivers sharing two car lots',
    mechanismTitle: 'View as the resource-allocation graph'
  },
  analogy: {
    domain: 'travel',
    text: 'Drivers share two small car lots. Each driver holds keys and waits on cars across the lot — the map draws who holds which key, with request arrows pointing one way and assignment arrows the other.'
  },
  concept:
    'A resource-allocation graph draws processes and resource types as nodes: a request edge points from a waiter to a resource, an assignment edge from a resource to its holder. A deadlock needs a cycle — each process waiting on the next in a ring. But a cycle alone is not enough: if some holder on the ring waits on nothing, it finishes and the ring dissolves. Only a ring nobody can leave is a deadlock.',
  morphReveals:
    'In the lot every driver and every car takes the same space — position is just where they parked. On the graph width stops meaning a body and starts meaning holdings: a lot is as wide as its keys, a driver as wide as what they hold — so the stuck ring reads wide all round while a freed lot narrows.',
  morphMode: 'morph',
  analogyMapping: [
    'Driver ➔ process node',
    'Car lot ➔ resource node, one dot per key',
    'Waiting on a car ➔ request edge, driver to lot',
    'Holding a key ➔ assignment edge, lot to driver',
    'Everyone waiting in a ring ➔ a cycle on the map',
    'A ring nobody can leave ➔ deadlock; a ring someone finishes ➔ it dissolves'
  ],
  input: lesson17Input
};

export default lesson17;
