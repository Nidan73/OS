import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import {
  CounterEngine,
  type CounterInput,
  type CounterState
} from '../../engines/counter.js';
import {
  evaluateLockCost,
  type LockCostModel
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// L14 · Locks, and the cost of waiting at the door (ATLAS units 56, 57,
// slides 14–16)
//
// PROVENANCE (brief §3, deck-checked 2026-09-10): the Lecture 9 deck does NOT
// state contextSwitchCostUs = 10 or cpuFreqGHz = 3.0 anywhere — slides 14–16
// carry no timing numbers at all. So both are playground sliders, never
// invisible defaults: the learner sets the critical-section length, the
// switch cost and the clock, and the verdict recomputes live.
//
// ENGINE VERDICT (a): extend CounterEngine and use its render() unmodified.
// Why: the lesson IS one holder in a room with a queue at the door —
// exactly the shape CounterEngine renders (meter + holder + waiting,
// [id^="bar-<actor>"] tokens that widen 54→84px across `view`, analogy labels
// at view<0.5). The spin-vs-block story is told by WHICH queue the waiters
// stand in and what the scoreboard computes, not by new geometry.
// Overriding render() would reimplement identical interpolation for no gain.
//
// The carrying property of the morph is OCCUPANCY-AS-WIDTH. At the hotel each
// token is a person — width means a body, and the queue at the door is
// shoulder-to-shoulder regardless of how long the occupant stays. In the lock
// width means the claim on the room (holder wide, waiters compressed); the
// stay length is priced in the computed captions and scoreboard, not the
// width — dragging it moves the spin bill past the wakeup price. Same tokens,
// same queue — width changes what it means, numbers change what they cost.
// ─────────────────────────────────────────────────────────────────────────────

export interface LockParams {
  /** How long the holder keeps the room, in µs — the dragged quantity. */
  csDurationUs: number;
  /** What a sit-down-and-wakeup costs, in µs — a slider, not a default. */
  contextSwitchCostUs: number;
  /** Clock driving the cycle counts, in GHz — a slider, not a default. */
  cpuFreqGHz: number;
  /** How the waiters wait: jiggle the handle, or sit down. */
  mode: 'spin' | 'block';
}

export const LOCK_RANGES = {
  csDurationUs: { min: 1, max: 40 },
  contextSwitchCostUs: { min: 1, max: 40 },
  cpuFreqGHz: { min: 1, max: 5 }
} as const;

type LockKey = keyof LockParams;

export const DEFAULT_LOCK: LockParams = {
  csDurationUs: 4,
  contextSwitchCostUs: 10,
  cpuFreqGHz: 3,
  mode: 'spin'
};

/** Live cost model — computed on every call, never cached, never typed. */
export function lockCosts(p: LockParams): LockCostModel {
  return evaluateLockCost(p.csDurationUs, p.contextSwitchCostUs, p.cpuFreqGHz);
}

/**
 * Pure mapping: evaluateLockCost output → CounterEngine steps. One holder
 * keeps the room while two waiters queue; the holder leaves, the first
 * waiter is handed the key (bounded waiting, cf. L13). The meter reads the
 * wait in the currency of the mode: spinning burns cycles on the CPU, so
 * the meter shows the spin-wasted cycles; blocking pays the switch, so the
 * meter shows the switch cost. Both numbers come from lockCosts().
 */
export function lockSteps(p: LockParams): Step<CounterState>[] {
  const m = lockCosts(p);
  const waiting: 'spin' | 'block' = p.mode;
  const price = waiting === 'spin' ? m.spinWastedCycles : m.contextSwitchWastedCycles;
  const how = waiting === 'spin'
    ? 'jiggling the handle'
    : 'seated, ticket in hand';
  const arriveCaption = waiting === 'spin'
    ? 'jiggles the handle — each burned cycle prices the wait.'
    : 'sits down, ticket in hand — the wait prices at one wakeup.';
  return [
    {
      t: 0,
      caption: 'One key, one room. The holder steps in; the door queue is empty.',
      highlight: [],
      state: {
        stepIndex: 0, value: 1, capacity: 1, activeActorId: null,
        holders: [], waiting: [], action: 'init',
        caption: 'Initial state before synchronization events.'
      }
    },
    {
      t: 1,
      caption: `The holder takes the key for ${m.csDurationUs}µs.`,
      highlight: ['T1'],
      state: {
        stepIndex: 1, value: 0, capacity: 1, activeActorId: 'T1',
        holders: ['T1'], waiting: [], action: 'acquire',
        caption: `The holder takes the key for ${m.csDurationUs}µs.`
      }
    },
    {
      t: 2,
      caption: `The first waiter arrives and ${arriveCaption}`,
      highlight: ['T2'],
      state: {
        stepIndex: 2, value: 0, capacity: 1, activeActorId: 'T2',
        holders: ['T1'], waiting: ['T2'], action: 'spin',
        caption: 'The first waiter queues at the door.'
      }
    },
    {
      t: 3,
      caption: `The second waiter queues ${how} behind the first.`,
      highlight: ['T3'],
      state: {
        stepIndex: 3, value: 0, capacity: 1, activeActorId: 'T3',
        holders: ['T1'], waiting: ['T2', 'T3'], action: 'spin',
        caption: 'Two waiters queue at the door.'
      }
    },
    {
      t: 4,
      caption: waiting === 'spin'
        ? `Both waiters jiggle — the wait prices at ${price} burned cycles.`
        : `Both waiters sit — the wait prices at one ${price}-cycle wakeup.`,
      highlight: ['T2', 'T3'],
      state: {
        stepIndex: 4, value: 0, capacity: 1, activeActorId: 'T2',
        holders: ['T1'], waiting: ['T2', 'T3'], action: 'spin',
        caption: 'The queue waits out the stay.'
      }
    },
    {
      t: 5,
      caption: 'The holder returns the key after its stay.',
      highlight: ['T1'],
      state: {
        stepIndex: 5, value: 1, capacity: 1, activeActorId: 'T1',
        holders: [], waiting: ['T2', 'T3'], action: 'release',
        caption: 'The holder returns the key.'
      }
    },
    {
      t: 6,
      caption: m.preferSpinlock
        ? `Short stay: spinning wastes ${m.spinWastedCycles} cycles, less than a ${m.contextSwitchWastedCycles}-cycle wakeup.`
        : `Long stay: spinning would waste ${m.spinWastedCycles} cycles — sitting down costs ${m.contextSwitchWastedCycles}.`,
      highlight: ['T1'],
      state: {
        stepIndex: 6, value: 1, capacity: 1, activeActorId: 'T1',
        holders: [], waiting: ['T2', 'T3'], action: 'release',
        caption: 'The stay is priced both ways.'
      }
    },
    {
      t: 7,
      caption: 'The key goes to the first waiter in line — nobody is skipped.',
      highlight: ['T2'],
      state: {
        stepIndex: 7, value: 0, capacity: 1, activeActorId: 'T2',
        holders: ['T2'], waiting: ['T3'], action: 'acquire',
        caption: 'Handoff to the first waiter.'
      }
    }
  ];
}

export interface LockLessonInput extends CounterInput {
  params: LockParams;
}

export function lockLessonInput(p: LockParams): LockLessonInput {
  return {
    params: { ...p },
    initial: 1,
    capacity: 1,
    mode: p.mode,
    resourceLabel: 'THE KEY (1 = ON HOOK)',
    actors: [
      { id: 'T1', name: 'T1', analogyName: 'Guest A' },
      { id: 'T2', name: 'T2', analogyName: 'Guest B' },
      { id: 'T3', name: 'T3', analogyName: 'Guest C' }
    ],
    events: [
      { actorId: 'T1', action: 'acquire', caption: 'The holder takes the key.' },
      { actorId: 'T2', action: 'spin', caption: 'Two waiters queue at the door.' },
      { actorId: 'T1', action: 'release', caption: 'The holder returns the key.' },
      { actorId: 'T2', action: 'acquire', caption: 'Handoff to the first waiter.' }
    ],
    analogy: {
      domain: 'travel',
      resourceLabel: 'THE KEY (ON THE HOOK?)',
      holderLabel: 'THE ROOM (OCCUPIED)',
      waitingLabel: 'AT THE DOOR (QUEUING)',
      actorNames: { T1: 'Guest A', T2: 'Guest B', T3: 'Guest C' }
    }
  };
}

const MODE_SWITCH: Array<{ mode: 'spin' | 'block'; label: string }> = [
  { mode: 'spin', label: 'Jiggle the handle (spin)' },
  { mode: 'block', label: 'Sit down (block / wakeup)' }
];

/**
 * Lesson 14's engine, scoped to this lesson. Uses CounterEngine.render()
 * unchanged — the lesson adds the cost story: steps come from lockSteps()
 * and the playground re-maps them on every slider move.
 */
export class LockCounterEngine extends CounterEngine implements PlaygroundCapable {
  protected declare input: LockLessonInput;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: CounterInput): Step<CounterState>[] {
    const params = (input as LockLessonInput).params ?? { ...DEFAULT_LOCK };
    return lockSteps(params);
  }

  /** The live result, computed on every call — never cached, never typed. */
  public getCosts(): LockCostModel {
    return lockCosts(this.input.params);
  }

  public getParams(): LockParams {
    return { ...this.input.params };
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setLock: (patch: Partial<LockParams>) => this.applyParams(patch),
      getParams: () => this.getParams(),
      getCosts: () => this.getCosts()
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    const p = this.getParams();
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">How long is the stay — drag it past the wakeup price</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${MODE_SWITCH.map((m) => `
            <button type="button" class="l14-mode" data-mode="${m.mode}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${p.mode === m.mode ? 'var(--accent)' : 'var(--hairline)'}; color: ${p.mode === m.mode ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${m.label}</button>
          `).join('')}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 12px; margin-top: 2px;">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <label for="l14-csDurationUs" style="font-size: 0.72rem; font-weight: 600; color: var(--ink); white-space: nowrap;">Stay length (µs)</label>
          <input type="range" id="l14-csDurationUs" data-param="csDurationUs" min="${LOCK_RANGES.csDurationUs.min}" max="${LOCK_RANGES.csDurationUs.max}" step="1" value="${p.csDurationUs}" aria-label="Critical section length in microseconds" style="flex: 1; min-width: 60px; height: 26px; cursor: pointer;" />
          <span id="l14-csDurationUs-val" style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--accent); min-width: 52px; text-align: right;">${p.csDurationUs} µs</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <label for="l14-contextSwitchCostUs" style="font-size: 0.72rem; font-weight: 600; color: var(--ink); white-space: nowrap;">Wakeup price (µs)</label>
          <input type="range" id="l14-contextSwitchCostUs" data-param="contextSwitchCostUs" min="${LOCK_RANGES.contextSwitchCostUs.min}" max="${LOCK_RANGES.contextSwitchCostUs.max}" step="1" value="${p.contextSwitchCostUs}" aria-label="Context switch cost in microseconds" style="flex: 1; min-width: 60px; height: 26px; cursor: pointer;" />
          <span id="l14-contextSwitchCostUs-val" style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--accent); min-width: 52px; text-align: right;">${p.contextSwitchCostUs} µs</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <label for="l14-cpuFreqGHz" style="font-size: 0.72rem; font-weight: 600; color: var(--ink); white-space: nowrap;">Clock (GHz)</label>
          <input type="range" id="l14-cpuFreqGHz" data-param="cpuFreqGHz" min="${LOCK_RANGES.cpuFreqGHz.min}" max="${LOCK_RANGES.cpuFreqGHz.max}" step="1" value="${p.cpuFreqGHz}" aria-label="CPU frequency in gigahertz" style="flex: 1; min-width: 60px; height: 26px; cursor: pointer;" />
          <span id="l14-cpuFreqGHz-val" style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--accent); min-width: 52px; text-align: right;">${p.cpuFreqGHz} GHz</span>
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">The switch cost and the clock are assumptions you set — the deck never states them — and the verdict follows them.</div>
    `;

    host.querySelectorAll('input[type="range"][data-param]').forEach((el) => {
      el.addEventListener('input', () => {
        const key = (el as HTMLElement).dataset.param as LockKey;
        this.applyParams({ [key]: Number((el as HTMLInputElement).value) } as Partial<LockParams>);
      });
    });
    host.querySelectorAll('.l14-mode').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyParams({ mode: (el as HTMLElement).dataset.mode as 'spin' | 'block' });
      });
    });

    this.renderScoreboard();
  }

  private applyParams(patch: Partial<LockParams>): void {
    const next = { ...this.getParams() };
    (Object.keys(patch) as LockKey[]).forEach((key) => {
      const raw = patch[key];
      if (typeof raw !== 'number' && key !== 'mode') return;
      if (key === 'mode') {
        next.mode = patch.mode ?? next.mode;
        return;
      }
      if (typeof raw !== 'number' || Number.isNaN(raw)) return;
      const { min, max } = LOCK_RANGES[key as 'csDurationUs' | 'contextSwitchCostUs' | 'cpuFreqGHz'];
      (next[key] as number) = Math.max(min, Math.min(max, Math.round(raw)));
    });
    this.input.params = next;
    this.input.mode = next.mode;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    const host = this.container.closest('.unit-center-col')?.querySelector('#playground');
    if (host) this.renderPlayground(host as HTMLElement, this.scoreboardHost ?? undefined);
    else this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const m = this.getCosts();
    const spin = m.preferSpinlock;
    const verdictColor = spin ? 'var(--running)' : 'var(--waiting)';
    const verdictBg = spin ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)';
    const verdictText = spin ? '🟢 Short stay — keep jiggling' : '🔴 Long stay — sit down instead';
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Wait check</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdictBg}; color: ${verdictColor}; border: 1px solid ${verdictColor};">${verdictText}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Spinning burns</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${spin ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">${m.spinWastedCycles}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">cycles for ${m.csDurationUs}µs at ${this.input.params.cpuFreqGHz}GHz</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Sitting down costs</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${m.contextSwitchWastedCycles}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">cycles for ${m.contextSwitchCostUs}µs</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The crossover</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px;">spinning wins below ${m.crossoverThresholdUs}µs</div>
          <div style="font-size: 0.68rem; color: var(--muted); margin-top: 2px;">Drag the stay through it and watch the verdict flip.</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson14Input: LockLessonInput = lockLessonInput(DEFAULT_LOCK);

export const lesson14: Lesson<LockLessonInput, CounterState> = {
  id: 14,
  lecture: 9,
  slug: 'lesson-14',
  title: 'Locks, and the Cost of Waiting at the Door',
  absorbsUnits: [56, 57],
  slides: 'slides 14–16',
  engine: 'counter',
  engineClass: LockCounterEngine,
  lensLabels: {
    analogy: '🏨 The hotel key',
    mechanism: '⚙️ acquire · release · spin vs block',
    analogyTitle: 'View as one hotel key and a queue at the door',
    mechanismTitle: 'View as the lock and what the wait burns'
  },
  analogy: {
    domain: 'travel',
    text: 'One hotel room, one key: take it, use the room, put it back. The waiters either jiggle the handle until it opens or sit down until they are called — and which waste is smaller depends entirely on how long the occupant stays.'
  },
  concept:
    'A mutex lock wraps the doorway so application code stops thinking about hardware: acquire the key, use the room, release it. Waiting has two prices. Spinning burns the processor for the whole stay and is genuinely cheapest when the occupant leaves at once; blocking pays a wakeup instead and wins every long stay. The crossover sits exactly at the wakeup price — set it, set the clock, and the verdict recomputes.',
  morphReveals:
    'At the hotel every token is the same width — a guest at the door — and the queue stays shoulder-to-shoulder however long the occupant stays. In the lock width stops meaning a body and starts meaning the claim on the room: the holder fills it wide while the queued compress behind. The stay itself is priced in numbers, not width — drag it and the spin bill climbs past the wakeup price until sitting down wins.',
  morphMode: 'morph',
  analogyMapping: [
    'One hotel key ➔ the mutex (available or held)',
    'Taking the key ➔ acquire()',
    'Putting it back ➔ release()',
    'Jiggling the handle ➔ spinning: the processor burns for the whole stay',
    'Sitting down until called ➔ blocking: one wakeup price, then sleep',
    'How long the occupant stays ➔ the dragged stay length that flips the verdict'
  ],
  input: lesson14Input
};

export default lesson14;
