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
// L16 · Family dinner, two people and too few serving spoons (units 63–68, slides 3–7)
//
// LESSONS.md: L16, units 63–68. Family dinner, two people and too few serving spoons.
// The founding scene. Morphs from the dinner table into the four necessary
// conditions, each highlighted on the same picture. Playground: remove any one
// condition and watch deadlock become impossible."
//
// ATLAS rows (deck wording, kept for provenance):
// | 63 | `diagram` | System Model, request, use, release | slide 3 | food |
// |    |           | Ask for the salt, use the salt, put the salt back. Every |
// |    |           | resource interaction in the course is these three steps. |
// | 64 | `graph` | Deadlock in a Multithreaded Application | slides 4–6 | food |
// |    |         | Two friends, two chopsticks, one each. Both are polite, both |
// |    |         | are patient, and neither will ever eat. The two-mutex code |
// |    |         | runs alongside the scene. |
// | 65 | `diagram` | Condition 1. Mutual Exclusion | slide 7 | food | A chopstick
// |    |           | can't be split in half. Non-shareable by nature, this is the
// |    |           | condition you almost never get to remove. |
// | 66 | `diagram` | Condition 2. Hold and Wait | slide 7 | food | Gripping one
// |    |           | chopstick while waiting for the second. Nobody gives anything
// |    |           | up while they wait, that's what turns waiting into deadlock. |
// | 67 | `diagram` | Condition 3. No Preemption | slide 7 | food | You can't snatch
// |    |           | the chopstick out of your friend's hand. It's released
// |    |           | voluntarily or not at all. |
// | 68 | `graph` | Condition 4. Circular Wait | slide 7 | food | A round table where
// |    |         | every person waits on the one to their left. Trace the ring and
// |    |         | it closes, all four conditions must hold at once. |
//
// ENGINE VERDICT (a): extend GraphEngine and use its render() unmodified.
// Why: every unit lives on one picture, the request/use/release triple is an
// edge lifecycle (ask, take, return), the deadlock is a ring of holds and
// asks, and each condition is a highlight on that same graph. That is exactly
// what GraphEngine renders (bipartite nodes, request vs assignment edges,
// cycle highlight, [id^="bar-*"] widths computed from instances and holdings).
// Overriding render() would reimplement identical interpolation for no gain.
// The ATLAS `diagram` labels on units 63/65/66/67 describe slide prose, not a
// second picture. LESSONS.md says each condition is highlighted "on the same
// picture", so one engine serves all six units honestly.
//
// The carrying property of the morph is WIDTH (and with it, x-position).
// Around the table every parent and every spoon takes the same space, // position is just where they sat. On the map width stops meaning a body and
// starts meaning holdings: a mutex is as wide as its instances, a parent as
// wide as what they grip.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A rule, applied from the start): the story arc is 13 steps, // the idle frame, the request/use/release triple (unit 63: a satisfied ask is
// taken up, not left pending, leaving it would re-ring later), the four
// takes-and-asks that close the ring (unit 64), the computed ring verdict,
// and the four condition beats (units 65–68), each naming its condition on
// the same picture. No beat repeats a state with new words. The four removal
// alternates are complete event sets, not cuts: share 10 (declared correct, // four takes, four returns, one verdict; nothing else happens when nobody
// ever waits), atomic 12, preempt 14, ordered 12.

export type Lesson16Mode = 'story' | 'share' | 'atomic' | 'preempt' | 'ordered';

const FRIENDS: GraphNodeInput[] = [
  { id: 'T1', kind: 'process', label: 'T1', analogyLabel: 'Ammu' },
  { id: 'T2', kind: 'process', label: 'T2', analogyLabel: 'Abbu' }
];

function chopsticks(instances: number): GraphNodeInput[] {
  const tag = instances > 1 ? `${instances}` : '1';
  return [
    { id: 'M1', kind: 'resource', instances, label: `M1 · ${tag}`, analogyLabel: 'Spoon 1' },
    { id: 'M2', kind: 'resource', instances, label: `M2 · ${tag}`, analogyLabel: 'Spoon 2' }
  ];
}

export const MODE_NODES: Record<Lesson16Mode, GraphNodeInput[]> = {
  story: [...FRIENDS, ...chopsticks(1)],
  share: [...FRIENDS, ...chopsticks(2)],
  atomic: [...FRIENDS, ...chopsticks(1)],
  preempt: [...FRIENDS, ...chopsticks(1)],
  ordered: [...FRIENDS, ...chopsticks(1)]
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

/** Guard: the lesson depends on these verdicts, so divergence throws here. */
function requireVerdict(
  mode: Lesson16Mode,
  where: string,
  edges: RagEdge[],
  wantDeadlock: boolean
): void {
  const v = isDeadlock(ragOf(MODE_NODES[mode], edges));
  if (v.deadlocked !== wantDeadlock) {
    throw new Error(
      `L16 ${where}: expected deadlocked=${wantDeadlock}, computed ${v.deadlocked} ` +
        `(cycles ${v.cycles.length}), the scene disagrees with the mechanism`
    );
  }
}

/** Verdict caption, branched on the computed isDeadlock, never typed. */
function ringCaption(mode: Lesson16Mode, edges: RagEdge[]): string {
  const v = isDeadlock(ragOf(MODE_NODES[mode], edges));
  if (v.deadlocked) {
    return `Both wait on what the other grips, deadlock. Neither will ever eat.`.slice(0, 120);
  }
  return `Nobody waits in a ring, without all four, deadlock is impossible.`.slice(0, 120);
}

function ringCycle(mode: Lesson16Mode, edges: RagEdge[]): string[] {
  const cycles = detectCycle(ragOf(MODE_NODES[mode], edges));
  return cycles.length > 0 ? [...cycles[0]] : [];
}

/** A satisfied ask is taken up in the same beat, never left pending. */
function takeEdge(caption: string, req: { from: string; to: string }): GraphEvent {
  return {
    caption: caption.slice(0, 120),
    addEdge: { from: req.to, to: req.from, kind: 'assignment' },
    removeEdge: { ...req }
  };
}

/**
 * The founding scene (units 63–64): the request/use/release triple, then the
 * two friends grip one chopstick each and ask for the other. The ring verdict
 * and every condition caption fall out of detectCycle/isDeadlock run on the
 * edge prefix, not out of stored answers.
 */
export function storyEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const ask = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const out: GraphEvent[] = [
    ask('Ammu asks for spoon M1, every use starts as a request.', {
      from: 'T1',
      to: 'M1',
      kind: 'request'
    })
  ];
  const use = takeEdge("M1 lands in Ammu's hand, the ask becomes a hold.", { from: 'T1', to: 'M1' });
  edges.splice(edges.findIndex((e) => e.from === 'T1' && e.to === 'M1'), 1);
  edges.push({ from: 'M1', to: 'T1', kind: 'assignment' });
  out.push(use);
  const rel = { from: 'M1', to: 'T1' };
  edges.splice(edges.findIndex((e) => e.from === rel.from && e.to === rel.to), 1);
  out.push({
    caption: 'Every acquire is matched by a release. Without that the resource never returns and nothing else can be reasoned about.', analogyCaption: 'A puts M1 back, every use ends in release.'.slice(0, 120),
    removeEdge: { ...rel }
  });
  out.push(
    ask('Ammu grips spoon M1.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    ask('Abbu grips spoon M2.', { from: 'M2', to: 'T2', kind: 'assignment' }),
    ask('Ammu asks for M2, Abbu is holding it.', { from: 'T1', to: 'M2', kind: 'request' }),
    ask('Abbu asks for M1, Ammu is holding it. The ring closes.', {
      from: 'T2',
      to: 'M1',
      kind: 'request'
    })
  );
  requireVerdict('story', 'ring', edges, true);
  out.push({ caption: ringCaption('story', edges), setCycle: ringCycle('story', edges) });
  out.push(
    {
      caption: 'Mutual exclusion holds: the resource is non-shareable, so only one process can hold it at a time.', analogyCaption: 'Mutual exclusion, one spoon serves one person; neither splits.'.slice(0, 120),
      activeNodes: ['M1', 'M2'],
      clearCycle: true
    },
    {
      caption: 'Hold and wait holds: each process keeps what it has while requesting what it does not.', analogyCaption: 'Hold and wait, each grips one while asking for the other.'.slice(0, 120),
      activeNodes: ['T1', 'T2']
    },
    {
      caption: "No preemption, Ammu's grip breaks only when she lets go.".slice(0, 120),
      activeNodes: ['T1', 'M1']
    },
    {
      caption: 'Circular wait holds: the wait relation closes into a cycle, and with no preemption that makes all four conditions true at once.', analogyCaption: 'Circular wait, Ammu waits on Abbu waits on Ammu; the ring closes.'.slice(0, 120),
      setCycle: ringCycle('story', edges)
    }
  );
  requireVerdict('story', 'ending', edges, true);
  return out;
}

/** Without mutual exclusion: spoons that split, nobody ever waits. */
export function shareEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const take = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const give = (caption: string, edge: { from: string; to: string }): GraphEvent => {
    edges.splice(edges.findIndex((e) => e.from === edge.from && e.to === edge.to), 1);
    return { caption: caption.slice(0, 120), removeEdge: { ...edge } };
  };
  const out: GraphEvent[] = [
    take('A takes an M1 half, one of two.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    take('B takes the other M1 half, no asking needed.', {
      from: 'M1',
      to: 'T2',
      kind: 'assignment'
    }),
    take('A takes an M2 half.', { from: 'M2', to: 'T1', kind: 'assignment' }),
    take('B takes the other M2 half, both can eat.', {
      from: 'M2',
      to: 'T2',
      kind: 'assignment'
    }),
    give('A finishes and puts both halves back.', { from: 'M1', to: 'T1' }),
    give('A returns M2.', { from: 'M2', to: 'T1' }),
    give('B finishes and puts both halves back.', { from: 'M1', to: 'T2' }),
    give('B returns M2.', { from: 'M2', to: 'T2' })
  ];
  requireVerdict('share', 'ending', edges, false);
  out.push({ caption: ringCaption('share', edges), clearCycle: true });
  return out;
}

/**
 * Without hold-and-wait: whoever asks holds nothing. T2 waits empty-handed
 * while T1 eats, then takes both. No step holds one while asking for another.
 */
export function atomicEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const ask = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const take = (caption: string, edge: RagEdge): GraphEvent => {
    edges.push({ ...edge });
    return { caption: caption.slice(0, 120), addEdge: { ...edge } };
  };
  const give = (caption: string, edge: { from: string; to: string }): GraphEvent => {
    edges.splice(edges.findIndex((e) => e.from === edge.from && e.to === edge.to), 1);
    return { caption: caption.slice(0, 120), removeEdge: { ...edge } };
  };
  const out: GraphEvent[] = [
    ask('B asks for M1 first, holding nothing.', { from: 'T2', to: 'M1', kind: 'request' }),
    take('A takes M1.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    take('A takes M2, nothing asked, nothing waited on.', {
      from: 'M2',
      to: 'T1',
      kind: 'assignment'
    }),
    give('A finishes and returns M1.', { from: 'M1', to: 'T1' }),
    give('A returns M2.', { from: 'M2', to: 'T1' }),
    give('M1 is free. B stops asking.', { from: 'T2', to: 'M1' }),
    take('B takes M1.', { from: 'M1', to: 'T2', kind: 'assignment' }),
    take('B takes M2.', { from: 'M2', to: 'T2', kind: 'assignment' }),
    give('B finishes and returns M1.', { from: 'M1', to: 'T2' }),
    give('B returns M2.', { from: 'M2', to: 'T2' })
  ];
  requireVerdict('atomic', 'ending', edges, false);
  out.push({ caption: ringCaption('atomic', edges), clearCycle: true });
  return out;
}

/**
 * Without no-preemption: M1 is taken back mid-wait. T1 waits holding
 * nothing, T2 eats, then T1 takes both and eats.
 */
export function preemptEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const step = (caption: string, edge?: RagEdge, remove?: { from: string; to: string }): GraphEvent => {
    if (edge) edges.push({ ...edge });
    if (remove) edges.splice(edges.findIndex((e) => e.from === remove.from && e.to === remove.to), 1);
    const ev: GraphEvent = { caption: caption.slice(0, 120) };
    if (edge) ev.addEdge = { ...edge };
    if (remove) ev.removeEdge = { ...remove };
    return ev;
  };
  const out: GraphEvent[] = [
    step('A grips M1.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    step('B grips M2.', { from: 'M2', to: 'T2', kind: 'assignment' }),
    step('A asks for M2. B is holding it.', { from: 'T1', to: 'M2', kind: 'request' }),
    step(
      'M1 is taken back, A now waits holding nothing.',
      undefined,
      { from: 'M1', to: 'T1' }
    ),
    step('B takes M1.', { from: 'M1', to: 'T2', kind: 'assignment' }),
    step('B finishes and returns M1.', undefined, { from: 'M1', to: 'T2' }),
    step('B returns M2.', undefined, { from: 'M2', to: 'T2' }),
    step('A takes M1.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    step('M2 is free, A stops asking.', undefined, { from: 'T1', to: 'M2' }),
    step('A takes M2.', { from: 'M2', to: 'T1', kind: 'assignment' }),
    step('A finishes and returns M1.', undefined, { from: 'M1', to: 'T1' }),
    step('A returns M2.', undefined, { from: 'M2', to: 'T1' })
  ];
  requireVerdict('preempt', 'ending', edges, false);
  out.push({ caption: ringCaption('preempt', edges), clearCycle: true });
  return out;
}

/**
 * Without circular wait: the spoons are numbered, both reach for M1
 * first, so T2 waits holding nothing and the ring never closes.
 */
export function orderedEvents(): GraphEvent[] {
  const edges: RagEdge[] = [];
  const step = (caption: string, edge?: RagEdge, remove?: { from: string; to: string }): GraphEvent => {
    if (edge) edges.push({ ...edge });
    if (remove) edges.splice(edges.findIndex((e) => e.from === remove.from && e.to === remove.to), 1);
    const ev: GraphEvent = { caption: caption.slice(0, 120) };
    if (edge) ev.addEdge = { ...edge };
    if (remove) ev.removeEdge = { ...remove };
    return ev;
  };
  const out: GraphEvent[] = [
    step('A takes M1, lowest number first.', { from: 'M1', to: 'T1', kind: 'assignment' }),
    step('B asks for M1, holding nothing.', { from: 'T2', to: 'M1', kind: 'request' }),
    step('A takes M2.', { from: 'M2', to: 'T1', kind: 'assignment' }),
    step('A finishes and returns M1.', undefined, { from: 'M1', to: 'T1' }),
    step('A returns M2.', undefined, { from: 'M2', to: 'T1' }),
    step('M1 is free. B stops asking.', undefined, { from: 'T2', to: 'M1' }),
    step('B takes M1.', { from: 'M1', to: 'T2', kind: 'assignment' }),
    step('B takes M2.', { from: 'M2', to: 'T2', kind: 'assignment' }),
    step('B finishes and returns M1.', undefined, { from: 'M1', to: 'T2' }),
    step('B returns M2.', undefined, { from: 'M2', to: 'T2' })
  ];
  requireVerdict('ordered', 'ending', edges, false);
  out.push({ caption: ringCaption('ordered', edges), clearCycle: true });
  return out;
}

export function modeEvents(mode: Lesson16Mode): GraphEvent[] {
  switch (mode) {
    case 'share':
      return shareEvents();
    case 'atomic':
      return atomicEvents();
    case 'preempt':
      return preemptEvents();
    case 'ordered':
      return orderedEvents();
    default:
      return storyEvents();
  }
}

export function modeInput(mode: Lesson16Mode): GraphInput {
  return {
    nodes: MODE_NODES[mode].map((n) => ({ ...n })),
    initialEdges: [],
    events: modeEvents(mode),
    analogy: { domain: 'food', title: 'Dinner table' }
  };
}

/** The two-mutex code beside the scene, lock order per mode, from the mode. */
export const MODE_CODE: Record<Lesson16Mode, { t1: string[]; t2: string[]; note: string }> = {
  story: {
    t1: ['lock(M1)', 'lock(M2)'],
    t2: ['lock(M2)', 'lock(M1)'],
    note: 'opposite order, the ring can close'
  },
  share: {
    t1: ['lock(M1)', 'lock(M2)'],
    t2: ['lock(M2)', 'lock(M1)'],
    note: 'same code, but each mutex admits two holders'
  },
  atomic: {
    t1: ['take both, or wait holding nothing'],
    t2: ['take both, or wait holding nothing'],
    note: 'never grips one while asking for another'
  },
  preempt: {
    t1: ['lock(M1)', 'lock(M2)'],
    t2: ['lock(M2)', 'lock(M1)'],
    note: 'same code, but a held mutex may be taken back'
  },
  ordered: {
    t1: ['lock(M1)', 'lock(M2)'],
    t2: ['lock(M1)', 'lock(M2)'],
    note: 'numbered order, both reach for M1 first'
  }
};

const MODE_LABELS: Record<Lesson16Mode, string> = {
  story: '🍜 Both reach across',
  share: '🥢 Chopsticks that split',
  atomic: '✊ Take both or wait',
  preempt: '↩️ Snatch it back',
  ordered: '🔢 Lowest number first'
};

const CONDITIONS_HELD: Record<Lesson16Mode, string> = {
  story: 'all four hold, deadlock',
  share: 'mutual exclusion removed',
  atomic: 'hold-and-wait removed',
  preempt: 'no-preemption removed',
  ordered: 'circular-wait removed'
};

/** The RAG behind any step state, what the scoreboard verdict computes from. */
export function ragOfState(mode: Lesson16Mode, state: GraphState): RagGraph {
  return ragOf(MODE_NODES[mode], state.edges);
}

/**
 * Lesson 16's engine, scoped to this lesson. Uses GraphEngine.render()
 * unchanged, the lesson adds the founding scene: the request/use/release
 * triple, the ring that closes, the four conditions on the same picture, and
 * a playground where removing any one condition breaks the deadlock.
 */
export class Lesson16GraphEngine extends GraphEngine implements PlaygroundCapable {
  private mode: Lesson16Mode = 'story';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  public debugHooks(): Record<string, unknown> {
    return {
      setMode: (m: Lesson16Mode) => this.applyMode(m),
      getMode: () => this.mode,
      getVerdict: () => isDeadlock(ragOfState(this.mode, this.getSteps()[this.getCurrentIndex()].state))
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    const code = MODE_CODE[this.mode];
    const codeLine = (who: string, ops: string[]): string =>
      `<div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--ink);">${who}: ${ops.join(' → ')}</div>`;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Remove one condition, deadlock becomes impossible</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(MODE_LABELS) as Lesson16Mode[]).map((id) => `
            <button type="button" class="l16-mode" data-mode="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.mode === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.mode === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${MODE_LABELS[id]}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Four conditions must hold at once, break any one and the same scene ends fed.</div>
      <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
        ${codeLine('T1', code.t1)}
        ${codeLine('T2', code.t2)}
        <div style="font-size: 0.68rem; color: var(--muted); margin-top: 2px;">${code.note}</div>
      </div>
    `;
    host.querySelectorAll('.l16-mode').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyMode((el as HTMLElement).dataset.mode as Lesson16Mode);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.renderScoreboard());
    this.renderScoreboard();
  }

  private applyMode(mode: Lesson16Mode): void {
    this.mode = mode;
    this.input.nodes = MODE_NODES[mode].map((n) => ({ ...n }));
    this.input.initialEdges = [];
    this.setEvents(modeEvents(mode));
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
    const now = isDeadlock(ragOfState(this.mode, state));
    const end = isDeadlock(ragOfState(this.mode, finalState));
    const badge = (v: { deadlocked: boolean; cycles: string[][] }): string => {
      if (v.deadlocked) {
        return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);">🔴 Stuck, neither will ever eat</div>`;
      }
      if (v.cycles.length > 0) {
        return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(0, 102, 204, 0.08); color: var(--accent); border: 1px solid var(--accent);">🔵 Ring, but someone still eats</div>`;
      }
      return `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);">🟢 Fed, no ring, no deadlock</div>`;
    };
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Table check · ${MODE_LABELS[this.mode]}</h3>
        ${badge(end)}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Right now</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: ${now.deadlocked ? 'var(--waiting)' : 'var(--ink)'};">${now.deadlocked ? 'stuck' : now.cycles.length > 0 ? 'ring, not stuck' : 'no ring'}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">step ${this.getCurrentIndex() + 1} of ${steps.length}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">This table ends</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: ${end.deadlocked ? 'var(--waiting)' : 'var(--running)'};">${end.deadlocked ? 'deadlock' : 'everyone eats'}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">computed from the grips</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Conditions</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px;">${CONDITIONS_HELD[this.mode]}</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson16Input: GraphInput = modeInput('story');

export const lesson16: Lesson<GraphInput, GraphState> = {
  id: 16,
  lecture: 10,
  slug: 'lesson-16',
  title: 'Family dinner, two spoons short',
  absorbsUnits: [63, 64, 65, 66, 67, 68],
  slides: 'slides 3–7',
  engine: 'graph',
  engineClass: Lesson16GraphEngine,
  lensLabels: {
    analogy: '🥄 Dinner table',
    mechanism: '🕸️ Grip-and-ask map',
    analogyTitle: 'View as Ammu and Abbu sharing serving spoons',
    mechanismTitle: 'View as the hold-and-wait graph'
  },
  analogy: {
    domain: 'food',
    text: 
      'Ammu and Abbu sit down to eat and there are two serving spoons on the table between them.\n\n' +
      'You need both to serve yourself properly, one to hold the dish steady and one to serve. Ammu picks up the one nearest her. Abbu, at the same moment, picks up the one nearest him.\n\n' +
      'Now each of them is holding one spoon and waiting for the other. Neither will put theirs down, because putting it down means starting again and they have already got one. Neither will grab the other\'s, because that is not how anyone behaves at a family dinner.\n\n' +
      'They are both being polite. They are both being patient. They will both sit there indefinitely, and the food will go cold, and nothing about either of their behaviour is wrong. That is what makes this worth a whole lecture.'
  },
  concept:
    'Every resource interaction is ask, use, give back. Deadlock needs four conditions at once: each spoon serves one person, each parent grips one while asking for another, nothing is ever snatched back, and the waiting forms a ring. Break any one, bring extra spoons, take both or wait empty-handed, allow snatching, number the order, and the same scene ends fed. Each removal below is computed, not staged.'  +
    '  This is the DINING-PHILOSOPHERS PROBLEM, the standard illustration of deadlock in the literature: several diners sit around a table with one chopstick between each pair, each needs two to eat, and each picks up the one on their left first. Every one of them is following a perfectly reasonable rule and the result is that nobody eats. The point of the problem is not the philosophers. It is that a deadlock can be produced by rules that are individually correct.',
  morphReveals:
    'Around the table every parent and every spoon takes the same space, position is just where they sat. On the map width stops meaning a body and starts meaning holdings: a mutex is as wide as its instances, a parent as wide as what they grip, so the stuck ring reads wide all round while a freed parent narrows.',
  morphMode: 'morph',
  analogyMapping: [
    'Parent ➔ thread',
    'Serving spoon ➔ mutex, one dot per holder',
    'Asking for a spoon ➔ request edge, parent to spoon',
    'Gripping a spoon ➔ assignment edge, spoon to parent',
    'Ask, use, give back ➔ the edge lifecycle: request, hold, release',
    'Everyone waiting in a ring ➔ deadlock, and removing any condition breaks it'
  ],
  input: lesson16Input
};

export default lesson16;
