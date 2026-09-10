import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import {
  DiagramEngine,
  type DiagramInput,
  type DiagramNode,
  type DiagramReveal,
  type DiagramState
} from '../../engines/diagram.js';
import {
  recoveryRounds,
  selectVictim,
  victimCost,
  type RecoveryRun,
  type VictimCandidate
} from '../../algorithms/deadlock.js';

// ─────────────────────────────────────────────────────────────────────────────
// L22 · Getting out (ATLAS units 88–89, slides 42–43)
//
// ANALOGY: mechanism-fixed — the recovery choices (abort all vs victim selection,
// rollback, starvation) are strictly dictated by slide 42–43.
//
// LESSONS.md: L22 — units 88, 89. Choosing whose trip to cancel, or towing one
// car back to the last junction it was safe at. Playground: pick a victim by
// different criteria and watch the cost — then pick the same one repeatedly
// and watch it starve.
//
// ATLAS rows (deck wording, kept for provenance):
// | 88 | Somebody's trip gets cancelled. Abort everyone, or abort one at a
// |      time until the ring breaks — and the ordering criteria decide who loses.
// | 89 | Tow one car out and send it back to the last junction it was safe at.
// |      Pick the cheapest victim — but never the same car every time, or it
// |      never arrives.
//
// SCENE: the driveway again, third and last time — L17 built the ring, L21
// collapsed it to who-blocks-whom, and here the guard breaks it by moving
// somebody's car out. Not a new scene; the same one, resolved.
//
// ENGINE VERDICT (a): extend DiagramEngine and use its render() unmodified.
// Why: units 88 and 89 are a decision surface — criteria feeding one choice —
// which is what DiagramEngine renders. The cars themselves are already drawn
// by L17 and L21; this lesson is about the clipboard, not the driveway.
//
// The carrying property of the morph is WHAT A CARD'S WIDTH MEANS. On the
// guard's clipboard every flat's card is the same width — a name is a name,
// and they sit in an even row. On the cost view width becomes what moving
// that car would cost, so the cheapest victim is visibly the narrowest card
// and the row repacks around it. Each tow widens that card. Width stops
// meaning a name and starts meaning a price — which is exactly why counting
// the tows stops one card being cheapest for ever.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A rule, applied from the start): `abort-all` is 5 (the ring,
// the blunt option, the work thrown away, the result, the verdict).
// `one-at-a-time` is 7 — one beat per criterion the deck lists that actually
// separates these three flats, then the pick and the broken ring. `rollback`
// and `starve` are one beat per selection round plus the opening and the
// computed verdict: 7 each, because five rounds is what makes starvation
// visible and fewer would not. No beat repeats a state with new words.

/** The three blocked-in flats, with the deck's slide-42 criteria as fields. */
export const CANDIDATES: VictimCandidate[] = [
  {
    id: 'Flat 1',
    priority: 3,
    computedMinutes: 40,
    heldUnits: 3,
    neededUnits: 2,
    interactive: true,
    rollbacks: 0
  },
  {
    id: 'Flat 2',
    priority: 1,
    computedMinutes: 8,
    heldUnits: 1,
    neededUnits: 1,
    interactive: false,
    rollbacks: 0
  },
  {
    id: 'Flat 3',
    priority: 2,
    computedMinutes: 20,
    heldUnits: 2,
    neededUnits: 3,
    interactive: false,
    rollbacks: 0
  }
];

export const ROUNDS = 5;

export type Lesson22Scenario = 'abort-all' | 'one-at-a-time' | 'starve' | 'rollback';

export const SCENARIO_LABELS: Record<Lesson22Scenario, string> = {
  'abort-all': '🧹 Move every car',
  'one-at-a-time': '🚗 Move one, cheapest first',
  starve: '🔁 Same car, five nights',
  rollback: '⚖️ Count the tows'
};

/** Width encodes cost — computed, so a card is as wide as it is expensive. */
export const CARD_MIN_W = 60;
export const CARD_SCALE = 1.1;
/** Every card is the same width on the clipboard: a name is just a name. */
export const ANALOGY_CARD_W = 150;

export function cardWidth(cost: number): number {
  return CARD_MIN_W + cost * CARD_SCALE;
}

export function nodesFor(countRollbacks: boolean, rollbacks: Record<string, number>): DiagramNode[] {
  const widths = CANDIDATES.map((c) =>
    cardWidth(victimCost({ ...c, rollbacks: rollbacks[c.id] ?? 0 }, countRollbacks).total)
  );
  // The row repacks around the costs, so x moves with width.
  let cursor = 40;
  return CANDIDATES.map((c, i) => {
    const withTally = { ...c, rollbacks: rollbacks[c.id] ?? 0 };
    const cost = victimCost(withTally, countRollbacks);
    const w = widths[i];
    const x = cursor;
    cursor += w + 14;
    return {
      id: c.id.replace(' ', '-'),
      label: c.id,
      sublabel: `cost ${cost.total}`,
      x,
      y: 120,
      width: w,
      height: 62,
      analogyX: 40 + i * (ANALOGY_CARD_W + 14),
      analogyY: 120,
      analogyWidth: ANALOGY_CARD_W,
      analogyHeight: 62,
      analogyLabel: c.id,
      analogySublabel: c.interactive ? 'someone waiting in it' : 'parked overnight'
    };
  });
}

function emptyTally(): Record<string, number> {
  return Object.fromEntries(CANDIDATES.map((c) => [c.id, 0]));
}

// ── Unit 88 · process termination (deck slide 42) ──

function abortAllReveals(): DiagramReveal[] {
  const totalWork = CANDIDATES.reduce((sum, c) => sum + c.computedMinutes, 0);
  const held = CANDIDATES.reduce((sum, c) => sum + c.heldUnits, 0);
  return [
    { caption: 'Three cars block each other in. Nobody can leave.', highlightNodeIds: [] },
    {
      caption: 'The blunt fix: move every blocked car out at once. The ring cannot survive it.',
      highlightNodeIds: CANDIDATES.map((c) => c.id.replace(' ', '-'))
    },
    {
      caption: `That throws away ${totalWork} minutes of everyone's evening and frees ${held} spots at once.`,
      highlightNodeIds: CANDIDATES.map((c) => c.id.replace(' ', '-')),
      metrics: { 'work lost (min)': totalWork, 'spots freed': held }
    },
    {
      caption: 'It always works, and it is the most expensive thing the guard can do.',
      highlightNodeIds: []
    },
    {
      caption: 'So the real question is which single car to move — and by what rule.',
      highlightNodeIds: []
    }
  ];
}

function oneAtATimeReveals(): DiagramReveal[] {
  const chosen = selectVictim(CANDIDATES, false);
  const cheapest = CANDIDATES.find((c) => c.id === chosen.id)!;
  const dearest = CANDIDATES.reduce((a, b) =>
    victimCost(a, false).total > victimCost(b, false).total ? a : b
  );
  const id = (s: string) => s.replace(' ', '-');
  return [
    { caption: 'Move one car at a time until the ring breaks — but which one?', highlightNodeIds: [] },
    {
      caption: `Priority first: ${dearest.id} matters most, so moving it costs the most.`,
      highlightNodeIds: [id(dearest.id)],
      metrics: { priority: dearest.priority }
    },
    {
      caption: `Work already done counts too — ${dearest.id} has been out ${dearest.computedMinutes} minutes.`,
      highlightNodeIds: [id(dearest.id)],
      metrics: { 'minutes so far': dearest.computedMinutes }
    },
    {
      caption: `Someone waiting inside a car raises its price; an empty one parked overnight does not.`,
      highlightNodeIds: CANDIDATES.filter((c) => c.interactive).map((c) => id(c.id))
    },
    {
      caption: `${cheapest.id} holds ${cheapest.heldUnits} spot and needs ${cheapest.neededUnits} — the cheapest to move.`,
      highlightNodeIds: [id(cheapest.id)],
      metrics: { 'held': cheapest.heldUnits, 'still needs': cheapest.neededUnits }
    },
    {
      caption: `The guard moves ${chosen.id}, at a cost of ${chosen.total}.`,
      highlightNodeIds: [id(chosen.id)],
      badgeText: 'moved',
      metrics: { cost: chosen.total }
    },
    { caption: 'One car out and the ring is open — everyone else drives away.', highlightNodeIds: [] }
  ];
}

// ── Unit 89 · rollback and starvation (deck slide 43) ──

function roundsReveals(countRollbacks: boolean): DiagramReveal[] {
  const run = recoveryRounds(CANDIDATES, ROUNDS, countRollbacks);
  const id = (s: string) => s.replace(' ', '-');
  const out: DiagramReveal[] = [
    {
      caption: countRollbacks
        ? 'Same jam, five nights running — but every tow now counts against the next choice.'
        : 'Same jam, five nights running. The guard picks the cheapest car each time.',
      highlightNodeIds: []
    }
  ];
  run.picks.forEach((pick, i) => {
    out.push({
      caption: `Night ${i + 1}: ${pick} is cheapest at ${run.costs[i]} — it gets towed back.`,
      highlightNodeIds: [id(pick)],
      badgeText: `night ${i + 1}`,
      metrics: { victim: pick, cost: run.costs[i] }
    });
  });
  out.push({
    caption: run.starved
      ? `${run.starvedId} was towed all ${ROUNDS} nights and never got home — that is starvation.`
      : `The tows spread out — no car was picked every night, so everyone eventually gets home.`,
    highlightNodeIds: run.starved && run.starvedId ? [id(run.starvedId)] : [],
    badgeText: run.starved ? 'starved' : 'fair',
    metrics: run.rollbacks
  });
  return out;
}

/**
 * Slide 42's first option: abort every deadlocked process. Its cost is the sum
 * of every victim's cost and its payoff is every held unit released — both
 * computed from CANDIDATES, never typed. The scoreboard used to carry
 * "abort cost 183 · 6 spots freed" as a literal string: correct at the time,
 * and silently wrong the moment a candidate changes.
 */
export interface AbortAllTotals {
  cost: number;
  unitsFreed: number;
  flats: number;
}

/**
 * Rollbacks charged to each flat by the time beat `stepIndex` has played.
 * Pure: same index in, same tally out, with no reference to engine state.
 * The final beat prices in every pick — that beat is the verdict.
 */
export function tallyAt(stepIndex: number): Record<string, number> {
  const run = runFor('rollback');
  const tally = emptyTally();
  const priced = stepIndex >= run.picks.length + 2 ? run.picks.length : Math.max(0, stepIndex - 1);
  for (let i = 0; i < priced && i < run.picks.length; i++) {
    tally[run.picks[i]] = (tally[run.picks[i]] ?? 0) + 1;
  }
  return tally;
}

export function abortAllTotals(candidates: VictimCandidate[] = CANDIDATES): AbortAllTotals {
  return {
    cost: candidates.reduce((sum, c) => sum + victimCost(c, false).total, 0),
    unitsFreed: candidates.reduce((sum, c) => sum + c.heldUnits, 0),
    flats: candidates.length
  };
}

export function runFor(scenario: Lesson22Scenario): RecoveryRun {
  return recoveryRounds(CANDIDATES, ROUNDS, scenario === 'rollback');
}

export function scenarioInput(scenario: Lesson22Scenario): DiagramInput {
  const countRollbacks = scenario === 'rollback';
  const tally =
    scenario === 'starve' || scenario === 'rollback'
      ? runFor(scenario).rollbacks
      : emptyTally();
  const reveals =
    scenario === 'abort-all'
      ? abortAllReveals()
      : scenario === 'one-at-a-time'
        ? oneAtATimeReveals()
        : roundsReveals(countRollbacks);
  return {
    title: 'Breaking the ring',
    nodes: nodesFor(countRollbacks, scenario === 'abort-all' ? emptyTally() : tally),
    reveals,
    analogy: {
      domain: 'travel',
      title: 'The guard’s clipboard',
      subtitle: 'whose car moves tonight'
    }
  };
}

export class Lesson22DiagramEngine extends DiagramEngine implements PlaygroundCapable {
  private scenario: Lesson22Scenario = 'abort-all';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Pick a victim — then pick five nights running</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(SCENARIO_LABELS) as Lesson22Scenario[])
            .map(
              (id) => `
            <button type="button" class="l22-scenario" data-scenario="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.scenario === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.scenario === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${SCENARIO_LABELS[id]}</button>
          `
            )
            .join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Every cost, victim and tally is computed. Compare the last two: the only difference is whether tows count.</div>
    `;
    host.querySelectorAll('.l22-scenario').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyScenario((el as HTMLElement).dataset.scenario as Lesson22Scenario);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.paintScoreboard());
    this.paintScoreboard();
  }

  private applyScenario(id: Lesson22Scenario): void {
    if (!id || id === this.scenario) return;
    this.scenario = id;
    this.input = scenarioInput(id);
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.paintScoreboard();
  }

  /**
   * Card widths under the rollback policy encode the cost as it stands at THIS
   * beat, so they must be derived from the step being rendered — not from the
   * engine's current index. SPEC §4A: render(state, view) is an absolute
   * function of state, which is what makes scrubbing and teardown safe. An
   * earlier version read getCurrentIndex() and getSteps() here, so rendering
   * an arbitrary snapshot drew whatever the engine happened to be pointing at.
   */
  protected render(state: DiagramState, view: number): void {
    if (this.scenario === 'rollback') {
      this.input.nodes = nodesFor(true, tallyAt(state.stepIndex));
    }
    super.render(state, view);
  }

  private paintScoreboard(): void {
    const host = this.scoreboardHost;
    if (!host) return;
    const isAbortAll = this.scenario === 'abort-all';
    const rounds = this.scenario === 'starve' || this.scenario === 'rollback';
    const run = runFor(this.scenario);
    const tone = isAbortAll ? 'var(--accent)' : rounds && run.starved ? 'var(--waiting)' : 'var(--running)';
    const totals = abortAllTotals();
    const label = isAbortAll
      ? `All ${totals.flats} flats`
      : !rounds
        ? selectVictim(CANDIDATES, false).id
        : run.starved
          ? `${run.starvedId} starved`
          : 'Tows shared out';
    const detail = isAbortAll
      ? `abort cost ${totals.cost} · ${totals.unitsFreed} spots freed`
      : !rounds
        ? `cost ${selectVictim(CANDIDATES, false).total}`
        : run.picks.join(' → ');
    host.innerHTML = `
      <div style="display: flex; gap: calc(var(--step) * 2); flex-wrap: wrap; align-items: baseline;">
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">${isAbortAll ? 'Policy' : rounds ? `${ROUNDS} nights` : 'Cheapest to move'}</div>
          <div style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: ${tone};">${label}</div>
        </div>
        <div>
          <div style="font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);">${isAbortAll ? 'Total impact' : rounds ? 'Order of tows' : 'Cost'}</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink);">${detail}</div>
        </div>
      </div>
    `;
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setScenario: (id: Lesson22Scenario) => this.applyScenario(id),
      getScenario: () => this.scenario,
      getRun: () => runFor(this.scenario),
      isStarved: () => runFor(this.scenario).starved
    };
  }
}

export const lesson22Input: DiagramInput = scenarioInput('abort-all');

export const lesson22: Lesson<DiagramInput, DiagramState> = {
  id: 22,
  lecture: 10,
  slug: 'lesson-22',
  title: 'Getting out',
  absorbsUnits: [88, 89],
  slides: 'slides 42–43',
  engine: 'diagram',
  engineClass: Lesson22DiagramEngine,
  lensLabels: {
    analogy: '📋 Whose car moves tonight',
    mechanism: '⚖️ The cost of each victim',
    analogyTitle: 'View as the guard choosing whose car to move',
    mechanismTitle: 'View as victim cost, rollback and starvation'
  },
  analogy: {
    domain: 'travel',
    text: 'The driveway is jammed and one car has to be moved out to break it. The guard picks whichever is cheapest to disturb — the empty one, parked overnight, with nobody waiting in it. Then the same jam happens again tomorrow.'
  },
  concept:
    'Once a deadlock is found the system has to break it. The blunt option aborts every deadlocked process, which always works and throws away all their work. The cheaper option aborts one at a time until the cycle opens, and the choice is a cost question: priority, how long the process has run, what it holds, what it still needs, and whether someone is waiting on it interactively. Preempting a resource instead of killing the process means rolling that process back to a safe state and restarting it. The trap is that the cheapest victim stays cheapest, so the same process is chosen every time and never finishes — which is why the number of rollbacks has to be part of the cost.',
  morphReveals:
    'On the clipboard every flat gets a card the same width, because a name is just a name and they sit in an even row. On the cost view width becomes the price of moving that car, so the cheapest victim is visibly the narrowest card and the row repacks around it — and every tow widens that card. Width stops meaning a name and starts meaning a price, which is precisely why counting the tows stops one card being cheapest for ever.',
  morphMode: 'morph',
  analogyMapping: [
    'Moving every blocked car ➔ abort all deadlocked processes',
    'Moving one car until the jam opens ➔ abort one at a time until the cycle breaks',
    'Someone waiting in the car ➔ an interactive process, costlier to kill',
    'Minutes already spent out ➔ computation thrown away by aborting',
    'Towing a car back to the junction ➔ rollback to a safe state',
    'The same car every night ➔ starvation',
    'Counting the tows against the next choice ➔ rollbacks in the cost factor'
  ],
  input: lesson22Input
};

export default lesson22;
