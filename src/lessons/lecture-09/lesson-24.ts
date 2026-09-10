// ANALOGY: re-cast
import type { Lesson, Step } from '../../core/types.js';
import { TraceEngine, type TraceInput, type TraceState } from '../../engines/trace.js';
import {
  evaluateInterruptMasking,
  simulateMemoryBarrier,
  type BarrierEvent,
  type BarrierRun,
  type MemoryModel,
  type PendingStore
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// L24 · The barrier (ATLAS units 47–49, Lecture 9 slides 3–5)
//
// LESSONS.md: L24, units 47–49. Strongly vs weakly ordered memory, then the
// barrier. Playground: toggle ordering, watch two stores land shuffled, insert
// a barrier, watch it stop. PAIRS WITH L12. L12 already owns the broken case,
// reference it, do not duplicate its trace. Unit 49 is already mapped to the
// trace engine.
//
// ATLAS rows (kept for provenance):
// | 47 | diagram | Disabling Interrupts                       | slide 3
// | 48 | diagram | Memory Models. Strongly vs Weakly Ordered  | slide 4
// | 49 | trace   | Memory Barriers                            | slide 5
//
// DECK DATA, slides 3–5 are text-only, quoted here as written:
//   slide 3  "Uniprocessors – could disable interrupts … Generally too
//             inefficient on multiprocessor systems … not broadly scalable"
//   slide 4  "Strongly ordered – where a memory modification of one processor
//             is immediately visible to all other processors. Weakly ordered –
//             … may not be immediately visible … A memory barrier is an
//             instruction that forces any change in memory to be propagated
//             (made visible) to all other processors."
//   slide 5  "We could add a memory barrier to the following instructions to
//             ensure Thread 1 outputs 100:
//               Thread 1: while (!flag) memory_barrier(); print x
//               Thread 2: x = 100; memory_barrier(); flag = true"
//
// HOW THIS DIFFERS FROM L12 (units 44–46, slides 13–18).
// L12 owns the broken case and narrates it: two hardcoded branches, intact and
// reordered, and the printed number flips. This lesson does not replay that.
// It replaces the narrative with a MODEL, simulateMemoryBarrier gives T2 a
// store buffer, so "visible" is a first-class thing a write either is or is
// not. The consequence is that the deck's fix becomes reachable inside the
// same model instead of being a third scripted branch, and the broken case
// stops being a special case: under weak ordering the SAME program prints 100
// or 0 depending only on which buffered store drains first. The lesson says
// so out loud and links back to L12 rather than re-teaching it.
//
// ENGINE VERDICT (a): extend TraceEngine, call its render() and add one lane.
// Unit 49 is a two-thread instruction trace, which is exactly what TraceEngine
// draws. What it has no concept of is a write that has happened but is not yet
// visible, so the subclass adds the in-flight lane and nothing else. The
// instruction parser is bypassed deliberately: it understands loads, stores
// and arithmetic, and would throw on memory_barrier(), while (!flag) and
// print x rather than silently mis-executing them. buildSteps drives the
// trace from the algorithm instead, which is where the semantics belong.
//
// The carrying property of the morph is WHERE A PENDING WRITE SITS.
//
// FIRST ATTEMPT, AND WHY IT WAS WRONG. This was originally "the gap between
// the two columns". Measured, that gap is 20px at view 0 and 16px at view 1, // four pixels, which cannot carry a meaning. The tokens placed in it also
// overflowed their boxes, because SVG text does not clip. The morph test I had
// written asserted only that the gap moved by >= 1px, so it passed on drift
// and proved nothing. Recorded rather than quietly replaced.
//
// WHAT IT IS NOW. A write that has been issued and is not yet visible is drawn
// in the band below the columns, and its POSITION is the carrying property.
// In the hallway the pending writes are strung out along the corridor, spaced
// apart: a corridor has length, and a thing in it is somewhere, the dish is
// further along than the call, or it is not. In the machine they collapse into
// a stack at one fixed x: a store buffer has no geography at all, only order.
// Position stops meaning distance and starts meaning nothing, which is
// exactly the property that makes weak ordering dangerous. You cannot look at
// a buffer and see how far along something is, so "x = 100 has run" and
// "x = 100 can be read" come apart with nothing on screen to warn you, and
// that is the entire reason the deck needs a barrier.
// ─────────────────────────────────────────────────────────────────────────────
//
// DENSITY: one beat per discrete mechanism event, and the event set here is
// genuinely uneven, that unevenness IS the content. Strongly ordered runs are
// short because nothing can go wrong: 6 beats, and the buffer is never used.
// The weak runs are longer because each buffered store reaching the other
// processor is its own event, and T1 re-reads the flag between every one of
// them. Counts, plus the engine's opening frame: 7 / 10 / 11 / 13.
// This follows lesson-03's precedent, a complete short event set is correct;
// padding a strongly ordered run to look busy would teach the opposite of
// what slide 4 says about it.

export type Lesson24Scenario = 'strong' | 'lucky' | 'broken' | 'barrier';

export const SCENARIO_LABELS: Record<Lesson24Scenario, string> = {
  strong: 'Same room',
  lucky: 'Dish first',
  broken: 'Call first',
  barrier: 'With barrier'
};

interface ScenarioSpec {
  model: MemoryModel;
  barriers: boolean;
  drainOrder: ('x' | 'flag')[];
  /** one line for the scoreboard, in the kitchen's words */
  gist: string;
}

export const SCENARIOS: Record<Lesson24Scenario, ScenarioSpec> = {
  // slide 4, strongly ordered: visible to everyone the moment it happens
  strong: { model: 'strong', barriers: false, drainOrder: ['x', 'flag'], gist: 'Everything lands the moment it happens.' },
  // weakly ordered and lucky, the dish gets through before the call does
  lucky: { model: 'weak', barriers: false, drainOrder: ['x', 'flag'], gist: 'The dish got there first. This time.' },
  // weakly ordered and unlucky, the call overtakes the dish. L12's outcome,
  // reached here from the buffer rather than from a scripted branch.
  broken: { model: 'weak', barriers: false, drainOrder: ['flag', 'x'], gist: 'The call overtook the dish. She served an empty plate.' },
  // slide 5's fix
  barrier: { model: 'weak', barriers: true, drainOrder: ['flag', 'x'], gist: 'Nothing is announced until it is really out there.' }
};

export function runOf(id: Lesson24Scenario): BarrierRun {
  const s = SCENARIOS[id];
  return simulateMemoryBarrier(s.model, s.barriers, s.drainOrder);
}

/** Slide 5's two programs, in the deck's own wording. */
export const T1_PROGRAM = ['while (!flag)', 'memory_barrier()', 'print x'];
export const T2_PROGRAM = ['x = 100', 'memory_barrier()', 'flag = true'];

export function programFor(actor: 'T1' | 'T2', barriers: boolean): string[] {
  const full = actor === 'T1' ? T1_PROGRAM : T2_PROGRAM;
  return barriers ? [...full] : full.filter((i) => i !== 'memory_barrier()');
}

/** The same three lines said in the kitchen's words. Index-matched to above. */
export const T1_ANALOGY = ['listen for the call', 'let the room catch up', 'carry out the dish'];
export const T2_ANALOGY = ['dish the biryani', 'wait for the room', 'call "ready!"'];

export function analogyProgramFor(actor: 'T1' | 'T2', barriers: boolean): string[] {
  const full = actor === 'T1' ? T1_ANALOGY : T2_ANALOGY;
  return barriers ? [...full] : full.filter((_, i) => i !== 1);
}

/** The scene, in the kitchen's words. Ids stay bound to the deck's threads. */
export const ACTOR_NAMES: Record<'T1' | 'T2', string> = {
  T1: 'Thread 1',
  T2: 'Thread 2'
};

export const ACTOR_ANALOGY: Record<'T1' | 'T2', string> = {
  T1: 'At the table',
  T2: 'In the kitchen'
};

/** What each shared variable is, on the dining-room side. */
export const VAR_ANALOGY: Record<'x' | 'flag', string> = {
  x: 'the dish',
  flag: 'the call'
};

// ── In-flight lane geometry (canvas is 720x260; the columns end at y=174) ──
// Kept here, exported, and asserted in the tests, so no figure on screen is a
// literal typed twice.
export const LANE_X = 22;
export const LANE_LABEL_Y = 196;
export const LANE_Y = 206;
/** analogy: tokens strung out down the corridor */
export const HALL_STRIDE = 186;
export const HALL_TOKEN_W = 172;
/** mechanism: tokens stacked in a buffer that has no geography */
export const BUFFER_X = 420;
export const BUFFER_STRIDE = 24;
export const BUFFER_TOKEN_W = 92;

/** Short enough to fit the token box at any morph interpolation. */
export const TOKEN_ANALOGY: Record<'x' | 'flag', string> = {
  x: 'dish on its way',
  flag: 'call on its way'
};

/** Unit 47, slide 3, the cores a masked interrupt does not protect. */
export const INTERRUPT_CORES = [1, 2, 4, 8];

interface BarrierTraceState extends TraceState {
  /** stores that have happened but cannot be read by the other side yet */
  pending: PendingStore[];
  visibleX: number;
  visibleFlag: number;
  eventKind: BarrierEvent['kind'];
}

export class Lesson24TraceEngine extends TraceEngine {
  private scenario: Lesson24Scenario = 'broken';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;
  private inFlightGroup: SVGGElement | null = null;

  constructor(container: HTMLElement, input: TraceInput) {
    super(container, input);
  }

  /**
   * Driven by simulateMemoryBarrier, not by TraceEngine's instruction parser.
   * The parser handles loads, stores and arithmetic and throws on anything
   * else, which is correct of it, and the reason this override exists rather
   * than a set of instruction strings bent into shapes it recognises.
   */
  protected override buildSteps(input: TraceInput): Step<TraceState>[] {
    const spec = SCENARIOS[this.scenario] ?? SCENARIOS.broken;
    const run = simulateMemoryBarrier(spec.model, spec.barriers, spec.drainOrder);
    const t1 = programFor('T1', spec.barriers);
    const t2 = programFor('T2', spec.barriers);
    const pointers = [0, 0];

    const snapshot = (
      t: number,
      caption: string,
      activeThreadIndex: number | null,
      ev: { visible: { x: number; flag: number }; pending: PendingStore[]; printed: number | null; kind: BarrierEvent['kind'] },
      highlight: string[]
    ): Step<TraceState> => {
      const state: BarrierTraceState = {
        stepIndex: t,
        activeThreadIndex,
        threadPointers: [...pointers],
        // no registers in this lesson, the panel would only show two dashes
        registers: {},
        memory: { x: ev.visible.x, flag: ev.visible.flag },
        lastModifiedVar: null,
        caption,
        pending: ev.pending.map((p) => ({ ...p })),
        visibleX: ev.visible.x,
        visibleFlag: ev.visible.flag,
        eventKind: ev.kind
      };
      return { t, caption: caption.slice(0, 120), highlight, state };
    };

    const steps: Step<TraceState>[] = [
      snapshot(
        0,
        'The dish is empty and nobody has called. Both sides are already running.',
        null,
        { visible: { x: 0, flag: 0 }, pending: [], printed: null, kind: 'spin' },
        ['T1', 'T2']
      )
    ];

    for (const ev of run.events) {
      const idx = ev.actor === 'T1' ? 0 : 1;
      const program = ev.actor === 'T1' ? t1 : t2;
      // a drain is the buffer moving, not the thread advancing a line
      if (ev.kind !== 'drain') {
        pointers[idx] = Math.min(program.length, pointers[idx] + 1);
      }
      steps.push(snapshot(ev.step, this.captionFor(ev), idx, ev, [ev.actor]));
    }

    const verdictT = run.events.length + 1;
    steps.push(
      snapshot(
        verdictT,
        run.correct
          ? `She served ${run.printed}. Everything that had happened was visible in time.`
          : `She served ${run.printed}. The work was done, it just could not be seen yet.`,
        null,
        {
          // after every store has drained the visible state is the same in
          // every scenario, which is the point: what differed was only WHEN
          visible: { x: 100, flag: 1 },
          pending: [],
          printed: run.printed,
          kind: 'print'
        },
        ['T1', 'T2']
      )
    );

    return steps;
  }

  /** The deck's instruction, said in the room it is happening in. */
  private captionFor(ev: BarrierEvent): string {
    switch (ev.kind) {
      case 'issue':
        return ev.action === 'x = 100'
          ? 'The kitchen puts the biryani in the serving dish, and it is on the counter at once.'
          : 'The kitchen calls "ready!", and it is heard at once.';
      case 'buffer':
        return ev.action === 'x = 100'
          ? 'The kitchen puts the biryani in the dish, but it has not reached the counter yet.'
          : 'The kitchen calls "ready!", but the call has not carried yet.';
      case 'barrier':
        return 'memory_barrier(), nothing more happens until what is already done is really out there.';
      case 'drain':
        return ev.action.startsWith('x')
          ? 'The dish reaches the counter. Now it can be seen.'
          : 'The call carries through. Now it can be heard.';
      case 'spin':
        return 'Ammu listens again, still no call, so she waits.';
      case 'pass':
        return 'Ammu hears "ready!" and gets up.';
      case 'print':
        return `She carries out whatever is in the dish, that is ${ev.printed}.`;
      default:
        return ev.caption;
    }
  }

  protected override mount(): void {
    super.mount();
    const svg = this.container.querySelector('svg');
    if (!svg) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'trace-inflight');
    svg.appendChild(g);
    this.inFlightGroup = g;
  }

  /**
   * TraceEngine's render, plus the one thing it has no concept of: a write
   * that has happened and cannot yet be read.
   *
   * The lane sits in the band below the two columns, because the horizontal
   * gap between the columns is 20px at view 0 and 16px at view 1, measured,
   * not assumed, and four pixels cannot carry a meaning. The first version of
   * this lesson put the tokens in that gap and claimed it as the morph; the
   * text overflowed its box and the geometry barely moved. See the header.
   */
  protected override render(state: TraceState, view: number): void {
    super.render(state, view);
    const g = this.inFlightGroup;
    if (!g) return;
    const s = state as BarrierTraceState;
    const v = Math.max(0, Math.min(1, view));
    g.replaceChildren();

    const ns = 'http://www.w3.org/2000/svg';
    const pending = s.pending ?? [];

    // The band is named in both views, and the name is the whole lesson.
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('id', 'inflight-label');
    // the label tracks what it names, or it reads as belonging to nothing
    label.setAttribute('x', String(LANE_X + (BUFFER_X - LANE_X) * v));
    label.setAttribute('y', String(LANE_LABEL_Y));
    label.setAttribute('font-size', '9');
    label.setAttribute('font-weight', '700');
    label.setAttribute('letter-spacing', '0.06em');
    label.setAttribute('fill', 'var(--muted)');
    label.textContent = v < 0.5 ? 'THE HALLWAY' : 'T2 STORE BUFFER';
    g.appendChild(label);

    if (pending.length === 0) {
      const empty = document.createElementNS(ns, 'text');
      empty.setAttribute('id', 'inflight-empty');
      empty.setAttribute('x', String(LANE_X));
      empty.setAttribute('y', String(LANE_Y + 14));
      empty.setAttribute('font-size', '10');
      empty.setAttribute('fill', 'var(--muted)');
      empty.textContent =
        v < 0.5 ? 'Nothing on its way, the room is up to date.' : 'Buffer empty, everything issued is visible.';
      g.appendChild(empty);
      return;
    }

    pending.forEach((p, i) => {
      // Strung out along the corridor in the analogy; stacked in a buffer in
      // the mechanism. A corridor has length and things in it sit apart in
      // space; a buffer has no length, only order.
      const aX = LANE_X + i * HALL_STRIDE;
      const aY = LANE_Y;
      const mX = BUFFER_X;
      const mY = LANE_Y + i * BUFFER_STRIDE;
      const x = aX + (mX - aX) * v;
      const y = aY + (mY - aY) * v;
      const w = HALL_TOKEN_W + (BUFFER_TOKEN_W - HALL_TOKEN_W) * v;

      const box = document.createElementNS(ns, 'rect');
      box.setAttribute('id', `inflight-${p.name}`);
      box.setAttribute('x', String(x));
      box.setAttribute('y', String(y));
      box.setAttribute('width', String(w));
      box.setAttribute('height', '19');
      box.setAttribute('rx', String(9.5 - 5.5 * v));
      box.setAttribute('fill', 'var(--surface)');
      box.setAttribute('stroke', 'var(--waiting)');
      box.setAttribute('stroke-width', '1.5');
      box.setAttribute('stroke-dasharray', '3 2');

      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('id', `inflight-text-${p.name}`);
      txt.setAttribute('x', String(x + w / 2));
      txt.setAttribute('y', String(y + 13.5));
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-size', '10');
      txt.setAttribute('font-family', 'var(--font-mono)');
      txt.setAttribute('fill', 'var(--waiting)');
      txt.textContent = v < 0.5 ? TOKEN_ANALOGY[p.name] : `${p.name} = ${p.value}`;

      g.append(box, txt);
    });
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div>
        <h3 style="font-size: 0.78rem; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 3px; color: var(--ink);">Change the ordering, then put the barrier in</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson24Scenario[])
            .map(
              (id) => `
            <button type="button" class="l24-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `
            )
            .join('')}
        </div>
      </div>
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid var(--hairline);">
        <h4 style="font-size: 0.76rem; font-weight: 600; margin: 0 0 3px; color: var(--ink);">The older idea: switch the interruptions off</h4>
        <div id="l24-cores" style="font-size: 0.66rem; color: var(--muted); line-height: 1.45;"></div>
      </div>
    `;
    host.querySelectorAll('.l24-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson24Scenario);
      });
    });
    this.paintCores(host);
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.paintScoreboard());
    this.paintScoreboard();
  }

  private paintCores(host: HTMLElement): void {
    const box = host.querySelector('#l24-cores');
    if (!(box instanceof HTMLElement)) return;
    box.innerHTML = INTERRUPT_CORES.map((c) => {
      const r = evaluateInterruptMasking(c);
      return `<span style="font-family: var(--font-mono); color: ${r.safe ? 'var(--running)' : 'var(--waiting)'};">${r.cores} core${r.cores === 1 ? '' : 's'} → ${r.unprotectedCores} still free</span>`;
    }).join(' · ');
  }

  public applyScenario(id: Lesson24Scenario): void {
    if (!id || id === this.scenario || !SCENARIOS[id]) return;
    this.scenario = id;
    this.input.threads = threadsFor(id);
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.paintScoreboard();
  }

  public getScenario(): Lesson24Scenario {
    return this.scenario;
  }

  private paintScoreboard(): void {
    const host = this.scoreboardHost;
    if (!host) return;
    const run = runOf(this.scenario);
    const spec = SCENARIOS[this.scenario];
    const tone = run.correct ? 'var(--running)' : 'var(--waiting)';
    host.innerHTML = `
      <div style="display: flex; gap: calc(var(--step) * 2); flex-wrap: wrap; align-items: baseline;">
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Output (T1)</div>
          <div style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: ${tone};">${run.printed}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Memory model</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink);">${run.model === 'strong' ? 'strongly ordered' : 'weakly ordered'}${run.barriers ? ' + barrier' : ''}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Guaranteed?</div>
          <div style="font-size: 0.72rem; color: ${tone};">${guaranteeOf(this.scenario)}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">What happened</div>
          <div style="font-size: 0.72rem; color: var(--ink);">${spec.gist}</div>
        </div>
      </div>
    `;
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson24Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getRun: () => runOf(this.scenario),
      getGuarantee: () => guaranteeOf(this.scenario),
      getCores: () => INTERRUPT_CORES.map((c) => evaluateInterruptMasking(c))
    };
  }
}

/**
 * The honest verdict, and the reason 'lucky' is a scenario at all: under weak
 * ordering the SAME program prints 100 or 0 depending only on which store
 * drains first, so a run that printed 100 proves nothing. Computed by trying
 * every drain order, never asserted.
 */
export function guaranteeOf(id: Lesson24Scenario): string {
  const spec = SCENARIOS[id];
  const orders: ('x' | 'flag')[][] = [
    ['x', 'flag'],
    ['flag', 'x']
  ];
  const results = orders.map((o) => simulateMemoryBarrier(spec.model, spec.barriers, o).printed);
  const allCorrect = results.every((r) => r === 100);
  if (allCorrect) return 'yes, every ordering prints 100';
  const bad = results.filter((r) => r !== 100).length;
  return `no, ${bad} of ${orders.length} orderings print ${results.find((r) => r !== 100)}`;
}

export function threadsFor(id: Lesson24Scenario) {
  const barriers = SCENARIOS[id].barriers;
  return [
    {
      id: 'T1',
      name: ACTOR_NAMES.T1,
      analogyName: ACTOR_ANALOGY.T1,
      instructions: programFor('T1', barriers),
      analogyInstructions: analogyProgramFor('T1', barriers),
      color: 'var(--accent)'
    },
    {
      id: 'T2',
      name: ACTOR_NAMES.T2,
      analogyName: ACTOR_ANALOGY.T2,
      instructions: programFor('T2', barriers),
      analogyInstructions: analogyProgramFor('T2', barriers),
      color: 'var(--running)'
    }
  ];
}

export function scenarioInput(id: Lesson24Scenario): TraceInput {
  return {
    threads: threadsFor(id),
    interleaving: [],
    initial: { x: 0, flag: 0 },
    analogy: {
      domain: 'food',
      title: 'The kitchen and the table',
      // not "what both sides share", the panel shows what is VISIBLE, which
      // is precisely what the table can read and the kitchen may have moved on from
      memoryTitle: 'WHAT THE TABLE CAN SEE',
      labels: { x: VAR_ANALOGY.x, flag: VAR_ANALOGY.flag }
    }
  };
}

export const lesson24Input: TraceInput = scenarioInput('broken');

export const lesson24: Lesson<TraceInput, TraceState> = {
  id: 24,
  lecture: 9,
  slug: 'lesson-24',
  title: 'The barrier',
  absorbsUnits: [47, 48, 49],
  slides: 'slides 3–5',
  engine: 'trace',
  engineClass: Lesson24TraceEngine,
  lensLabels: {
    analogy: '🍛 The kitchen and the table',
    mechanism: '🚧 Two threads and a memory barrier',
    analogyTitle: 'View as the kitchen calling through to the table',
    mechanismTitle: 'View as weakly ordered memory and the barrier that fixes it'
  },
  analogy: {
    domain: 'food',
    text: 
      'Ammu is at the table waiting for the food, and the kitchen is through the doorway.\n\n' +
      'The rule in this house is simple. The kitchen puts the biryani in the serving dish, then calls out that it is ready. Ammu hears the call and carries out whatever is in the dish.\n\n' +
      'On a good night that works exactly as intended.\n\n' +
      'On a bad night the call arrives before the dish does. Not because anyone got the order wrong. The kitchen did put the biryani in first, exactly as it was supposed to. It is just that a shout travels across a flat faster than a dish carried by hand, so what Ammu can hear and what Ammu can see stop agreeing with each other for a moment.\n\n' +
      'She hears ready, she goes to the counter, and she carries out an empty plate. The cooking was done. It simply had not arrived yet.'
  },
  concept:
    'A memory model is the set of guarantees an architecture makes about when one processor\'s writes become visible to the others. Under a strongly ordered model a modification by one processor is immediately visible to all the rest, so nothing can slip. Under a weakly ordered model it may not be, a write can have definitely executed and still be unreadable by another processor, and two writes can become visible in the opposite order to the one they were issued in. That is why Lesson 12\'s printout could come out 0 when the program plainly says 100: not because the store did not run, but because the announcement arrived before it did. A memory barrier is an instruction that forces every change already made to be propagated to all other processors before execution continues, which is what pins the two writes into an order that can be relied on. Putting a barrier between x = 100 and flag = true, and another between the spin loop and the read, is what makes Thread 1 output 100 on every run rather than on the lucky ones. The older answer to all of this, simply disabling interrupts, works on a uniprocessor, because the code then runs without preemption, but it protects only the processor that does it, so it is generally too inefficient and not broadly scalable on multiprocessor systems.',
  morphReveals:
    'In the hallway, where a thing sits is how far along it has got: the dish and the call are strung out down the corridor, spaced apart, and you can point at which one is further on. On the machine side those same two collapse into a stack at one fixed spot, because a store buffer has no length, position stops meaning distance and starts meaning nothing at all, only order survives. That is precisely what makes weakly ordered memory dangerous: you cannot look and see how far along a write is, so "the store has run" and "the store can be read" come apart with nothing on screen to warn you.',
  morphMode: 'morph',
  analogyMapping: [
    'The kitchen ➔ Thread 2, issuing the writes',
    'Ammu listening at the table ➔ Thread 1, spinning on while (!flag)',
    'What is in the serving dish ➔ the shared variable x',
    'The call of "ready!" ➔ the shared variable flag',
    'Where a thing sits in the hallway ➔ nothing, a store buffer has order, not distance',
    'Everyone hearing things in the same order ➔ a strongly ordered memory model, slide 4',
    'The call outrunning the dish ➔ weakly ordered memory. L12\'s printed 0, explained',
    'Saying nothing until it is really out there ➔ memory_barrier(), slide 5',
    'Telling the whole house not to disturb one cook ➔ disabling interrupts, slide 3'
  ],
  input: lesson24Input
};

export default lesson24;
