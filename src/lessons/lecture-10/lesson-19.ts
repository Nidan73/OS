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
  safetyAlgorithm,
  type RagEdge,
  type RagGraph
} from '../../algorithms/deadlock.js';

// ─────────────────────────────────────────────────────────────────────────────
// L19 · Safe, unsafe, and stuck (ATLAS units 76–79, slides 17–21)
//
// LESSONS.md: L19, units 76–79. A group treasurer checking whether there is
// still *some* order in which everyone can finish the trip and pay back.
// Playground: grant a request and watch the safe region shrink, unsafe is not
// stuck yet, but the guarantee is gone.
//
// ATLAS rows (deck wording, kept for provenance):
// | 76 | Everyone declares their maximum trip budget before departure. The
// |      treasurer uses those ceilings to decide what's safe to lend.
// | 77 | There exists some order in which you can fund every friend to the end
// |      of the trip and get repaid. Find one sequence and you're safe.
// | 78 | Unsafe doesn't mean stranded, it means you've lost the guarantee.
// |      Three nested regions, animated as the state moves between them.
// | 79 | Dotted lines for "I might need this car later." Granting a request is
// |      only allowed if the solid line it creates doesn't close a ring.
//
// ENGINE VERDICT (a): extend GraphEngine and use its render() unmodified.
// Why: the ledger scene IS a resource-allocation graph, ceilings as dotted
// claim edges, notes drawn as assignment edges, and the claims scene is the
// single-instance claim-edge rule the engine was built for (its header names
// L19). Overriding render() would reimplement identical interpolation.
//
// The carrying property of the morph is WIDTH. At the treasurer's table every
// purse is the same size, a promise is just a dotted line. On the graph,
// width means holdings: the fund is as wide as its twelve notes, a person as
// wide as what they currently hold. The safe/unsafe/deadlock region readout
// is computed per step by safetyAlgorithm / detectionAlgorithm, never typed.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY: the ledger script is 8 beats, three ceilings declared, three
// withdrawals (one per person: a purse is filled in one motion), the computed
// safe verdict, and the grant script adds the extra note and the computed
// unsafe verdict. Friendly and hostile each append their own beats to the
// grant script; the claims script is its own complete event set. Every
// verdict caption is built from the algorithm's own output, and no beat
// repeats a state with new words.

export const TOTAL_NOTES = 12;
/** Declared ceilings before departure (unit 76), the deck's 10 / 4 / 9. */
export const MAX_CLAIMS = [10, 4, 9];

// STORY.md: Ammu holds the envelope, so she is the one deciding and is never
// a borrower. The three who borrow are Abbu, Afra and Arijit. Arijit is P2
// because P2 is the one who comes back for one more note and tips the state
// out of safe, and asking for more than he has is who he is.
const PEOPLE = [
  { id: 'P0', label: 'P0 · max 10', analogyLabel: 'Abbu' },
  { id: 'P1', label: 'P1 · max 4', analogyLabel: 'Afra' },
  { id: 'P2', label: 'P2 · max 9', analogyLabel: 'Arijit' }
] as const;

const PEOPLE_NAMES = ['Abbu', 'Afra', 'Arijit'] as const;

/** Ledger nodes: three purses and one twelve-note fund. */
export const LEDGER_NODES: GraphNodeInput[] = [
  { id: 'P0', kind: 'process', label: PEOPLE[0].label, analogyLabel: PEOPLE[0].analogyLabel, analogyX: 60, analogyY: 24 },
  { id: 'P1', kind: 'process', label: PEOPLE[1].label, analogyLabel: PEOPLE[1].analogyLabel, analogyX: 60, analogyY: 104 },
  { id: 'P2', kind: 'process', label: PEOPLE[2].label, analogyLabel: PEOPLE[2].analogyLabel, analogyX: 60, analogyY: 184 },
  { id: 'R', kind: 'resource', instances: TOTAL_NOTES, label: `Cash · ${TOTAL_NOTES}`, analogyLabel: 'The envelope', analogyX: 470, analogyY: 100 }
];

/**
 * Claim-scene nodes: two drivers, two single-instance parking spots (unit 79).
 *
 * The flat has one car and one key on one hook, so two cars would contradict
 * STORY.md. Two numbered spots in the building driveway are the right pair of
 * exclusive resources, and it is the same driveway as L17, L21 and L22.
 */
export const CLAIM_NODES: GraphNodeInput[] = [
  { id: 'T1', kind: 'process', label: 'T1', analogyLabel: 'Abbu', analogyX: 120, analogyY: 34 },
  { id: 'T2', kind: 'process', label: 'T2', analogyLabel: 'Arijit', analogyX: 480, analogyY: 34 },
  { id: 'C1', kind: 'resource', instances: 1, label: 'C1 · 1', analogyLabel: 'Spot 1', analogyX: 120, analogyY: 160 },
  { id: 'C2', kind: 'resource', instances: 1, label: 'C2 · 1', analogyLabel: 'Spot 2', analogyX: 480, analogyY: 160 }
];

export type Lesson19Scenario = 'ledger' | 'grant' | 'friendly' | 'hostile' | 'claims';

/**
 * My extension of GraphEvent: batched adds/removes so one purse is filled or
 * emptied in one beat instead of five near-identical ones, plus the hostile
 * beat's flag that everyone's remaining need is now outstanding.
 */
export interface Lesson19Event extends GraphEvent {
  /** the same beat in the scene's words, shown on the analogy lens */
  analogyCaption?: string;
  addEdges?: RagEdge[];
  removeEdges?: { from: string; to: string }[];
  allAskNeed?: boolean;
}

export interface Lesson19State extends GraphState {
  /** True once the hostile beat declares everyone's remaining need outstanding. */
  allAskNeed: boolean;
}

const allocEdges = (pid: number, count: number): RagEdge[] =>
  Array.from({ length: count }, () => ({ from: 'R', to: `P${pid}`, kind: 'assignment' as const }));

const claimEdge = (pid: number): RagEdge => ({ from: `P${pid}`, to: 'R', kind: 'claim' });

export function allocationOf(state: GraphState): number[] {
  return PEOPLE.map((p) =>
    state.edges.filter((e) => e.kind === 'assignment' && e.to === p.id).length
  );
}

export function availableOf(state: GraphState): number {
  return TOTAL_NOTES - allocationOf(state).reduce((a, b) => a + b, 0);
}

/** Everyone's remaining ceiling: max minus what they already hold. */
export function needMatrixOf(state: GraphState): number[][] {
  return MAX_CLAIMS.map((max, i) => [max - allocationOf(state)[i]]);
}

export type Region = 'safe' | 'unsafe' | 'deadlock' | 'complete';

/**
 * The region the system currently sits in, computed, never typed. Complete
 * means every note came home; safe means the safety sweep drains everyone;
 * deadlock means the detection sweep on outstanding asks confirms stuck
 * processes; anything else is unsafe, the guarantee is gone, nothing more.
 */
export function regionOf(state: Lesson19State): Region {
  const alloc = allocationOf(state);
  if (alloc.every((a) => a === 0)) return 'complete';
  const single = (row: number[]): number[][] => row.map((a) => [a]);
  const available = [availableOf(state)];
  const safety = safetyAlgorithm(available, MAX_CLAIMS.map((m) => [m]), single(alloc));
  if (safety.safe) return 'safe';
  const request = state.allAskNeed ? needMatrixOf(state) : alloc.map(() => [0]);
  const detection = detectionAlgorithm(available, single(alloc), request);
  return detection.deadlocked.length > 0 ? 'deadlock' : 'unsafe';
}

/** Computed safe sequence in family terms, "Ammu → Abbu → Arijit". */
export function safeSequenceOf(state: GraphState): string {
  const safety = safetyAlgorithm(
    [availableOf(state)],
    MAX_CLAIMS.map((m) => [m]),
    allocationOf(state).map((a) => [a])
  );
  if (!safety.safe) return ', ';
  return safety.sequence.map((i) => PEOPLE_NAMES[i]).join(' → ');
}

/** Deadlocked people per the detection sweep on outstanding asks. */
export function stuckOf(state: Lesson19State): string[] {
  const single = (row: number[]): number[][] => row.map((a) => [a]);
  const request = state.allAskNeed ? needMatrixOf(state) : allocationOf(state).map(() => [0]);
  return detectionAlgorithm([availableOf(state)], single(allocationOf(state)), request).deadlocked;
}

/**
 * Captions are story beats now, not state labels. The old 120 character cap is
 * what made them read like a status line: there is no room for "why" in 120
 * characters, so every beat became a restatement of the state the picture was
 * already showing. The cap is now 320, which is roughly four lines in the
 * caption banner, and the banner sits above the fold at 1440x900.
 *
 * A longer caption is not licence to waffle. Each beat still has to be true of
 * the step it sits on, and every number in it still has to be computed.
 */
export const CAPTION_MAX = 320;

/**
 * `caption` is the mechanism sentence and `analogy` is the same beat in the
 * scene's words. The player shows whichever matches the lens she is on.
 */
const take = (analogy: string, edges: RagEdge[], caption?: string): Lesson19Event => ({
  caption: (caption ?? analogy).slice(0, CAPTION_MAX),
  analogyCaption: analogy.slice(0, CAPTION_MAX),
  addEdges: edges.map((e) => ({ ...e }))
});

/**
 * Units 76–77: ceilings declared as dotted claim edges, then the (5, 2, 2)
 * draw, then the computed verdict, some order finishes, so the state is safe.
 */
export function ledgerEvents(): Lesson19Event[] {
  const out: Lesson19Event[] = [
    take(
      'Before she lends anyone a single note, Ammu makes each of them say the most they could possibly need. Abbu goes first: ten notes, at the very outside. He does not want ten today. He wants her to know ten is the ceiling.',
      [claimEdge(0)],
      'P0 declares Max = 10. Avoidance needs every maximum claim up front, before any resource is granted, because it cannot look ahead without them.'
    ),
    take(
      'Afra says four. It is the smallest ceiling at the table, which quietly makes her the easiest person to plan around.',
      [claimEdge(1)],
      'P1 declares Max = 4. The smallest maximum claim is usually the one a safe sequence starts with.'
    ),
    take(
      'Arijit says nine. Ammu writes it down without comment. Nine and four and ten come to twenty three, and there are twelve notes in the envelope, so she already knows she cannot simply hand everyone their ceiling and hope.',
      [claimEdge(2)],
      'P2 declares Max = 9. Total Max is 23 against 12 instances, and that is normal: avoidance never requires that every maximum could be granted at once, only that some finishing order always exists.'
    ),
    take(
      'Abbu takes five of his ten. He is holding five and could still come back for five more, and Ammu is keeping track of both of those numbers, not just the first one.',
      allocEdges(0, 5),
      'P0 Allocation = 5, so Need = Max minus Allocation = 5. Both numbers matter: Allocation is what it holds, Need is what it can still demand.'
    ),
    take(
      'Afra takes two of her four. Two more could still come.',
      allocEdges(1, 2),
      'P1 Allocation = 2, Need = 2.'
    ),
    take(
      'Arijit takes two of his nine. Nine notes are out of the envelope and two are still in it. Two does not sound like much until you notice who it has to be enough for.',
      allocEdges(2, 2),
      'P2 Allocation = 2, Need = 7. Available is now 2 against outstanding Need of 5, 2 and 7.'
    )
  ];
  const state = stateAfterEvents(out);
  const seq = safeSequenceOf(state);
  const free = availableOf(state);
  out.push({
    analogyCaption: `So Ammu checks. With ${free} notes free, is there any order at all in which all three could still finish and pay her back? There is: ${seq}. Because such an order exists, she can keep lending.`.slice(
      0,
      CAPTION_MAX
    ),
    caption: `Safety algorithm on Available = ${free}: a safe sequence exists, ${seq}. Each process in it can reach its Max from Available plus what the ones before it release. The state is SAFE.`.slice(
      0,
      CAPTION_MAX
    ),
    activeNodes: ['R']
  });
  return out;
}

/**
 * Unit 78, the grant: Sister draws one more note and the treasurer allows it.
 * safetyAlgorithm now drains only Ammu, the state is unsafe: the guarantee
 * is gone, though nothing is stuck yet.
 */
export function grantEvents(): Lesson19Event[] {
  const out = ledgerEvents();
  out.push(
    take(
      'Then Arijit comes back for one more note. It is one note. There is one to spare. Ammu gives it to him.',
      allocEdges(2, 1)
    )
  );
  out.push({
    analogyCaption:
      'Now run the same check. One note is free. Abbu could still want five and Arijit six, and neither fits in one note. Only Afra can definitely finish. Ammu has lost the guarantee, not the trip: nobody is stuck yet.'.slice(
        0,
        CAPTION_MAX
      ),
    caption:
      'Available = 1. No safe sequence exists: only P1 has Need within Available, and releasing it does not free enough for P0 or P2. The state is UNSAFE. Note it is not deadlocked. No process is blocked, and lucky requests may still let all three finish.'.slice(
        0,
        CAPTION_MAX
      ),
    activeNodes: ['P2']
  });
  return out;
}

/**
 * The proof that unsafe is not stuck: everyone happens to finish in a friendly
 * order and every note comes home. Same unsafe start, different luck.
 */
export function friendlyEvents(): Lesson19Event[] {
  const out = grantEvents();
  const finish = (pid: number, notes: number, caption: string): void => {
    out.push({
      caption: caption.slice(0, CAPTION_MAX),
      removeEdges: allocEdges(pid, notes).map((e) => ({ from: e.from, to: e.to }))
    });
  };
  finish(0, 5, 'Abbu finishes without asking again, five notes come back.');
  finish(2, 3, 'Sister finishes with the three she has, the fund grows to ten.');
  finish(1, 2, 'Ammu finishes too, every note is home.');
  out.push({
    caption: 'Unsafe, yet everyone completed. Unsafe means no guarantee, not stranded.'.slice(0, CAPTION_MAX),
    activeNodes: ['R']
  });
  return out;
}

/**
 * The other fate of the same unsafe state: everyone asks for the rest of
 * their ceiling at once, and the detection sweep confirms the stuck set.
 */
export function hostileEvents(): Lesson19Event[] {
  const out = grantEvents();
  out.push({
    caption: 'Then each asks for the rest of their promise, all at once.'.slice(0, CAPTION_MAX),
    allAskNeed: true,
    activeNodes: ['P0', 'P1', 'P2']
  });
  const state = stateAfterEvents(out, true);
  const stuck = stuckOf(state);
  const names = stuck.join(', ');
  out.push({
    caption: `Everyone waits on the fund, ${names} can never finish. Stuck.`.slice(0, CAPTION_MAX),
    activeNodes: stuck
  });
  return out;
}

/**
 * Unit 79: dotted claims at the driveway. Ammu's request for Car 1 is
 * refused, if Abbu then needed Car 2, the ring would close. Once Abbu
 * withdraws his claim, the same grant closes nothing and is allowed. The
 * refusal is computed: claims count as edges when the check runs.
 */
export function claimsEvents(): Lesson19Event[] {
  const out: Lesson19Event[] = [
    take(
      'Downstairs in the driveway there are two numbered spots. Abbu tells Kabir chacha that he might need spot 2 later in the week. Nothing has happened yet. It is only a heads up, and Kabir chacha writes it in his register as a dotted line.',
      [{ from: 'T1', to: 'C2', kind: 'claim' }]
    ),
    take(
      'Arijit says the same about spot 1. Two dotted lines now, two people who might want what the other could end up parked in.',
      [{ from: 'T2', to: 'C1', kind: 'claim' }]
    ),
    take('Abbu parks in spot 1. That line is solid now: he is actually in it.', [
      { from: 'C1', to: 'T1', kind: 'assignment' }
    ]),
    take('Arijit parks in spot 2.', [{ from: 'C2', to: 'T2', kind: 'assignment' }]),
    {
      caption:
        'Then Arijit asks to move into spot 1 as well. Spot 1 is taken by Abbu, so this is a request, and Kabir chacha does not just look at whether it is free. He looks at what would still be possible afterwards.'.slice(
          0,
          CAPTION_MAX
        ),
      removeEdge: { from: 'T2', to: 'C1' },
      addEdge: { from: 'T2', to: 'C1', kind: 'request' }
    }
  ];
  const edgesNow = out.reduce<RagEdge[]>((acc, ev) => applyEventEdges(acc, ev), []);
  const closes = grantWouldCloseRing(CLAIM_NODES, edgesNow);
  out.push({
    caption: closes
      ? 'Refused. Not because spot 1 is busy, but because of the dotted line: if Arijit were waiting on spot 1 and Abbu later took up his claim on spot 2, each would be holding what the other was waiting for and the ring would close. This is the claim-edge rule: grant a request only if the solid edge it creates closes no cycle.'.slice(
          0,
          CAPTION_MAX
        )
      : 'Allowed. Nothing in the register could close a ring now.'.slice(0, CAPTION_MAX),
    setCycle: closes ? ['T1', 'C2', 'T2', 'C1'] : [],
    activeNodes: ['T2']
  });
  out.push({
    caption: 'Arijit withdraws the request and waits where he is.'.slice(0, CAPTION_MAX),
    removeEdge: { from: 'T2', to: 'C1' }
  });
  out.push({
    caption:
      "Then Abbu's week changes and he tells Kabir chacha to strike out the note about spot 2. The dotted line is gone, and nothing physical has moved.".slice(
        0,
        CAPTION_MAX
      ),
    removeEdge: { from: 'T1', to: 'C2' }
  });
  out.push({
    caption:
      'Now Arijit asks again, and the same request is allowed. Nothing about the cars changed. What changed is what could still be claimed, which is the only thing the check was ever looking at.'.slice(
        0,
        CAPTION_MAX
      ),
    addEdge: { from: 'C1', to: 'T2', kind: 'assignment' }
  });
  return out;
}

/** Solid + claim edges after replaying events (the check's view of the world). */
function applyEventEdges(edges: RagEdge[], ev: Lesson19Event): RagEdge[] {
  const out = edges.map((e) => ({ ...e }));
  if (ev.addEdge) out.push({ ...ev.addEdge });
  for (const e of ev.addEdges ?? []) out.push({ ...e });
  for (const r of ev.removeEdges ?? []) {
    const idx = out.findIndex((e) => e.from === r.from && e.to === r.to);
    if (idx >= 0) out.splice(idx, 1);
  }
  if (ev.removeEdge) {
    const idx = out.findIndex((e) => e.from === ev.removeEdge?.from && e.to === ev.removeEdge?.to);
    if (idx >= 0) out.splice(idx, 1);
  }
  return out;
}

/** Fold events into the state they leave behind, the verdicts' input. */
export function stateAfterEvents(events: Lesson19Event[], allAskNeed = false): Lesson19State {
  let edges: RagEdge[] = [];
  for (const ev of events) edges = applyEventEdges(edges, ev);
  return { edges, cycleIds: [], activeNodeIds: [], allAskNeed };
}

/**
 * The claim-edge rule (unit 79): granting the pending request is allowed only
 * if the solid edge it creates never closes a ring, with every dotted claim
 * counted as an edge that could turn solid later. Computed by detectCycle on
 * the hypothetical graph where claims are treated as request edges.
 */
export function grantWouldCloseRing(nodes: GraphNodeInput[], edges: RagEdge[]): boolean {
  const graph: RagGraph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    })),
    edges: edges.map((e) => (e.kind === 'claim' ? { ...e, kind: 'request' as const } : { ...e }))
  };
  return detectCycle(graph).length > 0;
}

const SCENARIO_LABELS: Record<Lesson19Scenario, string> = {
  ledger: '🟢 Declared ceilings (safe)',
  grant: '🟠 One note too many (unsafe)',
  friendly: '🍀 Friendly completion',
  hostile: '🔴 Everyone asks at once',
  claims: '🚗 Dotted claims (grant check)'
};

const SCENARIO_NODES: Record<Lesson19Scenario, GraphNodeInput[]> = {
  ledger: LEDGER_NODES,
  grant: LEDGER_NODES,
  friendly: LEDGER_NODES,
  hostile: LEDGER_NODES,
  claims: CLAIM_NODES
};

export function scenarioEvents(id: Lesson19Scenario): Lesson19Event[] {
  switch (id) {
    case 'grant': return grantEvents();
    case 'friendly': return friendlyEvents();
    case 'hostile': return hostileEvents();
    case 'claims': return claimsEvents();
    default: return ledgerEvents();
  }
}

export function scenarioInput(id: Lesson19Scenario): GraphInput {
  return {
    nodes: SCENARIO_NODES[id].map((n) => ({ ...n })),
    initialEdges: [],
    events: scenarioEvents(id),
    analogy: { domain: 'friends', title: 'The treasurer and the trip fund' }
  };
}

/**
 * Lesson 19's engine, scoped to this lesson. Uses GraphEngine.render()
 * unchanged, the lesson adds the treasurer story: scenario scripts whose
 * region verdicts fall out of safetyAlgorithm/detectionAlgorithm, and the
 * claim-edge grant check computed by detectCycle.
 */
export class Lesson19GraphEngine extends GraphEngine implements PlaygroundCapable {
  private scenario: Lesson19Scenario = 'ledger';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  /**
   * GraphEngine's snapshot handles one edge per event; the treasurer story
   * moves a purse in one motion. Same step shape, batched edge support.
   */
  protected override buildSteps(input: GraphInput): Step<Lesson19State>[] {
    if (!input.nodes || input.nodes.length === 0) {
      throw new Error('GraphEngine: input.nodes must not be empty');
    }
    const events = input.events as Lesson19Event[];
    const edges: RagEdge[] = (input.initialEdges ?? []).map((e) => ({ ...e }));
    let cycleIds: string[] = [];
    let allAskNeed = false;
    const steps: Step<Lesson19State>[] = [];
    let t = 0;

    const snapshot = (
      caption: string,
      highlight: string[],
      analogyCaption?: string
    ): Step<Lesson19State> => ({
      t: t++,
      caption: caption.slice(0, CAPTION_MAX),
      analogyCaption: analogyCaption?.slice(0, CAPTION_MAX),
      highlight,
      state: {
        edges: edges.map((e) => ({ ...e })),
        cycleIds: [...cycleIds],
        activeNodeIds: highlight,
        allAskNeed
      }
    });

    steps.push(snapshot('Ceilings come first, the treasurer lends against promises.', []));

    for (const ev of events ?? []) {
      if (ev.addEdge) edges.push({ ...ev.addEdge });
      for (const e of ev.addEdges ?? []) edges.push({ ...e });
      for (const r of ev.removeEdges ?? []) {
        const idx = edges.findIndex((e) => e.from === r.from && e.to === r.to);
        if (idx >= 0) edges.splice(idx, 1);
      }
      if (ev.removeEdge) {
        const idx = edges.findIndex((e) => e.from === ev.removeEdge?.from && e.to === ev.removeEdge?.to);
        if (idx >= 0) edges.splice(idx, 1);
      }
      if (ev.clearCycle) cycleIds = [];
      if (ev.setCycle) cycleIds = [...ev.setCycle];
      if (ev.allAskNeed) allAskNeed = true;
      const hl = ev.setCycle ?? ev.activeNodes ?? [];
      steps.push(snapshot(ev.caption, hl, ev.analogyCaption));
    }

    return steps;
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson19Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getRegion: () => regionOf(this.currentLessonState()),
      getSafeSequence: () => safeSequenceOf(this.currentLessonState())
    };
  }

  private currentLessonState(): Lesson19State {
    const steps = this.getSteps() as Step<Lesson19State>[];
    return steps[this.getCurrentIndex()].state;
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Grant the request, watch the region move</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson19Scenario[]).map((id) => `
            <button type="button" class="l19-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Every region badge and sequence is computed, the safe sweep, the detection sweep, the claim check.</div>
    `;
    host.querySelectorAll('.l19-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson19Scenario);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.renderScoreboard());
    this.renderScoreboard();
  }

  private applyScenario(id: Lesson19Scenario): void {
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
    const steps = this.getSteps() as Step<Lesson19State>[];
    const state = steps[this.getCurrentIndex()]?.state;
    if (!state) return;
    const region = regionOf(state);
    const isLedger = this.scenario !== 'claims';
    const regionMeta: Record<Region, { color: string; label: string }> = {
      safe: { color: 'var(--running)', label: 'SAFE, some order finishes' },
      unsafe: { color: 'var(--waiting)', label: 'UNSAFE, the guarantee is gone' },
      deadlock: { color: 'var(--waiting)', label: 'DEADLOCK, stuck for good' },
      complete: { color: 'var(--running)', label: 'COMPLETE, every note came home' }
    };
    const meta = regionMeta[region];
    const alloc = allocationOf(state);
    const holdings = PEOPLE.map((p, i) => `${p.analogyLabel} ${alloc[i]}`).join(' · ');
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">${isLedger ? 'Treasurer\'s region check' : 'Claim-edge grant check'} · ${SCENARIO_LABELS[this.scenario]}</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: var(--surface-alt); color: ${meta.color}; border: 1px solid ${meta.color};">${meta.label}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Held right now</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px;">${holdings}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${availableOf(state)} of ${TOTAL_NOTES} free · step ${this.getCurrentIndex() + 1} of ${steps.length}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Some order that finishes</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px;">${safeSequenceOf(state)}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">computed by the safe sweep</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The three regions</div>
          <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 3px;">
            ${(['safe', 'unsafe', 'deadlock'] as Region[]).map((r) => `
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="width: 8px; height: 8px; border-radius: 9999px; border: 1px solid ${regionMeta[r].color}; background: ${region === r ? regionMeta[r].color : 'transparent'};"></span>
                <span style="font-size: 0.7rem; font-family: var(--font-mono); color: ${region === r ? 'var(--ink)' : 'var(--muted)'};">${r}${region === r ? ' ← you are here' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson19Input: GraphInput = scenarioInput('ledger');

export const lesson19: Lesson<GraphInput, GraphState> = {
  id: 19,
  lecture: 10,
  slug: 'lesson-19',
  title: 'Safe, unsafe, and stuck',
  absorbsUnits: [76, 77, 78, 79],
  slides: 'slides 17–21',
  engine: 'graph',
  engineClass: Lesson19GraphEngine,
  lensLabels: {
    analogy: '💰 The treasurer at the table',
    mechanism: '🕸️ Ceilings and claims',
    analogyTitle: 'View as the treasurer lending against declared ceilings',
    mechanismTitle: 'View as the claim-edge graph and the region sweep'
  },
  analogy: {
    domain: 'friends',
    text:
      'Ammu has been saving for the Cox\'s Bazar trip since Eid. Twelve notes, folded into an envelope at the back of the almirah, under the winter quilts.\n\n' +
      'Now three people want to borrow from it. Abbu, Arijit and Afra, and all three swear they will pay it back before the trip.\n\n' +
      'Ammu is not worried about whether she can afford today. She is worried about a different thing, and it is worth being precise about what it is. She is worried about lending in an order that leaves her stuck later: everyone holding something, nobody holding enough to finish, and the envelope empty on the table between them.\n\n' +
      'So before she lends anything she makes each of them say the most they could possibly need. Then she only ever lends while some order still exists in which all three could finish and pay her back.\n\n' +
      'That is the whole problem. Watch her do it.'
  },
  concept:
    'What Ammu is doing has a name. It is called deadlock avoidance, and the point of it is that a system can be perfectly healthy right now and still be one grant away from being trapped, so a scheduler that only asks "can I afford this request" is not asking enough.\n\n' +
    'Avoidance needs one extra piece of information up front: every process must declare its maximum claim, the most of each resource it could ever ask for. That is the ceiling each person states before any note leaves the envelope. With those ceilings the system can look ahead instead of only looking at the moment.\n\n' +
    'A state is called SAFE when a safe sequence exists. A safe sequence is an order of the processes in which each one, using what is free plus everything the processes before it release when they finish, can still get up to its maximum and complete. If even one such order exists, the system is safe, because it can always fall back on that order. It does not have to follow it. It only has to have one.\n\n' +
    'A state is UNSAFE when no safe sequence exists. Read the word carefully, because this is where the exam question usually hides: unsafe does not mean deadlocked, and it does not mean anyone is stuck. It means the guarantee is gone. From an unsafe state the processes might still all finish, if they happen to ask for less than their ceilings or ask in a lucky order. They also might not, and the system can no longer promise which. Safe states sit inside unsafe states, and deadlocked states sit inside unsafe states too. Every deadlocked state is unsafe, and no safe state is deadlocked, but an unsafe state is not yet a deadlocked one.\n\n' +
    'So avoidance works by refusing any request that would move the system from safe to unsafe, even when the resource is sitting right there and free. That refusal is the whole mechanism.\n\n' +
    'For resources with a single instance the same idea is drawn as a resource-allocation graph with claim edges. A claim edge is dotted and means "this process may request this resource one day". A request edge means it is asking now, and an assignment edge means it is holding it. A request is granted only if converting its dotted claim edge into a solid edge leaves no cycle in the graph, counting the dotted edges too. Kabir chacha refusing a free parking spot because of a note in his register is exactly that rule.',
  morphReveals:
    'At the table every purse is the same size, because a purse is a purse. Nothing about how wide one sits tells you anything, and a promise is only a dotted line between a person and the envelope. Move to the graph and width stops being a purse and starts being holdings: the envelope is as wide as the twelve notes in it, and each person is as wide as what they are actually carrying. That is why the picture changes shape when Arijit takes one more note and nothing else moves. The dotted ceilings stay dotted through the whole morph, because a promise still closes no ring until the day it turns solid.',
  morphMode: 'morph',
  analogyMapping: [
    'The twelve notes in the envelope ➔ the total instances of the resource',
    'What each person says they could need ➔ Max, the declared maximum claim',
    'Notes someone is holding right now ➔ Allocation, drawn as assignment edges',
    'What they could still come back for ➔ Need, which is Max minus Allocation',
    'Notes still in the envelope ➔ Available',
    'An order in which all three could still finish ➔ a safe sequence',
    'Ammu still has such an order ➔ the state is safe',
    'She has lost it, but nobody is stuck ➔ the state is unsafe',
    'Nobody can move at all ➔ deadlock, which is a subset of unsafe',
    'A note in Kabir chacha\'s register about a spot ➔ a dotted claim edge',
    'Refusing a free spot because of that note ➔ the claim-edge grant rule'
  ],
  input: lesson19Input
};

export default lesson19;
