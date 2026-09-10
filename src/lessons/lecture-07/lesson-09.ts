import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import {
  DiagramEngine,
  type DiagramInput,
  type DiagramNode,
  type DiagramReveal,
  type DiagramState
} from '../../engines/diagram.js';
import {
  evaluateRealtimeDeadline,
  type LatencyBreakdown
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// DENSITY (Task A audit): 12 reveals — the gate frame, the siren sounding and
// the state save (one discrete phase each), the aisle blocked and the aisle
// clearing (slide 21's phase split into its two states), the staged crew and
// the crew's swap (arrival distinct from handover), the dispatch subtotal the
// deck names, the held ambulance and its run (staging distinct from running),
// the stacked-total accumulation, and the computed verdict. "Arrival" and
// "sounding" differ the way L8's balancer tick and move differ: naming the
// start of a mechanism event is not the event. The knock-on slide-20 rescue
// run (soft deadline, still a failure on retry) is a different verdict over
// the same budget — told by the playground burst, not a thirteenth reveal.
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_W = 720;
// ENGINE VERDICT (a): extend DiagramEngine and use its render() unmodified.
// Why: the lesson IS a stacked bar whose segment widths encode latencies —
// exactly what DiagramEngine interpolates (analogy x/y/width/height fields
// → mechanism x/y/width/height, linear in `view`, rendered as [id^="bar-*"]
// entities). No shared engine fits better; a standalone would reimplement
// this interpolation for no gain.
//
// The carrying property of the morph is WIDTH (and with it, x-position). In
// the airport scene a box is sized like the thing it pictures — the door is
// tall, the crowd is wide — and where it stands says nothing about time. On
// the budget bar width stops meaning size and starts meaning milliseconds,
// and left-to-right stops meaning standing room and starts meaning running
// order. Every slider below changes a length the learner drags until the
// response bar overshoots the gate marker.
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_H = 260;

/** Latency budget under test — every number below is an input or computed. */
export interface LatencyParams {
  interruptLatency: number;
  conflictPhase: number;
  dispatchPhase: number;
  executionTime: number;
  deadline: number;
}

type ParamKey = keyof LatencyParams;

export const PARAM_RANGES: Record<ParamKey, { min: number; max: number }> = {
  interruptLatency: { min: 1, max: 10 },
  conflictPhase: { min: 1, max: 10 },
  dispatchPhase: { min: 1, max: 10 },
  executionTime: { min: 2, max: 20 },
  deadline: { min: 5, max: 30 }
};

/** Sane default: comfortably inside the deadline, one burst away from missing. */
export const DEFAULT_PARAMS: LatencyParams = {
  interruptLatency: 2,
  conflictPhase: 3,
  dispatchPhase: 2,
  executionTime: 8,
  deadline: 20
};

// The bar is a LENGTH: segment widths encode latencies on one shared scale.
// TRACK_W is the drawable run; the scale is computed from the slider maxima
// (the longest response the playground can ever build), never typed.
export const MARGIN_L = 80;
export const MARGIN_R = 80;
export const TRACK_W = CANVAS_W - MARGIN_L - MARGIN_R;
export const BAR_X0 = MARGIN_L;
export const BAR_Y = 118;
export const BAR_H = 44;
export const GATE_W = 8;
export const GATE_Y = 94;
export const GATE_H = 92;

export const MAX_TOTAL =
  PARAM_RANGES.interruptLatency.max +
  PARAM_RANGES.conflictPhase.max +
  PARAM_RANGES.dispatchPhase.max +
  PARAM_RANGES.executionTime.max;

/** Pixels per millisecond — computed by division, the only scale in the lesson. */
export const PX_PER_MS = TRACK_W / MAX_TOTAL;

export type NodeId = 'alarm' | 'aisle' | 'switch' | 'run' | 'slack' | 'gate';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Analogy layout, authored independently FIRST (§3C.2a rule 1): the airport
 * scene as it looks — siren high left, relief crew high right, crowd
 * mid-floor, ambulance run low, gate door tall at the right, spare-minutes
 * bench off to the side. Position here is PLACE; size is how big the thing
 * looks. Neither encodes any latency.
 */
const ANALOGY_LAYOUT: Record<NodeId, Box> = {
  alarm: { x: 30, y: 16, w: 150, h: 50 },
  switch: { x: 540, y: 16, w: 150, h: 50 },
  slack: { x: 60, y: 96, w: 130, h: 44 },
  aisle: { x: 245, y: 88, w: 230, h: 60 },
  gate: { x: 560, y: 150, w: 64, h: 96 },
  run: { x: 150, y: 182, w: 320, h: 56 }
};

const ANALOGY_LABELS: Record<NodeId, { label: string; sub: string }> = {
  alarm: { label: 'Siren', sub: 'hear it' },
  aisle: { label: 'Crowded aisle', sub: 'clear it' },
  switch: { label: 'Relief crew', sub: 'swap in' },
  run: { label: 'Ambulance run', sub: 'green wave' },
  slack: { label: 'Spare minutes', sub: 'buffer' },
  gate: { label: 'Gate door', sub: 'shuts on time' }
};

/** Live breakdown — computed on every call, never cached, never typed. */
export function realtimeBreakdown(p: LatencyParams): LatencyBreakdown {
  return evaluateRealtimeDeadline(
    p.interruptLatency,
    p.conflictPhase,
    p.dispatchPhase,
    p.executionTime,
    p.deadline
  );
}

/**
 * Mechanism layout: one stacked bar on a single baseline. Every segment
 * starts where the previous one ends; each width is its latency times the
 * shared scale. The gate marker sits AT the deadline position; the spare
 * segment fills whatever budget is left (zero when the deadline is missed).
 */
export function mechanismBox(id: NodeId, p: LatencyParams): Box {
  const b = realtimeBreakdown(p);
  const wI = p.interruptLatency * PX_PER_MS;
  const wC = p.conflictPhase * PX_PER_MS;
  const wD = p.dispatchPhase * PX_PER_MS;
  const wE = p.executionTime * PX_PER_MS;
  const xAlarm = BAR_X0;
  const xAisle = xAlarm + wI;
  const xSwitch = xAisle + wC;
  const xRun = xSwitch + wD;
  const xEnd = xRun + wE;
  switch (id) {
    case 'alarm':
      return { x: xAlarm, y: BAR_Y, w: wI, h: BAR_H };
    case 'aisle':
      return { x: xAisle, y: BAR_Y, w: wC, h: BAR_H };
    case 'switch':
      return { x: xSwitch, y: BAR_Y, w: wD, h: BAR_H };
    case 'run':
      return { x: xRun, y: BAR_Y, w: wE, h: BAR_H };
    case 'slack':
      return { x: xEnd, y: BAR_Y, w: Math.max(0, b.slackTime) * PX_PER_MS, h: BAR_H };
    case 'gate':
      return { x: BAR_X0 + p.deadline * PX_PER_MS - GATE_W / 2, y: GATE_Y, w: GATE_W, h: GATE_H };
  }
}

const lerp = (a: number, b: number, v: number): number => a + (b - a) * v;

/**
 * Geometry of every morphable entity at any view — pure, exported for tests.
 * DiagramEngine.render() performs exactly this interpolation; the function
 * exists so the §3C.2c trio can assert on it without a DOM.
 */
export function realtimeGeometry(view: number, p: LatencyParams): Record<NodeId, Box> {
  const v = Math.max(0, Math.min(1, view));
  const out = {} as Record<NodeId, Box>;
  (Object.keys(ANALOGY_LAYOUT) as NodeId[]).forEach((id) => {
    const a = ANALOGY_LAYOUT[id];
    const m = mechanismBox(id, p);
    out[id] = { x: lerp(a.x, m.x, v), y: lerp(a.y, m.y, v), w: lerp(a.w, m.w, v), h: lerp(a.h, m.h, v) };
  });
  return out;
}

/** Node set for DiagramEngine: analogy scene ↔ stacked budget bar. */
export function realtimeNodes(p: LatencyParams): DiagramNode[] {
  const b = realtimeBreakdown(p);
  const mech: Record<NodeId, { label: string; sub: string }> = {
    alarm: { label: 'Alarm', sub: `${p.interruptLatency} ms` },
    aisle: { label: 'Aisle', sub: `${p.conflictPhase} ms` },
    switch: { label: 'Crew swap', sub: `${p.dispatchPhase} ms` },
    run: { label: 'Ambulance', sub: `${p.executionTime} ms` },
    slack: {
      label: b.met ? 'Spare' : 'Overrun',
      sub: `${Math.abs(b.slackTime)} ms`
    },
    gate: { label: 'Gate', sub: `${p.deadline} ms` }
  };
  return (Object.keys(ANALOGY_LAYOUT) as NodeId[]).map((id) => {
    const a = ANALOGY_LAYOUT[id];
    const m = mechanismBox(id, p);
    return {
      id,
      label: mech[id].label,
      sublabel: mech[id].sub,
      x: m.x,
      y: m.y,
      width: m.w,
      height: m.h,
      analogyX: a.x,
      analogyY: a.y,
      analogyWidth: a.w,
      analogyHeight: a.h,
      analogyLabel: ANALOGY_LABELS[id].label,
      analogySublabel: ANALOGY_LABELS[id].sub
    };
  });
}

/**
 * Pure mapping: evaluateRealtimeDeadline output → DiagramEngine reveals.
 * Every number in every caption and metric is computed from the breakdown;
 * captions describe quantities changing (lengths growing, the bar reaching
 * or missing the gate), never labels appearing.
 */
export function realtimeReveals(p: LatencyParams): DiagramReveal[] {
  const b = realtimeBreakdown(p);
  const verdict = b.met ? 'met' : 'missed';
  const metrics: Record<string, string | number> = {
    totalResponseTime: b.totalResponseTime,
    slackTime: b.slackTime,
    deadline: b.deadline,
    verdict
  };
  const finalCaption = b.met
    ? `Total ${b.totalResponseTime}ms lands inside ${b.deadline}ms with ${b.slackTime}ms to spare — the gate is still open.`
    : `Total ${b.totalResponseTime}ms overshoots ${b.deadline}ms by ${Math.abs(b.slackTime)}ms — the gate has already closed.`;
  return [
    {
      caption: `The gate shuts at ${b.deadline}ms. Everything the system does must fit left of it — length is time.`,
      highlightNodeIds: ['gate', 'slack'],
      activeNodeIds: ['alarm', 'aisle', 'switch', 'run', 'slack', 'gate'],
      badgeText: `Gate at ${b.deadline}ms`,
      metrics
    },
    {
      caption: `The siren sounds — the interrupt arrives and the clock starts.`,
      highlightNodeIds: ['alarm'],
      activeNodeIds: ['alarm'],
      badgeText: `Alarm ${b.interruptLatency}ms`,
      metrics
    },
    {
      caption: `Noticing it and saving state already eats ${b.interruptLatency}ms of the budget.`,
      highlightNodeIds: ['alarm'],
      activeNodeIds: ['alarm'],
      badgeText: `Alarm ${b.interruptLatency}ms`,
      metrics
    },
    {
      caption: `The aisle is still crowded — the outgoing task holds the exit.`,
      highlightNodeIds: ['aisle'],
      activeNodeIds: ['alarm', 'aisle'],
      badgeText: `Blocked ${b.conflictPhase}ms`,
      metrics
    },
    {
      caption: `The aisle clears over ${b.conflictPhase}ms — preemption done, resources released.`,
      highlightNodeIds: ['aisle'],
      activeNodeIds: ['alarm', 'aisle'],
      badgeText: `Aisle ${b.conflictPhase}ms`,
      metrics
    },
    {
      caption: `The crew is staged but waiting — the aisle has not cleared yet.`,
      highlightNodeIds: ['switch'],
      activeNodeIds: ['alarm', 'aisle'],
      badgeText: `Crew waits`,
      metrics
    },
    {
      caption: `The relief crew swaps in over ${b.dispatchPhase}ms — the context switch itself.`,
      highlightNodeIds: ['switch'],
      activeNodeIds: ['alarm', 'aisle', 'switch'],
      badgeText: `Swap ${b.dispatchPhase}ms`,
      metrics
    },
    {
      caption: `Reaching the task costs ${b.totalDispatchLatency}ms before it even starts.`,
      highlightNodeIds: ['aisle', 'switch'],
      activeNodeIds: ['alarm', 'aisle', 'switch'],
      badgeText: `Dispatch ${b.totalDispatchLatency}ms`,
      metrics
    },
    {
      caption: `The ambulance is staged but held — the dispatch has not handed over yet.`,
      highlightNodeIds: ['run'],
      activeNodeIds: ['alarm', 'aisle', 'switch'],
      badgeText: `Held ${b.executionTime}ms`,
      metrics
    },
    {
      caption: `The ambulance runs ${b.executionTime}ms while everything yields. Priority hurries it, but the clock still rules.`,
      highlightNodeIds: ['run'],
      activeNodeIds: ['alarm', 'aisle', 'switch', 'run'],
      badgeText: `Run ${b.executionTime}ms`,
      metrics
    },
    {
      caption: `Stacked end to end, the response already spans ${b.totalResponseTime}ms.`,
      highlightNodeIds: ['alarm', 'aisle', 'switch', 'run'],
      activeNodeIds: ['alarm', 'aisle', 'switch', 'run', 'slack', 'gate'],
      badgeText: `Total ${b.totalResponseTime}ms`,
      metrics
    },
    {
      caption: finalCaption,
      highlightNodeIds: b.met ? ['gate', 'slack'] : ['gate', 'run'],
      activeNodeIds: ['alarm', 'aisle', 'switch', 'run', 'slack', 'gate'],
      badgeText: b.met ? `Inside by ${b.slackTime}ms` : `Over by ${Math.abs(b.slackTime)}ms`,
      metrics
    }
  ];
}

export interface RealtimeInput extends DiagramInput {
  params: LatencyParams;
}

export function realtimeLessonInput(p: LatencyParams): RealtimeInput {
  return {
    params: { ...p },
    nodes: realtimeNodes(p),
    reveals: realtimeReveals(p),
    analogy: { domain: 'travel', title: 'Airport scramble', subtitle: 'A siren, a crowd, a crew and a closing door' }
  };
}

const SLIDERS: Array<{ key: ParamKey; label: string }> = [
  { key: 'interruptLatency', label: 'Siren delay (notice + save)' },
  { key: 'conflictPhase', label: 'Aisle clearing (preemption)' },
  { key: 'dispatchPhase', label: 'Crew swap (context switch)' },
  { key: 'executionTime', label: 'Ambulance run (task time)' },
  { key: 'deadline', label: 'Gate closing time (deadline)' }
];

/**
 * Lesson 9's engine, scoped to this lesson. Uses DiagramEngine.render()
 * unchanged — the lesson adds the live latency budget: sliders recompute
 * the nodes (widths = latency × scale) and the reveals, then rebuild via
 * this.setSteps(this.buildSteps(this.input)).
 */
export class RealtimeDiagramEngine extends DiagramEngine implements PlaygroundCapable {
  protected declare input: RealtimeInput;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: DiagramInput): Step<DiagramState>[] {
    const params = (input as RealtimeInput).params ?? { ...DEFAULT_PARAMS };
    return super.buildSteps({ ...input, reveals: realtimeReveals(params) });
  }

  /** The live result, computed on every call — never cached, never typed. */
  public getBreakdown(): LatencyBreakdown {
    return realtimeBreakdown((this.input as RealtimeInput).params);
  }

  public getParams(): LatencyParams {
    return { ...(this.input as RealtimeInput).params };
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setLatency: (patch: Partial<LatencyParams>) => this.applyParams(patch),
      getParams: () => this.getParams(),
      getBreakdown: () => this.getBreakdown(),
      injectBurst: () => this.injectBurst(),
      resetBudget: () => this.resetBudget()
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    const p = this.getParams();
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Latency budget — drag a length</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="l9-inject" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--waiting); color: var(--waiting); cursor: pointer;">🚨 Inject interrupt burst</button>
          <button id="l9-reset" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--hairline); color: var(--ink); cursor: pointer;">Reset budget</button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; margin-top: 2px;">
        ${SLIDERS.map(({ key, label }) => `
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <label for="l9-${key}" style="font-size: 0.72rem; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 46%;">${label}</label>
            <input type="range" id="l9-${key}" data-param="${key}" min="${PARAM_RANGES[key].min}" max="${PARAM_RANGES[key].max}" step="1" value="${p[key]}" aria-label="${label}" style="flex: 1; min-width: 60px; height: 26px; cursor: pointer;" />
            <span id="l9-${key}-val" style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--accent); min-width: 44px; text-align: right;">${p[key]} ms</span>
          </div>
        `).join('')}
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Stretch any length until the response bar overshoots the gate marker.</div>
    `;

    host.querySelectorAll('input[type="range"][data-param]').forEach((el) => {
      el.addEventListener('input', () => {
        const key = (el as HTMLElement).dataset.param as ParamKey;
        this.applyParams({ [key]: Number((el as HTMLInputElement).value) } as Partial<LatencyParams>);
      });
    });
    host.querySelector('#l9-inject')?.addEventListener('click', () => this.injectBurst());
    host.querySelector('#l9-reset')?.addEventListener('click', () => this.resetBudget());

    this.renderScoreboard();
  }

  /** Worst-case siren: the interrupt arrives at its longest delay. */
  private injectBurst(): void {
    this.applyParams({ interruptLatency: PARAM_RANGES.interruptLatency.max });
  }

  private resetBudget(): void {
    this.applyParams({ ...DEFAULT_PARAMS });
  }

  private applyParams(patch: Partial<LatencyParams>): void {
    const next = { ...this.getParams() };
    (Object.keys(patch) as ParamKey[]).forEach((key) => {
      const raw = patch[key];
      if (typeof raw !== 'number' || Number.isNaN(raw)) return;
      const { min, max } = PARAM_RANGES[key];
      next[key] = Math.max(min, Math.min(max, Math.round(raw)));
    });
    const full = this.input as RealtimeInput;
    full.params = next;
    full.nodes = realtimeNodes(next);
    full.reveals = realtimeReveals(next);
    const keepIndex = Math.min(this.getCurrentIndex(), full.reveals.length - 1);
    this.setSteps(this.buildSteps(this.input));
    this.seek(keepIndex);
    this.syncControls();
    this.renderScoreboard();
  }

  private syncControls(): void {
    const p = this.getParams();
    (Object.keys(PARAM_RANGES) as ParamKey[]).forEach((key) => {
      const slider = this.container
        .closest('.unit-center-col')
        ?.querySelector(`#l9-${key}`) as HTMLInputElement | null;
      if (slider) slider.value = String(p[key]);
      const val = this.container
        .closest('.unit-center-col')
        ?.querySelector(`#l9-${key}-val`);
      if (val) val.textContent = `${p[key]} ms`;
    });
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const b = this.getBreakdown();
    const ok = b.met;
    const verdictColor = ok ? 'var(--running)' : 'var(--waiting)';
    const verdictBg = ok ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)';
    const verdictText = ok ? '🟢 Inside the deadline — gate holds' : '🔴 Past the deadline — gate closed';
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Budget check</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdictBg}; color: ${verdictColor}; border: 1px solid ${verdictColor};">${verdictText}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Total response</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${ok ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">${b.totalResponseTime} ms</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">alarm + aisle + swap + run</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Slack</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${ok ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">${b.slackTime} ms</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">gate minus total</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Gate</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${b.deadline} ms</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">dispatch ${b.totalDispatchLatency} ms inside total</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson09Input: RealtimeInput = realtimeLessonInput(DEFAULT_PARAMS);

export const lesson09: Lesson<RealtimeInput, DiagramState> = {
  id: 9,
  lecture: 7,
  slug: 'lesson-09',
  title: 'When Late Means Failed',
  absorbsUnits: [27, 28, 29, 30],
  slides: 'slides 18–22',
  engine: 'diagram',
  engineClass: RealtimeDiagramEngine,
  lensLabels: {
    analogy: '✈️ Airport scramble',
    mechanism: '⏱️ Latency budget bar',
    analogyTitle: 'View as a siren, a crowd, a crew and a closing gate',
    mechanismTitle: 'View as latency lengths against the deadline position'
  },
  analogy: {
    domain: 'travel',
    text: 'A siren sounds, passengers clog the aisle, a relief crew pushes through, and an ambulance sprints its green wave — but the flight door still shuts exactly on time, whether the sprint was long or short.'
  },
  concept:
    'A real-time system must answer before its deadline, not just eventually. The answer waits on interrupt latency (noticing the request and saving state), dispatch latency (clearing preemption and switching context), and the task’s own run time. A soft miss only degrades the trip, while a hard miss fails it outright — so the budget is a length, and the deadline is a line it must not cross.',
  morphReveals:
    'On the platform each box is sized like the thing it pictures — the door stands tall, the crowd spreads wide — and where it stands says nothing about time. On the budget bar width stops meaning size and starts meaning milliseconds, and left-to-right stops meaning standing room and starts meaning running order: stretch any length and watch the bar chase the gate.',
  morphMode: 'morph',
  analogyMapping: [
    'Siren ➔ interrupt latency (notice the request, save state)',
    'Crowded aisle ➔ conflict phase (preemption and resource release)',
    'Relief crew swap ➔ dispatch phase (context switch)',
    'Ambulance green-wave run ➔ real-time task execution',
    'Flight door ➔ deadline position',
    'Spare minutes ➔ slack time before the door shuts'
  ],
  input: lesson09Input
};

export default lesson09;
