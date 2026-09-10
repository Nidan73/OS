import type { Lesson, Step } from '../../core/types.js';
import { GanttEngine, type GanttInput, type GanttState } from '../../engines/gantt.js';
import {
  bestOf,
  deterministicComparison,
  littlesLaw,
  simulateOrderings,
  type AlgorithmVerdict,
  type LittlesLaw,
  type Process,
  type SimulationRun
} from '../../algorithms/scheduling.js';

// ─────────────────────────────────────────────────────────────────────────────
// L23 · Guessing before you build (ATLAS units 31–33, Lecture 7 slides 24–30)
//
// LESSONS.md: L23 — units 31–33. Deterministic modelling → queueing models →
//
// ANALOGY: mechanism-fixed — deterministic scheduling, Little's formula, and
// simulation are structurally dictated by Lecture 7 slides 24–30.
//
// Playground: n = λ × W computed in all three directions, drag any
// two and the third settles; then change the snapshot and watch the
// deterministic winner change with it. The point is that a fast exact answer
// only holds for one snapshot.
//
// ATLAS rows (kept for provenance):
// | 31 | gantt   | Algorithm Evaluation — Deterministic Modelling | slides 24–25
// | 32 | diagram | Queueing Models & Little's Formula             | slides 26–27
// | 33 | diagram | Simulation vs Real Implementation              | slides 28–30
//
// DECK DATA — verified against the slide images before this file was written.
// Slide 24 carries the process table as a PNG (image16), slide 25 the three
// Gantt charts (image17/18/19). Read directly, not recalled:
//   bursts  P1=10  P2=29  P3=3  P4=7  P5=12, all arriving at time 0
//   FCFS    0-10-39-42-49-61      published average wait 28 ms
//   SJF     0-3-10-20-32-61       published average wait 13 ms
//   RR q=10 eight segments to 61  published average wait 23 ms
// All three reproduce exactly from src/algorithms/scheduling.ts. Nothing here
// is typed; every figure on screen comes back through a pure function.
//
// SCENE: Ammu is choosing the serving rule for the family's kacchi
// restaurant. Five parties are seated at eight o'clock — the kitchen times are
// known, because she has last Friday's tickets in front of her.
//
// ENGINE VERDICT (a): extend GanttEngine and use its render() unmodified.
// Unit 31 IS a Gantt comparison — the deck's own artefacts are three Gantt
// charts over one workload — and GanttEngine already owns the carrying
// property this lesson needs. Units 32 and 33 are not timelines and are not
// forced into one: Little's formula and the ordering sweep live in the
// playground, which is where LESSONS.md put them.
//
// The carrying property of the morph is BAR WIDTH, inherited from GanttEngine
// and true of this lesson in particular. At the door every party takes up one
// place in the line: the widths are equal, because a booking is a booking.
// On the timeline that same width becomes kitchen minutes, and the engagement
// party alone is wider than the other four together. That is deterministic
// modelling in one gesture — the line looks fair until you redraw it against
// time, and the 28 minutes Ammu computes is a fact about this Friday's
// ordering, not a fact about the rule.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY: each scenario is a complete event set. GanttEngine emits the
// arrival frame, a dispatch and a completion beat per bar, and one closing
// summary beat — 12 for a five-bar schedule, 18 for the eight-segment round
// robin. This lesson splices in the tally ahead of that summary: one beat per
// party as her waiting time is read off the chart and added to the running
// total, then the divide. Those six are not restatements — each moves
// activeProcessId to a different party and changes the running sum, and
// together they are how slide 25's number is actually produced.
// Totals: 18 / 18 / 24 / 18.

/** Kitchen minutes, exactly as slide 24 lists them. Ids stay bound to parties. */
export const DECK_BURSTS: Record<string, number> = {
  P1: 10,
  P2: 29,
  P3: 3,
  P4: 7,
  P5: 12
};

/** Slide 24's booking order — the order the deck evaluates. */
export const DECK_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5'];

/**
 * The same five parties with the same five orders, booked shortest-first.
 * Chosen because it is the one ordering in which FCFS ties the optimum — see
 * SCENARIOS below for why that is the honest choice and not a flattering one.
 */
export const ASCENDING_ORDER = ['P3', 'P4', 'P1', 'P5', 'P2'];

export const DECK_QUANTUM = 10;

/** Slide 27's worked example: 7 arrive per unit time, 14 in the queue. */
export const DECK_LITTLE = { lambda: 7, n: 14 };

export function workloadOf(order: string[]): Process[] {
  return order.map((id) => ({ id, arrival: 0, burst: DECK_BURSTS[id] }));
}

export const PARTY_NAMES: Record<string, string> = {
  P1: 'The Chowdhury table',
  P2: 'The engagement party',
  P3: 'Uncle, on his own',
  P4: 'Two friends',
  P5: 'A family of four'
};

export const PARTY_ORDERS: Record<string, string> = {
  P1: 'two kacchi (10 min)',
  P2: 'twenty plates, the whole kitchen (29 min)',
  P3: 'one tea and a shingara (3 min)',
  P4: 'one kacchi, two borhani (7 min)',
  P5: 'kacchi and rezala (12 min)'
};

export type Lesson23Scenario = 'fcfs' | 'sjf' | 'rr' | 'reorder';

export const SCENARIO_LABELS: Record<Lesson23Scenario, string> = {
  fcfs: 'Booking order',
  sjf: 'Smallest first',
  rr: 'Ten each',
  reorder: 'Another Friday'
};

/** Compact names for the one-line simulation readout in a 412px column. */
export const SHORT_LABELS: Record<'fcfs' | 'sjf' | 'rr', string> = {
  fcfs: 'FCFS',
  sjf: 'SJF',
  rr: 'RR'
};

interface ScenarioSpec {
  order: string[];
  algorithm: 'fcfs' | 'sjf' | 'rr';
  /** what the analogy calls this rule */
  rule: string;
}

export const SCENARIOS: Record<Lesson23Scenario, ScenarioSpec> = {
  fcfs: { order: DECK_ORDER, algorithm: 'fcfs', rule: 'serve them in the order they booked' },
  sjf: { order: DECK_ORDER, algorithm: 'sjf', rule: 'send the smallest ticket out first' },
  rr: { order: DECK_ORDER, algorithm: 'rr', rule: 'give every table ten minutes, then move on' },
  // Unit 33's point, made without changing a single order size: the same five
  // parties, the same five kitchen times, booked in a different sequence. FCFS
  // falls from 28 to 13 and RR from 23 to 15 — the ranking between them flips.
  // Nothing about the algorithms changed; only the snapshot did.
  reorder: { order: ASCENDING_ORDER, algorithm: 'fcfs', rule: 'serve them in the order they booked' }
};

export function scenarioInput(id: Lesson23Scenario): GanttInput {
  const spec = SCENARIOS[id];
  return {
    processes: workloadOf(spec.order),
    algorithm: spec.algorithm,
    quantum: DECK_QUANTUM,
    analogy: {
      domain: 'food',
      type: 'restaurant',
      serviceLabel: 'The Kitchen',
      serviceSublabel: 'One stove, one order at a time (CPU core)',
      queueLabel: 'Tables seated at eight',
      items: Object.fromEntries(
        spec.order.map((pid) => [
          pid,
          {
            customerName: PARTY_NAMES[pid],
            orderText: PARTY_ORDERS[pid],
            orderIcon: (DECK_BURSTS[pid] >= 12 ? 'party-burger' : DECK_BURSTS[pid] <= 3 ? 'coffee' : 'meal') as
              | 'party-burger'
              | 'coffee'
              | 'meal',
            avatarColor:
              DECK_BURSTS[pid] >= 20 ? '#B45309' : DECK_BURSTS[pid] >= 10 ? '#0E7490' : '#15803D'
          }
        ])
      )
    }
  };
}

/** The three rules run over one workload — slide 25, computed. */
export function comparisonFor(id: Lesson23Scenario): AlgorithmVerdict[] {
  return deterministicComparison(workloadOf(SCENARIOS[id].order), DECK_QUANTUM);
}

/** The current rule's own verdict inside that comparison. */
export function verdictFor(id: Lesson23Scenario): AlgorithmVerdict {
  const algorithm = SCENARIOS[id].algorithm;
  const found = comparisonFor(id).find((v) => v.algorithm === algorithm);
  if (!found) throw new Error(`lesson-23: no verdict for ${id}`);
  return found;
}

/** Slides 28–30 — every ordering of the same five tickets, not just this one. */
export function simulation(): SimulationRun {
  return simulateOrderings(Object.values(DECK_BURSTS), DECK_QUANTUM);
}

export class Lesson23GanttEngine extends GanttEngine {
  private scenario: Lesson23Scenario = 'fcfs';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;
  private little: LittlesLaw = littlesLaw(DECK_LITTLE);
  private littleSolve: 'n' | 'lambda' | 'w' = 'w';

  constructor(container: HTMLElement, input: GanttInput) {
    super(container, input);
  }

  /**
   * The scheduled beats, then the tally that produces the published average.
   * Waiting times come from the schedule result, never from this file.
   */
  protected override buildSteps(input: GanttInput): Step<GanttState>[] {
    const steps = super.buildSteps(input);
    const result = this.getScheduleResult();
    if (!result || steps.length === 0) return steps;

    // GanttEngine closes every schedule with its own summary beat, which
    // states the average outright. The tally has to land BEFORE that beat —
    // otherwise the lesson announces 28 and then spends six frames deriving a
    // number the student has already been given. Splice, do not append.
    const summary = steps[steps.length - 1];
    const body = steps.slice(0, -1);
    const last = body[body.length - 1];
    let t = last.t;
    const seenBars = Array.from(new Set(result.bars.map((b) => b.id)));
    const order = seenBars.length === input.processes.length
      ? seenBars
      : [...seenBars, ...input.processes.map((p) => p.id).filter((id) => !seenBars.includes(id))];
    let running = 0;
    const tally: Step<GanttState>[] = [];

    for (const id of order) {
      const wait = result.waiting[id] ?? 0;
      running += wait;
      t += 0.8;
      tally.push({
        t: Number(t.toFixed(2)),
        caption: `${PARTY_NAMES[id]} waited ${wait} min before the food came. Running total ${running}.`.slice(0, 120),
        highlight: [id],
        state: {
          ...last.state,
          activeProcessId: id,
          averages: { ...last.state.averages }
        }
      });
    }

    t += 0.8;
    tally.push({
      t: Number(t.toFixed(2)),
      caption: `${running} minutes of waiting across ${order.length} tables — ${result.avgWaiting} minutes each.`.slice(
        0,
        120
      ),
      highlight: order,
      state: {
        ...last.state,
        activeProcessId: null,
        averages: {
          avgWaiting: result.avgWaiting,
          avgTurnaround: result.avgTurnaround,
          avgResponse: result.avgResponse
        }
      }
    });

    t += 0.8;
    return [...body, ...tally, { ...summary, t: Number(t.toFixed(2)) }];
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div>
        <h3 style="font-size: 0.78rem; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 3px; color: var(--ink);">Try a rule — then try another Friday</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson23Scenario[])
            .map(
              (id) => `
            <button type="button" class="l23-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid var(--hairline);">
        <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
          <h4 style="font-size: 0.76rem; font-weight: 600; margin: 0; color: var(--ink);">At the counter — n = &lambda; &times; W</h4>
          <div style="display: flex; gap: 3px;">
            ${(['n', 'lambda', 'w'] as const)
              .map(
                (k) => `
              <button type="button" class="l23-solve" data-solve="${k}" style="padding: 1px 6px; font-size: 0.64rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.littleSolve === k ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.littleSolve === k ? 'var(--accent)' : 'var(--muted)'}; cursor: pointer;">solve ${k === 'lambda' ? '&lambda;' : k}</button>
            `
              )
              .join('')}
          </div>
        </div>
        <div id="l23-little" style="margin-top: 4px;"></div>
        <div id="l23-sim" style="margin-top: 4px;"></div>
      </div>
    `;

    host.querySelectorAll('.l23-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson23Scenario);
      });
    });
    host.querySelectorAll('.l23-solve').forEach((el) => {
      el.addEventListener('click', () => {
        this.setSolveFor((el as HTMLElement).dataset.solve as 'n' | 'lambda' | 'w');
      });
    });

    this.paintLittle(host);
    this.paintSimulation(host);

    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.paintScoreboard());
    this.paintScoreboard();
  }

  public applyScenario(id: Lesson23Scenario): void {
    if (!id || id === this.scenario || !SCENARIOS[id]) return;
    this.scenario = id;
    const next = scenarioInput(id);
    this.input.algorithm = next.algorithm;
    this.input.quantum = next.quantum;
    this.input.analogy = next.analogy;
    this.reorderProcesses(next.processes);
    this.paintScoreboard();
    this.container.ownerDocument?.querySelectorAll('.l23-scenario').forEach((btn) => {
      const active = (btn as HTMLElement).dataset.scenario === id;
      (btn as HTMLElement).style.borderColor = active ? 'var(--accent)' : 'var(--hairline)';
      (btn as HTMLElement).style.color = active ? 'var(--accent)' : 'var(--ink)';
    });
  }

  public getScenario(): Lesson23Scenario {
    return this.scenario;
  }

  /**
   * Little's formula, three ways. The two supplied terms are kept from the
   * current solution so switching which one is derived never invents a value.
   */
  public setSolveFor(which: 'n' | 'lambda' | 'w'): void {
    if (which === this.littleSolve) return;
    const cur = this.little;
    this.littleSolve = which;
    const safeW = cur.w === 0 ? 1 : cur.w;
    const safeLambda = cur.lambda === 0 ? 1 : cur.lambda;
    this.little =
      which === 'n'
        ? littlesLaw({ lambda: cur.lambda, w: cur.w })
        : which === 'lambda'
          ? littlesLaw({ n: cur.n, w: safeW })
          : littlesLaw({ n: cur.n, lambda: safeLambda });
    const host = this.container.ownerDocument.querySelector('#l23-little')?.parentElement?.parentElement;
    if (host instanceof HTMLElement) this.paintLittle(host);
    this.container.ownerDocument?.querySelectorAll('.l23-solve').forEach((btn) => {
      const active = (btn as HTMLElement).dataset.solve === which;
      (btn as HTMLElement).style.borderColor = active ? 'var(--accent)' : 'var(--hairline)';
      (btn as HTMLElement).style.color = active ? 'var(--accent)' : 'var(--muted)';
    });
  }

  /** Set one of the two supplied terms; the derived term follows. */
  public setLittleTerm(term: 'n' | 'lambda' | 'w', value: number): void {
    if (term === this.littleSolve) return;
    const next: { n?: number; lambda?: number; w?: number } = {};
    for (const k of ['n', 'lambda', 'w'] as const) {
      if (k === this.littleSolve) continue;
      next[k] = k === term ? value : this.little[k];
    }
    this.little = littlesLaw(next);
    const host = this.container.ownerDocument.querySelector('#l23-little')?.parentElement?.parentElement;
    if (host instanceof HTMLElement) this.paintLittle(host);
  }

  public getLittle(): LittlesLaw {
    return { ...this.little };
  }

  private paintLittle(host: HTMLElement): void {
    const box = host.querySelector('#l23-little');
    if (!(box instanceof HTMLElement)) return;
    const l = this.little;
    const cell = (
      key: 'n' | 'lambda' | 'w',
      symbol: string,
      meaning: string,
      value: number,
      unit: string
    ): string => {
      const derived = l.solvedFor === key;
      return `
        <div style="flex: 1 1 84px; padding: 2px 5px; border: 1px solid ${derived ? 'var(--accent)' : 'var(--hairline)'}; border-radius: var(--rounded-lg, 12px); background: ${derived ? 'var(--surface-alt)' : 'transparent'};">
          <div style="font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);">${symbol} — ${meaning}</div>
          <div style="display: flex; align-items: baseline; gap: 4px; margin-top: 1px;">
            ${
              derived
                ? `<span id="l23-${key}" style="font-family: var(--font-mono); font-size: 1rem; font-weight: 600; color: var(--accent);">${value}</span>`
                : `<input type="number" class="l23-term" data-term="${key}" id="l23-${key}" value="${value}" min="0" step="1" style="width: 66px; font-family: var(--font-mono); font-size: 0.9rem; padding: 1px 4px; border: 1px solid var(--hairline); border-radius: 6px; background: var(--surface); color: var(--ink);" />`
            }
            <span style="font-size: 0.66rem; color: var(--muted);">${unit}</span>
            
          </div>
        </div>
      `;
    };
    box.innerHTML = `
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${cell('lambda', '&lambda;', 'join the line each minute', l.lambda, 'people/min')}
        ${cell('w', 'W', 'each one waits', l.w, 'min')}
        ${cell('n', 'n', 'standing there at any moment', l.n, 'people')}
      </div>
    `;
    box.querySelectorAll('.l23-term').forEach((el) => {
      el.addEventListener('change', () => {
        const input = el as HTMLInputElement;
        const v = Number(input.value);
        if (!Number.isFinite(v) || v < 0) return;
        try {
          this.setLittleTerm(input.dataset.term as 'n' | 'lambda' | 'w', v);
        } catch {
          /* division by zero — leave the panel as it was */
        }
      });
    });
  }

  private paintSimulation(host: HTMLElement): void {
    const box = host.querySelector('#l23-sim');
    if (!(box instanceof HTMLElement)) return;
    const sim = simulation();
    box.innerHTML = `
      <div style="font-size: 0.66rem; color: var(--muted); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        All ${sim.orderings} orders: ${sim.spread
          .map(
            (s) =>
              `<span style="color: ${s.invariant ? 'var(--running)' : 'var(--waiting)'}; font-family: var(--font-mono);">${SHORT_LABELS[s.algorithm]} ${s.invariant ? `${s.min} always` : `${s.min}–${s.max}`}</span>`
          )
          .join(' · ')}
      </div>
    `;
  }

  private paintScoreboard(): void {
    const host = this.scoreboardHost;
    if (!host) return;
    const rows = comparisonFor(this.scenario);
    const winner = bestOf(rows);
    const mine = verdictFor(this.scenario);
    host.innerHTML = `
      <div style="display: flex; gap: calc(var(--step) * 2); flex-wrap: wrap; align-items: baseline;">
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">This rule, this Friday</div>
          <div style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: ${mine.algorithm === winner.algorithm ? 'var(--running)' : 'var(--waiting)'};">${mine.avgWaiting} min average wait</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Same sheet, other rules</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink);">${rows
            .map((r) => `${r.label} ${r.avgWaiting}`)
            .join('  ·  ')}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">Best here</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--running);">${winner.label}</div>
        </div>

      </div>
    `;
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson23Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getComparison: () => comparisonFor(this.scenario),
      getLittle: () => this.getLittle(),
      setSolveFor: (k: 'n' | 'lambda' | 'w') => this.setSolveFor(k),
      setLittleTerm: (k: 'n' | 'lambda' | 'w', v: number) => this.setLittleTerm(k, v),
      getSimulation: () => simulation()
    };
  }
}

export const lesson23Input: GanttInput = scenarioInput('fcfs');

export const lesson23: Lesson<GanttInput, GanttState> = {
  id: 23,
  lecture: 7,
  slug: 'lesson-23',
  title: 'Guessing before you build',
  absorbsUnits: [31, 32, 33],
  slides: 'slides 24–30',
  engine: 'gantt',
  engineClass: Lesson23GanttEngine,
  lensLabels: {
    analogy: '🍚 Friday night, five tables',
    mechanism: '📊 One workload, three rules',
    analogyTitle: 'View as the restaurant deciding how to serve',
    mechanismTitle: 'View as deterministic evaluation on a fixed workload'
  },
  analogy: {
    domain: 'food',
    text: 'Ammu has last Friday\'s tickets in front of her and five tables seated at eight — a tea and a shingara, two kacchi, an engagement party for twenty. She can settle the argument exactly for that one night, or she can work in averages that hold for every night, or she can just try the new rule on real customers and find out.'
  },
  concept:
    'Choosing a scheduling algorithm means fixing your criteria first and then evaluating candidates against them. Deterministic modelling takes one predetermined workload and computes each algorithm\'s performance exactly — on the deck\'s five processes it gives FCFS 28 ms, non-preemptive SJF 13 ms and round robin 23 ms. It is simple and fast, and its weakness is in the definition: it needs exact numbers as input and its answer applies only to those inputs. Queueing models go the other way, describing arrivals and bursts probabilistically and computing averages; Little\'s formula, n = λ × W, says that in steady state the average queue length is the arrival rate times the average wait, and it holds for any scheduling algorithm and any arrival distribution. Simulation buys back accuracy by programming a model of the system with the clock as a variable, driven by random numbers or by trace tapes of real events, at much higher cost. Implementation is more accurate still and costs the most of all, and even then environments vary — which is why the most flexible schedulers can be tuned per site.',
  morphReveals:
    'At the door every party takes up one place in the line: the widths are equal, because a booking is a booking and one table is one table. Redraw the same five on a time axis and width stops meaning a place and starts meaning kitchen minutes — the engagement party alone is almost as wide as the other four together (29 vs 32 minutes), and the little tea order that looked equal at the door is a sliver. That change of meaning is the whole of deterministic modelling: it is only once width is time that the 28 minutes exists at all, and it is a fact about this Friday\'s ordering, not about the rule.',
  morphMode: 'morph',
  analogyMapping: [
    'A table seated at eight ➔ a process arriving at time 0',
    'Minutes the kitchen spends on that order ➔ CPU burst time',
    'One stove, one order at a time ➔ the single CPU core',
    'Staring at the tablecloth before the food comes ➔ waiting time',
    'Averaging the five waits ➔ deterministic modelling, slides 24–25',
    'Seven join the counter queue a minute, fourteen standing ➔ n = λ × W, slide 27',
    'Every possible booking order, not just last Friday\'s ➔ simulation, slides 28–30',
    'Trying the new rule on real customers ➔ implementation: highest cost, highest risk'
  ],
  input: lesson23Input
};

export default lesson23;
