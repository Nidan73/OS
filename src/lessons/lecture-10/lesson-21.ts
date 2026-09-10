import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import {
  GraphEngine,
  type GraphEvent,
  type GraphInput,
  type GraphNodeInput,
  type GraphState
} from '../../engines/graph.js';
import {
  detectCycle,
  detectionAlgorithm,
  evaluateDetectionCadence,
  waitForGraph,
  type CadenceCost,
  type DetectionResult,
  type RagEdge,
  type RagGraph
} from '../../algorithms/deadlock.js';

// ─────────────────────────────────────────────────────────────────────────────
// L21 · Spotting a deadlock (ATLAS units 84–87, slides 34–41)
//
// ANALOGY: mechanism-fixed, the wait-for collapse and detection sweep are
// structurally dictated by graph theory and slide 39's matrices.
//
// LESSONS.md: L21, units 84–87. A traffic officer collapsing the map down to
// "who is blocking whom" and looking for a closed loop. Playground: run the
// detection sweep on the slide-39 snapshot, then add P2's request for one more
// C and watch the same system tip into deadlock.
//
// ATLAS rows (deck wording, kept for provenance):
// | 84 | The traffic officer collapses the map down to "who is blocking whom"
// |      and looks for a loop. Resources drop out; only the waiting matters.
// | 85 | The same ledger sweep as the safety check, but using what people are
// |      actually asking for right now instead of their declared ceilings.
// | 86 | Reclaim what P0 holds and everyone still finishes, until P2 asks for
// |      one more C, and the same system tips into deadlock.
// | 87 | How often should the officer check the roundabout? Check constantly
// |      and you burn the whole shift; check rarely and cars sit locked.
//
// SCENE: the same driveway L17 established and L19 kept, cars parked in
// behind one another in the building. Not a third deadlock scene; the guard's
// clipboard is the wait-for graph seen from above.
//
// ENGINE VERDICT (a): extend GraphEngine and use its render() unmodified.
// Why: unit 84 IS a graph collapse, assignment and request edges removed,
// waits-on edges added, and units 85/86 are the same driveway with instance
// counts, which GraphEngine already renders as dots. Overriding render() would
// reimplement identical interpolation.
//
// The carrying property of the morph is WHAT AN ARROW POINTS AT. In the
// driveway an arrow is a car: it points from the spot to the family holding
// its key, or from a family to the spot they are waiting on, and it is about
// vehicles. On the wait-for clipboard every arrow points family-to-family and
// the cars are gone, an arrow stops meaning a car and starts meaning "this
// household cannot leave until that one moves." Deadlock becomes a closed
// loop of neighbours, which is the only thing the officer needs to see.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A rule, applied from the start): each scenario is a complete
// event set, one beat per discrete mechanism event, no beat repeating a state
// with new words. `collapse` is 11 (four keys taken, three blocks formed, the
// ring verdict, the single collapse beat, the wait-for verdict, and the
// officer's read). `sweep-t0` and `sweep-t1` are one beat per detection probe
// plus the reclaim beats and the computed verdict, 12 and 11 respectively,
// because the t1 sweep stalls earlier and has fewer probes to run, not because
// beats were dropped. `cadence` is 6: the question, two sample cadences at
// each extreme, the crossover, and the verdict.

// ── Unit 84 · single-instance driveway (deck slides 34–35) ──

export const COLLAPSE_NODES: GraphNodeInput[] = [
  { id: 'H1', kind: 'process', label: 'Flat 1', analogyLabel: 'Flat 1', analogyX: 70, analogyY: 55 },
  { id: 'H2', kind: 'process', label: 'Flat 2', analogyLabel: 'Flat 2', analogyX: 610, analogyY: 55 },
  { id: 'H3', kind: 'process', label: 'Flat 3', analogyLabel: 'Flat 3', analogyX: 610, analogyY: 190 },
  { id: 'H4', kind: 'process', label: 'Flat 4', analogyLabel: 'Flat 4', analogyX: 70, analogyY: 190 },
  { id: 'S1', kind: 'resource', instances: 1, label: 'Spot A', analogyLabel: 'Spot A', analogyX: 300, analogyY: 45 },
  { id: 'S2', kind: 'resource', instances: 1, label: 'Spot B', analogyLabel: 'Spot B', analogyX: 420, analogyY: 120 },
  { id: 'S3', kind: 'resource', instances: 1, label: 'Spot C', analogyLabel: 'Spot C', analogyX: 300, analogyY: 200 }
];

/** Held keys, then the blocks that close the ring. Single instance each. */
const COLLAPSE_ASSIGN: RagEdge[] = [
  { from: 'S1', to: 'H1', kind: 'assignment' },
  { from: 'S2', to: 'H2', kind: 'assignment' },
  { from: 'S3', to: 'H3', kind: 'assignment' }
];
const COLLAPSE_REQUEST: RagEdge[] = [
  { from: 'H1', to: 'S2', kind: 'request' },
  { from: 'H2', to: 'S3', kind: 'request' },
  { from: 'H3', to: 'S1', kind: 'request' }
];

/** Wait-for arrows, computed by waitForGraph, never listed by hand. */
export function waitForEdges(nodes: GraphNodeInput[], edges: RagEdge[]): RagEdge[] {
  const graph: RagGraph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    })),
    edges
  };
  const waits = waitForGraph(graph);
  const out: RagEdge[] = [];
  for (const [waiter, blockers] of waits) {
    for (const blocker of blockers) {
      out.push({ from: waiter, to: blocker, kind: 'request' });
    }
  }
  return out;
}

/** Cycle path over whatever edge set is passed, detectCycle, not stored. */
export function ringOf(nodes: GraphNodeInput[], edges: RagEdge[]): string[] {
  const graph: RagGraph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    })),
    edges
  };
  return detectCycle(graph)[0] ?? [];
}

export function collapseEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const out: GraphEvent[] = [];
  const take = (caption: string, edge: RagEdge): void => {
    edges.push({ ...edge });
    out.push({ caption: caption.slice(0, 120), addEdge: { ...edge } });
  };

  take('Flat 1 parks in Spot A and keeps the key.', COLLAPSE_ASSIGN[0]);
  take('Flat 2 takes Spot B, the middle of the driveway.', COLLAPSE_ASSIGN[1]);
  take('Flat 3 takes Spot C, and the driveway is full.', COLLAPSE_ASSIGN[2]);
  take('Flat 1 now needs Spot B to get out. Flat 2 is in it.', COLLAPSE_REQUEST[0]);
  take('Flat 2 needs Spot C. Flat 3 is parked there.', COLLAPSE_REQUEST[1]);
  take('Flat 3 needs Spot A, which Flat 1 has not moved.', COLLAPSE_REQUEST[2]);

  const ring = ringOf(COLLAPSE_NODES, edges);
  out.push({
    caption:
      ring.length > 0
        ? `The map closes a ring: ${ring.join(' → ')}. Nobody can move first.`
        : 'No ring on the map, every car can still get out.',
    setCycle: ring
  });

  // The collapse: cars drop out, only the waiting is left (unit 84).
  const waits = waitForEdges(COLLAPSE_NODES, edges);
  out.push({
    caption: 'The resource-allocation graph collapses into a WAIT-FOR GRAPH: resource nodes are removed and an edge Pi to Pj means Pi is waiting on something Pj holds.', analogyCaption: 'The guard rubs out the spots and keeps only who waits on whom.',
    removeEdges: edges.map((e) => ({ from: e.from, to: e.to })),
    addEdges: waits,
    clearCycle: true
  } as GraphEvent);

  const waitRing = ringOf(COLLAPSE_NODES, waits);
  out.push({
    caption:
      waitRing.length > 0
        ? `Same ring, half the arrows: ${waitRing.join(' → ')}.`
        : 'No ring once the spots drop out.',
    setCycle: waitRing
  });
  out.push({
    caption: 'A process with no edges in the wait-for graph is waiting on nothing, so it cannot be part of a cycle.', analogyCaption: 'Flat 4 never parked, so no arrow touches it, it is not stuck.',
    activeNodes: ['H4']
  });
  out.push({
    caption: 'With one instance per resource, a cycle in the wait-for graph is necessary AND sufficient for deadlock, so detecting the cycle is the whole algorithm.', analogyCaption: 'One closed loop of neighbours is the whole thing the guard checks.',
    activeNodes: waitRing
  });
  return out;
}

// ── Units 85–86 · the multi-instance sweep (deck slides 36–40) ──

/** Deck slide 39: A(7), B(2), C(6) across five flats. */
export const SWEEP_TOTALS = [7, 2, 6];
export const SWEEP_ALLOCATION = [
  [0, 1, 0],
  [2, 0, 0],
  [3, 0, 3],
  [2, 1, 1],
  [0, 0, 2]
];
/** Slide 39 requests, the T0 snapshot. */
export const SWEEP_REQUEST_T0 = [
  [0, 0, 0],
  [2, 0, 2],
  [0, 0, 0],
  [1, 0, 0],
  [0, 0, 2]
];
/** Slide 40: P2 asks for one more C. Only that one cell differs. */
export const SWEEP_REQUEST_T1 = SWEEP_REQUEST_T0.map((row, i) =>
  i === 2 ? [0, 0, 1] : [...row]
);
export const SWEEP_AVAILABLE = SWEEP_TOTALS.map(
  (total, j) => total - SWEEP_ALLOCATION.reduce((sum, row) => sum + row[j], 0)
);
export const FLAT_NAMES = ['Flat 0', 'Flat 1', 'Flat 2', 'Flat 3', 'Flat 4'];
export const THING_NAMES = ['car', 'trolley', 'crate'];

export const SWEEP_NODES: GraphNodeInput[] = [
  ...FLAT_NAMES.map((label, i) => ({
    id: `P${i}`,
    kind: 'process' as const,
    label,
    analogyLabel: label,
    analogyX: 50 + i * 135,
    analogyY: 48
  })),
  ...THING_NAMES.map((label, j) => ({
    id: `R${j}`,
    kind: 'resource' as const,
    instances: SWEEP_TOTALS[j],
    label: `${label}s (${SWEEP_TOTALS[j]})`,
    analogyLabel: `${label}s`,
    analogyX: 120 + j * 240,
    analogyY: 190
  }))
];

export function sweepOf(request: number[][]): DetectionResult {
  return detectionAlgorithm(SWEEP_AVAILABLE, SWEEP_ALLOCATION, request);
}

/** Held-things edges, one per allocated unit, so width reads as holdings. */
function sweepAssignments(): RagEdge[] {
  const out: RagEdge[] = [];
  SWEEP_ALLOCATION.forEach((row, i) => {
    row.forEach((count, j) => {
      for (let k = 0; k < count; k++) out.push({ from: `R${j}`, to: `P${i}`, kind: 'assignment' });
    });
  });
  return out;
}

function sweepRequests(request: number[][]): RagEdge[] {
  const out: RagEdge[] = [];
  request.forEach((row, i) => {
    row.forEach((count, j) => {
      if (count > 0) out.push({ from: `P${i}`, to: `R${j}`, kind: 'request' });
    });
  });
  return out;
}

export function sweepEvents(request: number[][]): GraphEvent[] {
  const result = sweepOf(request);
  const out: GraphEvent[] = [];

  out.push({
    caption: `Nothing spare in the driveway: ${SWEEP_AVAILABLE.join('/')} free across ${THING_NAMES.join(', ')}.`,
    addEdges: [...sweepAssignments(), ...sweepRequests(request)]
  } as GraphEvent);

  // WHICH PROBE ACTUALLY RECLAIMS.
  // detectionAlgorithm scans P0→Pn every pass and takes the FIRST satisfiable
  // process, but it does not stop scanning, so several probes in one pass can
  // report satisfied while only one of them is reclaimed. Captioning every
  // satisfied probe as "it finishes" was the original defect. The pass split
  // below is derived from the pid sequence: a pass ends where the pid stops
  // increasing, because each new pass restarts the scan from the lowest
  // unfinished process.
  const isWinner: boolean[] = new Array(result.steps.length).fill(false);
  let stepIdx = 0;
  while (stepIdx < result.steps.length) {
    let winnerStep = -1;
    let passEnd = stepIdx;
    while (passEnd < result.steps.length) {
      const p = result.steps[passEnd];
      if (p.satisfied && winnerStep < 0) winnerStep = passEnd;
      passEnd++;
      if (passEnd < result.steps.length && result.steps[passEnd].pid <= p.pid) break;
    }
    if (winnerStep >= 0) isWinner[winnerStep] = true;
    stepIdx = passEnd;
  }

  // The reclaim order, in the order it happens. Every claim about "next" is
  // read off THIS, never off the pass a probe happened to fall in.
  const reclaimOrder = result.steps.filter((_, i) => isWinner[i]).map((p) => p.pid);

  /**
   * When this flat is actually reclaimed, relative to the probe being
   * captioned. Returns null if it never finishes, which is the deadlock case
   * and must not be described as finishing at all.
   */
  const finishesAfter = (pid: number): string | null => {
    const at = reclaimOrder.indexOf(pid);
    if (at <= 0) return null;
    return FLAT_NAMES[reclaimOrder[at - 1]];
  };

  // One beat per probe, the sweep IS the lesson (units 85, 86).
  let lastGranted = -1;
  result.steps.forEach((probe, si) => {
    const who = FLAT_NAMES[probe.pid];
    if (isWinner[si]) {
      lastGranted = probe.pid;
      out.push({
        caption: `${who} asks for nothing more than is free, it finishes and hands everything back.`,
        activeNodes: [`P${probe.pid}`]
      });
    } else if (probe.satisfied) {
      // It fits, but it is not the one reclaimed this pass. Say only what is
      // true: when it is actually reclaimed, read off the reclaim order, or
      // that it never is.
      const after = finishesAfter(probe.pid);
      out.push({
        caption: after
          ? `${who} fits too, but the sweep takes the first it finds, ${who} gets its turn after ${after}.`
          : `${who} fits too, but the sweep takes the first it finds, and it never gets a turn.`,
        activeNodes: [`P${probe.pid}`]
      });
    } else {
      const short = probe.cellOk
        .map((ok, j) => (ok ? null : THING_NAMES[j]))
        .filter(Boolean)
        .join(' and ');
      out.push({
        caption: `${who} still wants ${short} that nobody has returned, it waits.`,
        activeNodes: [`P${probe.pid}`]
      });
    }
  });

  const stuck = result.deadlocked.map((p) => FLAT_NAMES[Number(p.slice(1))]);
  out.push({
    caption:
      stuck.length === 0
        ? 'Every flat finished, the driveway clears on its own, no deadlock.'
        : `${stuck.join(', ')} never finish: deadlock, and the guard has found it.`,
    activeNodes: result.deadlocked.length > 0 ? result.deadlocked : [`P${lastGranted}`]
  });
  return out;
}

// ── Unit 87 · how often to check (deck slide 41) ──

export const CADENCE_SAMPLES = [2, 30];

export function cadenceOf(everyMinutes: number, deadlockedCount: number): CadenceCost {
  return evaluateDetectionCadence(
    everyMinutes,
    SWEEP_TOTALS.length,
    SWEEP_ALLOCATION.length,
    deadlockedCount
  );
}

export function cadenceEvents(deadlockedCount: number): GraphEvent[] {
  const tight = cadenceOf(CADENCE_SAMPLES[0], deadlockedCount);
  const loose = cadenceOf(CADENCE_SAMPLES[1], deadlockedCount);
  return [
    { caption: 'Detection has to be scheduled. Running it costs processor time, and not running it leaves processes blocked for longer.', analogyCaption: 'The guard has one shift. How often should he walk the driveway?' },
    {
      caption: `Every ${tight.everyMinutes} min: ${tight.sweepsPerHour} walks an hour, ${tight.detectionOpsPerHour} checks, the shift is spent walking.`
    },
    {
      caption: `Every ${loose.everyMinutes} min: only ${loose.sweepsPerHour} walks, but a jam sits ${loose.meanUndetectedMinutes} min unseen.`
    },
    {
      caption: `At ${loose.everyMinutes} min that is ${loose.blockedProcessMinutes} flat-minutes lost to waiting.`
    },
    {
      caption: tight.sweepDominates
        ? 'Walking constantly costs more than the jams it catches.'
        : 'Walking constantly still costs less than the jams it catches.'
    },
    {
      caption: 'Sweeping constantly burns the processor; sweeping rarely raises the mean time a deadlock goes undetected. The interval is a real cost decision, not a default.', analogyCaption: 'Neither end is free, the cadence is the trade, and you set it.'
    }
  ];
}

// ── Scenarios ──

export type Lesson21Scenario = 'collapse' | 'sweep-t0' | 'sweep-t1' | 'cadence';

export const SCENARIO_LABELS: Record<Lesson21Scenario, string> = {
  collapse: '🅿️ Who blocks whom',
  'sweep-t0': '📋 The snapshot',
  'sweep-t1': '🚗 One more crate',
  cadence: '⏱️ How often to check'
};

export function scenarioInput(scenario: Lesson21Scenario): GraphInput {
  if (scenario === 'collapse') {
    return {
      nodes: COLLAPSE_NODES,
      initialEdges: [],
      events: collapseEvents(),
      analogy: { domain: 'travel', title: 'The driveway at night' }
    };
  }
  if (scenario === 'cadence') {
    return {
      nodes: SWEEP_NODES,
      initialEdges: [...sweepAssignments(), ...sweepRequests(SWEEP_REQUEST_T1)],
      events: cadenceEvents(sweepOf(SWEEP_REQUEST_T1).deadlocked.length),
      analogy: { domain: 'travel', title: 'The guard’s round' }
    };
  }
  const request = scenario === 'sweep-t1' ? SWEEP_REQUEST_T1 : SWEEP_REQUEST_T0;
  return {
    nodes: SWEEP_NODES,
    initialEdges: [],
    events: sweepEvents(request),
    analogy: { domain: 'travel', title: 'The guard’s clipboard' }
  };
}

interface Lesson21Event extends GraphEvent {
  addEdges?: RagEdge[];
  removeEdges?: { from: string; to: string }[];
}

export class Lesson21GraphEngine extends GraphEngine implements PlaygroundCapable {
  private scenario: Lesson21Scenario = 'collapse';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  /** Batched edge support, a collapse moves many arrows in one motion. */
  protected override buildSteps(input: GraphInput): Step<GraphState>[] {
    if (!input.nodes || input.nodes.length === 0) {
      throw new Error('GraphEngine: input.nodes must not be empty');
    }
    const events = (input.events ?? []) as Lesson21Event[];
    const edges: RagEdge[] = (input.initialEdges ?? []).map((e) => ({ ...e }));
    let cycleIds: string[] = [];
    const steps: Step<GraphState>[] = [];
    let t = 0;

    const snapshot = (caption: string, highlight: string[]): Step<GraphState> => ({
      t: t++,
      caption: caption.slice(0, 120),
      highlight,
      state: {
        edges: edges.map((e) => ({ ...e })),
        cycleIds: [...cycleIds],
        activeNodeIds: highlight
      }
    });

    steps.push(snapshot('The driveway before anyone parks.', []));

    for (const ev of events) {
      if (ev.addEdge) edges.push({ ...ev.addEdge });
      for (const e of ev.addEdges ?? []) edges.push({ ...e });
      for (const r of ev.removeEdges ?? []) {
        const idx = edges.findIndex((e) => e.from === r.from && e.to === r.to);
        if (idx >= 0) edges.splice(idx, 1);
      }
      if (ev.clearCycle) cycleIds = [];
      if (ev.setCycle) cycleIds = [...ev.setCycle];
      steps.push(snapshot(ev.caption, ev.activeNodes ?? []));
    }
    return steps;
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Run the check, then add one more request</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson21Scenario[])
            .map(
              (id) => `
            <button type="button" class="l21-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `
            )
            .join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Every verdict, ring and cost below is computed, the wait-for collapse, the detection sweep, the cadence trade.</div>
    `;
    host.querySelectorAll('.l21-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson21Scenario);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.paintScoreboard());
    this.paintScoreboard();
  }

  private applyScenario(id: Lesson21Scenario): void {
    if (!id || id === this.scenario) return;
    this.scenario = id;
    this.input = scenarioInput(id);
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.paintScoreboard();
  }

  private paintScoreboard(): void {
    const host = this.scoreboardHost;
    if (!host) return;
    const verdict = this.currentVerdict();
    const tone = verdict.stuck ? 'var(--waiting)' : 'var(--running)';
    host.innerHTML = `
      <div style="display: flex; gap: calc(var(--step) * 2); flex-wrap: wrap; align-items: baseline;">
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Verdict</div>
          <div style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: ${tone};">${verdict.label}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">${verdict.detailLabel}</div>
          <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--ink);">${verdict.detail}</div>
        </div>
      </div>
    `;
  }

  private currentVerdict(): { label: string; detail: string; detailLabel: string; stuck: boolean } {
    if (this.scenario === 'collapse') {
      const state = this.currentState();
      const ring = ringOf(COLLAPSE_NODES, state.edges);
      return {
        label: ring.length > 0 ? 'Ring closed' : 'No ring',
        detail: ring.length > 0 ? ring.join(' → ') : 'every car can still get out',
        detailLabel: 'Loop',
        stuck: ring.length > 0
      };
    }
    if (this.scenario === 'cadence') {
      const stuckCount = sweepOf(SWEEP_REQUEST_T1).deadlocked.length;
      const loose = cadenceOf(CADENCE_SAMPLES[1], stuckCount);
      return {
        label: `${loose.blockedProcessMinutes} flat-minutes lost`,
        detail: `${loose.detectionOpsPerHour} checks/hour at ${loose.everyMinutes} min`,
        detailLabel: 'Cost of waiting',
        stuck: false
      };
    }
    const request = this.scenario === 'sweep-t1' ? SWEEP_REQUEST_T1 : SWEEP_REQUEST_T0;
    const result = sweepOf(request);
    const stuck = result.deadlocked.map((p) => FLAT_NAMES[Number(p.slice(1))]);
    return {
      label: stuck.length === 0 ? 'Everyone finishes' : 'Deadlock',
      detail: stuck.length === 0 ? 'the driveway clears itself' : stuck.join(', '),
      detailLabel: stuck.length === 0 ? 'Outcome' : 'Never finish',
      stuck: stuck.length > 0
    };
  }

  private currentState(): GraphState {
    const steps = this.getSteps() as Step<GraphState>[];
    return steps[this.getCurrentIndex()].state;
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson21Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getVerdict: () => this.currentVerdict(),
      getDeadlocked: () =>
        this.scenario.startsWith('sweep')
          ? sweepOf(this.scenario === 'sweep-t1' ? SWEEP_REQUEST_T1 : SWEEP_REQUEST_T0).deadlocked
          : []
    };
  }
}

export const lesson21Input: GraphInput = scenarioInput('collapse');

export const lesson21: Lesson<GraphInput, GraphState> = {
  id: 21,
  lecture: 10,
  slug: 'lesson-21',
  title: 'Spotting a deadlock',
  absorbsUnits: [84, 85, 86, 87],
  slides: 'slides 34–41',
  engine: 'graph',
  engineClass: Lesson21GraphEngine,
  lensLabels: {
    analogy: '🅿️ The driveway at night',
    mechanism: '🕸️ The wait-for graph',
    analogyTitle: 'View as the guard walking the blocked-in driveway',
    mechanismTitle: 'View as the wait-for graph and the detection sweep'
  },
  analogy: {
    domain: 'travel',
    text: 
      'Kabir chacha does not know which cars are deadlocked. He knows something is wrong, because three families have come down and none of them have left.\n\n' +
      'So he walks the driveway with his register and stops recording cars altogether. He writes only pairs: this family cannot leave until that family moves. Nothing about number plates, nothing about which spot, just who is waiting on whom.\n\n' +
      'Then he looks for a loop in what he wrote, and if he finds one he has proof.\n\n' +
      'That works when every spot holds one car. When there are several of a thing, a loop is not proof any more, and he has to do something slower: go through the list again and again, each time asking whether anybody can finish with what is currently free, and giving back what they were holding when they do. Whoever is still on the list when he stops making progress is genuinely stuck.\n\n' +
      'And there is a real question underneath all this, which is how often he should be walking the driveway at all.'
  },
  concept:
    'Detection lets the system enter deadlock and then finds it. With one instance of each resource, collapse the resource-allocation graph into a wait-for graph, resources drop out, and an edge means one process is waiting on another; a cycle is then conclusive. With several instances a cycle is not enough, so the same sweep the safety check uses runs again, except it compares what each process is actually requesting now instead of its declared ceiling. Whatever is still unfinished when the sweep stalls is deadlocked. How often to run it is a real cost: sweeping constantly burns the processor, sweeping rarely leaves processes blocked for longer.',
  morphReveals:
    'In the driveway an arrow is a car: it runs from a spot to the family holding its key, or from a family to the spot they are waiting on. On the wait-for graph the spots are rubbed out and every arrow points family to family, an arrow stops meaning a car and starts meaning "this household cannot leave until that one moves." The ring survives the rubbing out, which is why the guard only needs the loop.',
  morphMode: 'morph',
  analogyMapping: [
    'Parking spot ➔ resource node, one dot per instance',
    'Holding a spot key ➔ assignment edge, resource to process',
    'Waiting on a spot ➔ request edge, process to resource',
    'The guard rubbing out the spots ➔ the wait-for collapse',
    'A closed loop of neighbours ➔ a cycle in the wait-for graph',
    'One more crate requested ➔ slide 40, the same system tipping into deadlock',
    'How often to walk the driveway ➔ detection cadence and its cost'
  ],
  input: lesson21Input
};

export default lesson21;
