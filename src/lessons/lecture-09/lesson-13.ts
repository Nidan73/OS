import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import {
  CounterEngine,
  type CounterInput,
  type CounterState
} from '../../engines/counter.js';
import {
  simulateAtomicSteps,
  simulateAtomicIncrement,
  simulateCompareAndSwap,
  simulateTestAndSetLock,
  type AtomicMechanism,
  type AtomicTraceResult,
  type AtomicIncrementResult
} from '../../algorithms/synchronization.js';

// DENSITY (Task A audit): correct at 11 — the six trace beats (free, read,
// read, write, write, verdict: the full look-then-grab window) plus the five
// computed tally beats from simulateAtomicIncrement (start, stale snapshot,
// lost update, refused swap + retry, landed retry). The CAS side is the same
// eleven beats under the playground toggle — a different outcome over the same
// event shape, not new events.
// ─────────────────────────────────────────────────────────────────────────────
// L13 · One indivisible motion (ATLAS units 50–55, slides 6–13)
//
// ENGINE VERDICT (a): extend CounterEngine and use its render() unmodified.
// Why: the lesson IS two threads racing for one holder slot with a waiting
// area — exactly the shape CounterEngine renders (meter + holder + waiting,
// [id^="bar-<actor>"] tokens that widen 54→84px across `view`, analogy labels
// at view<0.5). Overriding render() would reimplement identical interpolation
// for no gain; a standalone would too. The lesson adds the atomicity story:
// buildSteps maps simulateAtomicSteps() 1:1 onto CounterState, and the
// playground's CAS framing comes from simulateCompareAndSwap.
// The deck's TAS story is two threads seeing the same free state: deck slide 8
// spins on test_and_set returning a stale read; our trace makes the split
// explicit as read-then-write so the window another thread fits inside is a
// visible step, not an assertion.
//
// The carrying property of the morph is WIDTH-as-claim (equal 54px hook bodies
// → holder 96 / waiter 60 lock tokens, computed from state.holders/waiting).
// At the hook by the door, width means a body. In the lock, width means the
// claim on the car: holders fill it wide, waiters compress. Split-vs-fused then
// reads as occupancy — two wide holders versus one — and the look/grab window
// itself is carried by the steps (read, read, write, write vs one fused grab)
// plus the tally beats, not by the width.
// ─────────────────────────────────────────────────────────────────────────────

export interface AtomicParams {
  mechanism: AtomicMechanism;
  atomic: boolean;
}

export const DEFAULT_ATOMIC: AtomicParams = { mechanism: 'tas', atomic: false };

type MechanismKey = AtomicMechanism;

export const MECHANISMS: Array<{ id: MechanismKey; label: string; deck: string }> = [
  { id: 'tas', label: 'test_and_set', deck: 'slides 6–8' },
  { id: 'cas', label: 'compare_and_swap', deck: 'slides 9–10' }
];

/** Live trace — computed on every call, never cached, never typed. */
export function atomicTrace(p: AtomicParams): AtomicTraceResult {
  return simulateAtomicSteps(p.mechanism, p.atomic);
}

/** The atomic counter, CAS-retrying (slide 13) against a stale plain version. */
export function atomicIncrement(): AtomicIncrementResult {
  return simulateAtomicIncrement();
}

function tasVerdict(): ReturnType<typeof simulateTestAndSetLock> {
  return simulateTestAndSetLock(false);
}

function casVerdict(): ReturnType<typeof simulateCompareAndSwap> {
  return simulateCompareAndSwap(false);
}

/**
 * Pure mapping: simulateAtomicSteps output → CounterEngine steps. One trace
 * step becomes one CounterState: the same lock meter, the same entered set
 * as holders, the same waiting queue. Nothing on screen is typed.
 */
export function atomicSteps(p: AtomicParams): Step<CounterState>[] {
  const trace = atomicTrace(p);
  const inc = simulateAtomicIncrement();
  const mapped = trace.steps.map((s) => {
    const action = s.action === 'free' ? 'acquire'
      : s.action === 'release' ? 'release'
      : s.action === 'verdict' ? 'fail'
      : s.entered.includes(s.actorId) ? 'acquire'
      : s.waiting.includes(s.actorId) ? 'spin'
      : 'spin';
    return {
      t: s.step,
      caption: s.caption.slice(0, 120),
      highlight: s.actorId === '—' ? [] : [s.actorId],
      state: {
        stepIndex: s.step,
        value: s.lock === 0 ? 1 : 0,
        capacity: 1,
        activeActorId: s.actorId === '—' ? null : s.actorId,
        holders: [...s.entered],
        waiting: [...s.waiting],
        action,
        caption: s.caption
      }
    };
  });
  // Unit 55, same lesson: the tally counter application code actually uses.
  // Each beat is computed by simulateAtomicIncrement — the plain snapshot, the
  // lost update, the refused swap, the retry that lands — not a summary.
  const base = mapped.length;
  const tallyHolders = trace.bothEnteredCS ? ['T1', 'T2'] : ['T1'];
  mapped.push(
    {
      t: base,
      caption: `The tally starts at ${inc.start}: two threads each add one, expecting ${inc.expected}.`,
      highlight: ['T1', 'T2'],
      state: {
        stepIndex: base, value: 1, capacity: 1, activeActorId: 'T1',
        holders: [], waiting: [], action: 'acquire',
        caption: `The tally starts at ${inc.start}.`
      }
    },
    {
      t: base + 1,
      caption: `Without atomics both threads snapshot ${inc.start} — one update is already doomed.`,
      highlight: ['T1', 'T2'],
      state: {
        stepIndex: base + 1, value: 0, capacity: 1, activeActorId: 'T2',
        holders: [], waiting: ['T1', 'T2'], action: 'spin',
        caption: 'Both threads snapshot the same stale value.'
      }
    },
    {
      t: base + 2,
      caption: `The plain tally lands at ${inc.finalPlain}, not ${inc.expected} — ${inc.lostPlain} update lost.`,
      highlight: ['T1'],
      state: {
        stepIndex: base + 2, value: 0, capacity: 1, activeActorId: 'T1',
        holders: [...tallyHolders], waiting: [], action: 'fail',
        caption: `The plain tally lands at ${inc.finalPlain} — one update lost.`
      }
    },
    {
      t: base + 3,
      caption: `Through compare_and_swap the second swap refuses and retries ${inc.retriesCAS}x — nothing is lost.`,
      highlight: ['T2'],
      state: {
        stepIndex: base + 3, value: 0, capacity: 1, activeActorId: 'T2',
        holders: ['T1'], waiting: ['T2'], action: 'spin',
        caption: 'The CAS swap refuses on the stale expectation.'
      }
    },
    {
      t: base + 4,
      caption: `The retry lands: the CAS tally ends at ${inc.finalCAS}, every update kept.`,
      highlight: ['T2'],
      state: {
        stepIndex: base + 4, value: 0, capacity: 1, activeActorId: 'T2',
        holders: ['T1', 'T2'], waiting: [], action: 'acquire',
        caption: `The CAS tally ends at ${inc.finalCAS}.`
      }
    }
  );
  return mapped;
}

export interface AtomicLessonInput extends CounterInput {
  params: AtomicParams;
}

export function atomicLessonInput(p: AtomicParams): AtomicLessonInput {
  const trace = atomicTrace(p);
  const events = trace.steps.slice(1).map((s) => ({
    actorId: s.actorId === '—' ? 'T1' : s.actorId,
    action: 'acquire' as const,
    caption: s.caption.slice(0, 120)
  }));
  return {
    params: { ...p },
    initial: 1,
    capacity: 1,
    mode: 'spin',
    resourceLabel: p.mechanism === 'tas' ? 'LOCK (0 = FREE)' : 'TAG (EXPECTS 0)',
    actors: [
      { id: 'T1', name: 'T1', analogyName: 'Father' },
      { id: 'T2', name: 'T2', analogyName: 'Mother' }
    ],
    events,
    analogy: {
      domain: 'friends',
      resourceLabel: 'THE HOOK (KEY THERE?)',
      holderLabel: 'THE CAR (KEY HOLDER)',
      waitingLabel: 'AT THE HOOK (CHECKING)',
      actorNames: { T1: 'Father', T2: 'Mother' }
    }
  };
}

const MODE_BUTTONS: Array<{ mechanism: MechanismKey; atomic: boolean; label: string }> = [
  { mechanism: 'tas', atomic: false, label: 'Look, then grab (split)' },
  { mechanism: 'tas', atomic: true, label: 'Look-and-grab as one act' },
  { mechanism: 'cas', atomic: false, label: 'Check the tag, then act (split)' },
  { mechanism: 'cas', atomic: true, label: 'Check-and-swap as one act' }
];

/**
 * Lesson 13's engine, scoped to this lesson. Uses CounterEngine.render()
 * unchanged — the lesson adds the atomicity story: steps come from
 * atomicSteps() (the simulateAtomicSteps trace mapped 1:1, plus the computed
 * tally beats), and the playground re-maps them on every toggle. Steps are
 * never re-derived from CounterInput.events — the events array exists for
 * input-shape compatibility only; the trace mapping is the single source.
 */
export class AtomicCounterEngine extends CounterEngine implements PlaygroundCapable {
  protected declare input: AtomicLessonInput;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: CounterInput): Step<CounterState>[] {
    const params = (input as AtomicLessonInput).params ?? { ...DEFAULT_ATOMIC };
    return atomicSteps(params);
  }

  /** The live result, computed on every call — never cached, never typed. */
  public getTrace(): AtomicTraceResult {
    return atomicTrace(this.input.params);
  }

  public getParams(): AtomicParams {
    return { ...this.input.params };
  }

  public getIncrement(): AtomicIncrementResult {
    return atomicIncrement();
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setAtomic: (patch: Partial<AtomicParams>) => this.applyParams(patch),
      getParams: () => this.getParams(),
      getTrace: () => this.getTrace(),
      getIncrement: () => this.getIncrement()
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    const p = this.getParams();
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">One motion or two — run the same race both ways</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${MODE_BUTTONS.map((m) => `
            <button type="button" class="l13-mode" data-mechanism="${m.mechanism}" data-atomic="${m.atomic}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${p.mechanism === m.mechanism && p.atomic === m.atomic ? 'var(--accent)' : 'var(--hairline)'}; color: ${p.mechanism === m.mechanism && p.atomic === m.atomic ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${m.label}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">The same two threads run in both modes — only whether look-and-grab is one motion changes.</div>
    `;

    host.querySelectorAll('.l13-mode').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el as HTMLElement;
        this.applyParams({
          mechanism: target.dataset.mechanism as AtomicMechanism,
          atomic: target.dataset.atomic === 'true'
        });
      });
    });

    this.renderScoreboard();
  }

  private applyParams(patch: Partial<AtomicParams>): void {
    const next = { ...this.getParams(), ...patch };
    this.input.params = next;
    const keepIndex = 0;
    this.setSteps(this.buildSteps(this.input));
    this.seek(keepIndex);
    const host = this.container.closest('.unit-center-col')?.querySelector('#playground');
    if (host) this.renderPlayground(host as HTMLElement, this.scoreboardHost ?? undefined);
    else this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const trace = this.getTrace();
    const inc = this.getIncrement();
    const tas = tasVerdict();
    const cas = casVerdict();
    const ok = !trace.bothEnteredCS;
    const verdictColor = ok ? 'var(--running)' : 'var(--waiting)';
    const verdictBg = ok ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)';
    const verdictText = ok ? '🟢 One holder — the car is safe' : '🔴 Two holders, one key — corrupted';
    const mechName = trace.mechanism === 'tas' ? 'test_and_set' : 'compare_and_swap';
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Race check · ${mechName}</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdictBg}; color: ${verdictColor}; border: 1px solid ${verdictColor};">${verdictText}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">This run</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${ok ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">${trace.handoffOrder.join(' → ') || '—'}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${trace.atomic ? 'fused: one motion' : 'split: two motions'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Both primitives agree</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600;">TAS split:</span><span style="color: ${tas.bothEnteredCS ? 'var(--waiting)' : 'var(--running)'}; font-weight: 600;">${tas.bothEnteredCS ? 'both in' : 'one in'}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600;">CAS split:</span><span style="color: ${cas.bothEnteredCS ? 'var(--waiting)' : 'var(--running)'}; font-weight: 600;">${cas.bothEnteredCS ? 'both in' : 'one in'}</span></div>
          </div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The tally you would use</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px;">plain ends ${inc.finalPlain}, should be ${inc.expected} — one lost</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem;">CAS ends ${inc.finalCAS} after ${inc.retriesCAS} retry — none lost</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson13Input: AtomicLessonInput = atomicLessonInput(DEFAULT_ATOMIC);

export const lesson13: Lesson<AtomicLessonInput, CounterState> = {
  id: 13,
  lecture: 9,
  slug: 'lesson-13',
  title: 'One Indivisible Motion',
  absorbsUnits: [50, 51, 52, 53, 54, 55],
  slides: 'slides 6–13',
  engine: 'counter',
  engineClass: AtomicCounterEngine,
  lensLabels: {
    analogy: '🔑 The car key',
    mechanism: '⚙️ test_and_set · compare_and_swap',
    analogyTitle: 'View as father and mother and one key on a hook',
    mechanismTitle: 'View as the lock the hardware guards'
  },
  analogy: {
    domain: 'friends',
    text: 'The car key hangs on one hook by the door. Looking at the hook and grabbing the key happen as a single motion — nobody can look while another hand is already closing, so father and mother never drive off holding the same key.'
  },
  concept:
    'Hardware offers two indivisible primitives for the doorway in one lesson. test_and_set reads the lock and claims it before any other thread can slip between the read and the claim; compare_and_swap goes further and only swaps when the lock still reads what was expected, so a price change mid-transaction cannot slip through. Either one builds a lock by spinning until it reads free — correct, and wasteful — and the bounded-waiting variant hands the key to the next waiter in line instead of hanging it back, so nobody is skipped forever. Wrapped once more, the same primitive becomes the tally counter application code actually uses.',
  morphReveals:
    'At the hook every token is the same width — a body standing at the door — and the gap between looking and grabbing is empty wall space, just how far a hand travels. In the lock width stops meaning a body and starts meaning the claim on the car: the holder fills it wide while waiters compress, so the split run shows two wide holders where the fused run shows one. The window itself is in the steps — read, read, write, write versus one fused grab — and the tally beats prove what it costs.',
  morphMode: 'morph',
  analogyMapping: [
    'Looking at the hook ➔ reading the lock (test) / checking the tag (compare)',
    'Grabbing the key ➔ claiming the lock (set) / writing the new value (swap)',
    'One indivisible motion ➔ the hardware fuses read and write — no gap',
    'Standing at the hook checking every second ➔ spinning on the lock',
    'Handing the key to the next in line ➔ bounded waiting: the exiting thread wakes waiter one',
    'The tally counter ➔ increment() retried through compare_and_swap until the swap lands'
  ],
  input: lesson13Input
};

export default lesson13;
