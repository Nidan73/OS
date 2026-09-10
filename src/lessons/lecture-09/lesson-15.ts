import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import {
  CounterEngine,
  type CounterInput,
  type CounterState
} from '../../engines/counter.js';
import {
  simulateSemaphoreOps,
  type SemaphoreSimulationResult
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// L15 · Semaphores (ATLAS units 58–62, slides 17–22)
//
// ENGINE VERDICT (a): extend CounterEngine and use its render() unmodified.
// Why: the lesson IS a pool of identical slots with a live count, holders in
// the resource and a queue of seated waiters — exactly the shape
// CounterEngine renders (meter + holder + waiting, [id^="bar-<actor>"]
// tokens, analogy labels at view<0.5, negative counts shown as sleepers).
// The semaphore story is told by the COUNT, not by new geometry: it starts
// at the dock size, drops per take, and goes negative — where the negative
// is not a debt but the number of seated waiters. Overriding render() would
// reimplement identical interpolation for no gain.
//
// The carrying property of the morph is WIDTH-as-claim (equal dock bodies →
// plugged-in wide, seated compressed). The sign story is meter truth, not the
// carrying geometry: a negative count IS the seated queue (tested: |value| ==
// waiters), and the dock slider rebalances wide holders against narrow seated.
// Width carries occupancy; the board carries the sign.
// ─────────────────────────────────────────────────────────────────────────────

type SemOp = 'wait' | 'signal' | 'omit_signal';

export interface SemaphoreParams {
  /** Dock size: five charging ports, or one toilet. The whole difference. */
  initial: number;
  /** Hover at the dock, or take a ticket and sit down. */
  mode: 'spin' | 'block';
  /** Which failure to stage, or none for the intact run. */
  mistake: 'none' | 'swap' | 'omit' | 'double';
}

export const SEM_RANGES = {
  initial: { min: 1, max: 5 }
} as const;

export const DEFAULT_SEM: SemaphoreParams = { initial: 5, mode: 'block', mistake: 'none' };

const ACTORS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const ANALOGY_NAMES: Record<string, string> = {
  T1: 'Traveller A', T2: 'Traveller B', T3: 'Traveller C', T4: 'Traveller D',
  T5: 'Traveller E', T6: 'Traveller F', T7: 'Traveller G'
};

// DENSITY (Task A audit): correct at 10 — seven takes (each port claimed once,
// the overflow past zero IS the seating event), one release, the woken
// handoff, and the computed room verdict. The three slide-22 mistakes (swap,
// double, omit) are the same ten-beat shape with different outcomes under the
// playground buttons — not new events. An eighth contender would add a beat,
// but seven already overflows the five-port dock by two, which is all the sign
// story needs: positive, zero, negative.
export function semaphoreOps(p: SemaphoreParams): Array<{ actorId: string; op: SemOp }> {
  const ops: Array<{ actorId: string; op: SemOp }> = [];
  switch (p.mistake) {
    case 'swap':
      // signal(mutex) … wait(mutex): the releaser frees a port it never took,
      // inflating the count — then the take overflows a dock that reads wrong.
      ops.push(
        { actorId: 'T1', op: 'signal' },
        { actorId: 'T1', op: 'wait' },
        { actorId: 'T2', op: 'wait' },
        { actorId: 'T3', op: 'wait' },
        { actorId: 'T4', op: 'wait' },
        { actorId: 'T5', op: 'wait' },
        { actorId: 'T6', op: 'wait' }
      );
      break;
    case 'double':
      // wait(mutex) … wait(mutex): the second take has no matching release,
      // so one traveller holds two ports — the room disagrees with the board
      // even though the final number lands where the intact run lands.
      ops.push(
        { actorId: 'T1', op: 'wait' },
        { actorId: 'T1', op: 'wait' },
        { actorId: 'T2', op: 'wait' },
        { actorId: 'T3', op: 'wait' },
        { actorId: 'T4', op: 'wait' },
        { actorId: 'T5', op: 'wait' },
        { actorId: 'T6', op: 'wait' },
        { actorId: 'T2', op: 'signal' }
      );
      break;
    case 'omit':
      // the holder leaves without signalling: the count never rises, and the
      // seated waiters are never woken — the room deadlocks.
      ops.push(
        { actorId: 'T1', op: 'wait' },
        { actorId: 'T2', op: 'wait' },
        { actorId: 'T3', op: 'wait' },
        { actorId: 'T4', op: 'wait' },
        { actorId: 'T5', op: 'wait' },
        { actorId: 'T6', op: 'wait' },
        { actorId: 'T1', op: 'omit_signal' }
      );
      break;
    default:
      ops.push(
        { actorId: 'T1', op: 'wait' },
        { actorId: 'T2', op: 'wait' },
        { actorId: 'T3', op: 'wait' },
        { actorId: 'T4', op: 'wait' },
        { actorId: 'T5', op: 'wait' },
        { actorId: 'T6', op: 'wait' },
        { actorId: 'T7', op: 'wait' },
        { actorId: 'T1', op: 'signal' }
      );
      break;
  }
  return ops;
}

/** Live simulation — computed on every call, never cached, never typed. */
export function semaphoreRun(p: SemaphoreParams): SemaphoreSimulationResult {
  return simulateSemaphoreOps(p.initial, semaphoreOps(p));
}

function shortCaption(s: string): string {
  const m = s.match(/^(\S+) executes (wait|signal)\(\): value (?:decrements|increments) to (-?\d+)/);
  if (m) {
    const who = m[1];
    const verb = m[2] === 'wait' ? 'takes a port' : 'leaves a port';
    return `${who} ${verb} — count ${m[3]}.`.slice(0, 120);
  }
  if (s.startsWith('BUG:')) {
    const who = s.match(/^BUG: (\S+)/)?.[1] ?? 'Someone';
    return `${who} leaves without signalling — the seated waiters never wake.`.slice(0, 120);
  }
  const woke = s.match(/(\S+) is removed from waiting queue/);
  if (woke) return `${woke[1]} is woken and takes the freed port.`.slice(0, 120);
  return s.slice(0, 120);
}

/**
 * Pure mapping: simulateSemaphoreOps output → CounterEngine steps. The count
 * IS the value (negatives included — the engine renders them as sleepers);
 * holders and the seated queue map straight across. Nothing is typed.
 */
export function semaphoreSteps(p: SemaphoreParams): Step<CounterState>[] {
  const run = semaphoreRun(p);
  const steps: Step<CounterState>[] = [
    {
      t: 0,
      caption: `${p.initial} free ports on the board. Nobody holds one yet.`,
      highlight: [],
      state: {
        stepIndex: 0, value: p.initial, capacity: p.initial, activeActorId: null,
        holders: [], waiting: [], action: 'init',
        caption: 'Initial state before synchronization events.'
      }
    }
  ];
  run.steps.forEach((s, i) => {
    const action = s.action.endsWith(':omit_signal') ? 'omit_signal'
      : s.action.endsWith(':signal') ? 'release'
      : s.waitingQueue.includes(s.actorId) ? (p.mode === 'spin' ? 'spin' : 'block')
      : 'acquire';
    steps.push({
      t: i + 1,
      caption: shortCaption(s.caption),
      highlight: [s.actorId],
      state: {
        stepIndex: i + 1,
        value: s.value,
        capacity: p.initial,
        activeActorId: s.actorId,
        holders: [...s.holders],
        waiting: [...s.waitingQueue],
        action,
        caption: shortCaption(s.caption)
      }
    });
  });
  // The room is read once at the end: the computed verdict — balanced, seated
  // waiters still queued, miscounted, or deadlocked — is its own discrete event.
  const last = run.steps[run.steps.length - 1];
  const verdict = run.deadlocked
    ? 'Nobody wakes — the forgotten signal deadlocks the room.'
    : last.waitingQueue.length > 0
      ? `${last.waitingQueue.length} still seated — below zero counts waiters, not ports.`
      : p.mistake !== 'none'
        ? 'The board disagrees with the room — the calls were misused.'
        : `Dock balanced — count ${run.finalValue}, every traveller served.`;
  steps.push({
    t: run.steps.length + 1,
    caption: verdict.slice(0, 120),
    highlight: last ? [...last.holders, ...last.waitingQueue] : [],
    state: {
      stepIndex: run.steps.length + 1,
      value: run.finalValue,
      capacity: p.initial,
      activeActorId: null,
      holders: last ? [...last.holders] : [],
      waiting: last ? [...last.waitingQueue] : [],
      action: run.deadlocked ? 'fail' : 'release',
      caption: verdict
    }
  });
  return steps;
}

export interface SemaphoreLessonInput extends CounterInput {
  params: SemaphoreParams;
}

export function semaphoreLessonInput(p: SemaphoreParams): SemaphoreLessonInput {
  const run = semaphoreRun(p);
  const events = run.steps.map((s) => ({
    actorId: s.actorId,
    action: 'acquire' as const,
    caption: shortCaption(s.caption)
  }));
  return {
    params: { ...p },
    initial: p.initial,
    capacity: p.initial,
    mode: p.mode,
    resourceLabel: 'PORTS FREE (LIVE COUNT)',
    actors: ACTORS.map((id) => ({ id, name: id, analogyName: ANALOGY_NAMES[id] })),
    events,
    analogy: {
      domain: 'travel',
      resourceLabel: 'THE BOARD (PORTS FREE)',
      holderLabel: 'CHARGING PORTS (PLUGGED IN)',
      waitingLabel: p.mode === 'spin' ? 'HOVERING (NO SEATS)' : 'SEATED (TICKET HOLDERS)',
      actorNames: { ...ANALOGY_NAMES }
    }
  };
}

const MODE_BUTTONS: Array<{ mode: 'spin' | 'block'; label: string }> = [
  { mode: 'spin', label: 'Hover (spin)' },
  { mode: 'block', label: 'Sit down (block/wakeup)' }
];

const MISTAKE_BUTTONS: Array<{ mistake: SemaphoreParams['mistake']; label: string }> = [
  { mistake: 'none', label: 'Intact run' },
  { mistake: 'swap', label: 'Swap the calls' },
  { mistake: 'double', label: 'Double up' },
  { mistake: 'omit', label: 'Forget to signal' }
];

/**
 * Lesson 15's engine, scoped to this lesson. Uses CounterEngine.render()
 * unchanged — the lesson adds the semaphore story: steps come from
 * semaphoreSteps() and the playground re-maps them on every control move.
 */
export class SemaphoreCounterEngine extends CounterEngine implements PlaygroundCapable {
  protected declare input: SemaphoreLessonInput;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: CounterInput): Step<CounterState>[] {
    const params = (input as SemaphoreLessonInput).params ?? { ...DEFAULT_SEM };
    return semaphoreSteps(params);
  }

  /** The live result, computed on every call — never cached, never typed. */
  public getRun(): SemaphoreSimulationResult {
    return semaphoreRun(this.input.params);
  }

  public getParams(): SemaphoreParams {
    return { ...this.input.params };
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setSemaphore: (patch: Partial<SemaphoreParams>) => this.applyParams(patch),
      getParams: () => this.getParams(),
      getRun: () => this.getRun()
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    const p = this.getParams();
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Set the dock, fill it, then break it three ways</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${MODE_BUTTONS.map((m) => `
            <button type="button" class="l15-mode" data-mode="${m.mode}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${p.mode === m.mode ? 'var(--accent)' : 'var(--hairline)'}; color: ${p.mode === m.mode ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${m.label}</button>
          `).join('')}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <label for="l15-initial" style="font-size: 0.72rem; font-weight: 600; color: var(--ink); white-space: nowrap;">Ports on the dock</label>
        <input type="range" id="l15-initial" data-param="initial" min="${SEM_RANGES.initial.min}" max="${SEM_RANGES.initial.max}" step="1" value="${p.initial}" aria-label="Number of semaphore ports" style="flex: 1; min-width: 80px; height: 26px; cursor: pointer;" />
        <span id="l15-initial-val" style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--accent); min-width: 60px; text-align: right;">${p.initial} ports</span>
      </div>
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        ${MISTAKE_BUTTONS.map((m) => `
          <button type="button" class="l15-mistake" data-mistake="${m.mistake}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${p.mistake === m.mistake ? 'var(--accent)' : 'var(--hairline)'}; color: ${p.mistake === m.mistake ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${m.label}</button>
        `).join('')}
      </div>
    `;

    host.querySelector('input[type="range"][data-param]')?.addEventListener('input', (e) => {
      this.applyParams({ initial: Number((e.target as HTMLInputElement).value) });
    });
    host.querySelectorAll('.l15-mode').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyParams({ mode: (el as HTMLElement).dataset.mode as 'spin' | 'block' });
      });
    });
    host.querySelectorAll('.l15-mistake').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyParams({ mistake: (el as HTMLElement).dataset.mistake as SemaphoreParams['mistake'] });
      });
    });

    this.renderScoreboard();
  }

  private applyParams(patch: Partial<SemaphoreParams>): void {
    const next = { ...this.getParams(), ...patch };
    next.initial = Math.max(SEM_RANGES.initial.min, Math.min(SEM_RANGES.initial.max, Math.round(next.initial)));
    this.input.params = next;
    this.input.mode = next.mode;
    this.input.initial = next.initial;
    this.input.capacity = next.initial;
    const rebuilt = semaphoreLessonInput(next);
    this.input.events = rebuilt.events;
    this.input.analogy = rebuilt.analogy;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    const host = this.container.closest('.unit-center-col')?.querySelector('#playground');
    if (host) this.renderPlayground(host as HTMLElement, this.scoreboardHost ?? undefined);
    else this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const run = this.getRun();
    const p = this.getParams();
    const last = run.steps[run.steps.length - 1];
    const seated = last?.waitingQueue.length ?? 0;
    const mistake = p.mistake !== 'none';
    const deadlocked = run.deadlocked;
    const verdictColor = deadlocked ? 'var(--waiting)' : 'var(--running)';
    const verdictBg = deadlocked ? 'rgba(217, 119, 6, 0.12)' : 'rgba(8, 127, 91, 0.12)';
    const verdictText = deadlocked
      ? '🔴 Deadlocked — the seated waiters never wake'
      : mistake
        ? '⚠️ Miscounted — the board disagrees with the room'
        : seated > 0
          ? `🟡 ${seated} seated — negative means waiters`
          : `🟢 Dock balanced — count ${run.finalValue}`;
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Dock check · ${p.initial} ports</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdictBg}; color: ${verdictColor}; border: 1px solid ${verdictColor};">${verdictText}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Live count</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${run.finalValue < 0 ? 'var(--waiting)' : 'var(--running)'}; margin: 2px 0;">${run.finalValue}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${run.finalValue < 0 ? `minus means ${seated} seated` : 'ports still free'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Plugged in</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${last?.holders.length ?? 0}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${seated} seated waiting</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The board itself</div>
          <div style="font-size: 0.72rem; margin-top: 3px; line-height: 1.35;">Two travellers can corrupt the count board itself — which is why the tool that solves the problem has the problem.</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson15Input: SemaphoreLessonInput = semaphoreLessonInput(DEFAULT_SEM);

export const lesson15: Lesson<SemaphoreLessonInput, CounterState> = {
  id: 15,
  lecture: 9,
  slug: 'lesson-15',
  title: 'Semaphores',
  absorbsUnits: [58, 59, 60, 61, 62],
  slides: 'slides 17–22',
  engine: 'counter',
  engineClass: SemaphoreCounterEngine,
  lensLabels: {
    analogy: '🔌 The charging dock',
    mechanism: '⚙️ wait · signal · block/wakeup',
    analogyTitle: 'View as five charging ports and a live count board',
    mechanismTitle: 'View as the semaphore and its waiting queue'
  },
  analogy: {
    domain: 'travel',
    text: 'Charging ports at the airport gate and a live count of what is free: take one and the count drops, leave and it rises. When every port is taken the count keeps falling past zero — and below zero it counts the seated travellers waiting, not the ports.'
  },
  concept:
    'A semaphore is an integer with two indivisible operations: wait takes a slot and signal returns one. The initial count is the whole difference between five rental bikes and one platform toilet — same tool, different dock. The count board is itself shared, so the tool that solves the problem has the problem; and sitting down with a ticket beats hovering once the wait grows. Used wrongly — swapped calls, a doubled take, a forgotten signal — the same integer deadlocks the room, each mistake with its own computed outcome.',
  morphReveals:
    'At the gate every token is the same width — a traveller at the dock. In the semaphore width stops meaning a body and starts meaning the claim on a port: plugged-in tokens fill wide while the seated compress behind, so a full dock reads wide and an overflowing one reads narrow. The count board tells the rest — below zero it counts the seated, not the ports — and dragging the dock from five ports to one turns the same integer into a binary lock.',
  morphMode: 'morph',
  analogyMapping: [
    'Five charging ports ➔ the resource pool (capacity is the initial count)',
    'Taking a port ➔ wait(): the count drops',
    'Leaving a port ➔ signal(): the count rises',
    'The live count board ➔ the semaphore value — shared, and corruptible itself',
    'Taking a ticket and sitting down ➔ block(): a negative count is seated waiters',
    'One forgotten "I am out" ➔ the omitted signal that deadlocks the room'
  ],
  input: lesson15Input
};

export default lesson15;
