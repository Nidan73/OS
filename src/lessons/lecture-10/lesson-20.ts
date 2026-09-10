import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import {
  MatrixEngine,
  type MatrixEvent,
  type MatrixInput,
  type MatrixState
} from '../../engines/matrix.js';
import {
  needMatrix,
  requestAlgorithm,
  safetyAlgorithm
} from '../../algorithms/deadlock.js';

// ─────────────────────────────────────────────────────────────────────────────
// L20 · The banker's algorithm (ATLAS units 80–83, slides 26–32)
//
// LESSONS.md: L20, units 80–83. Ammu's monthly household ledger, cash
// on hand, each person's declared ceiling, what they have drawn, what they
// could still ask for. Morphs into
// Available / Max / Allocation / Need. Playground: make P1's request (1,0,2),
// watch the safety sweep run cell by cell, then push it until it is refused."
//
// ATLAS rows (deck wording, kept for provenance):
// | 80 | `matrix` | Banker's Algorithm, Available, Max, Allocation, Need |
// |    |          | slides 26–27 | travel | The group treasurer's ledger: cash
// |    |          |              |        | on hand, each person's declared
// |    |          |              |        | ceiling, what they've drawn, and what
// |    |          |              |        | they could still ask for. |
// | 81 | `matrix` | The Safety Algorithm | slide 28 | travel | Sweep the ledger
// |    |          |                      |          |        | looking for anyone
// |    |          |                      |          |        | you can fully fund
// |    |          |                      |          |        | right now. Fund
// |    |          |                      |          |        | them, collect
// |    |          |                      |          |        | everything back,
// |    |          |                      |          |        | repeat. If everyone
// |    |          |                      |          |        | finishes, the state
// |    |          |                      |          |        | is safe. |
// | 82 | `matrix` | Resource-Request Algorithm | slide 29 | travel | Pretend to
// |    |          |                            |          |        | grant the
// |    |          |                            |          |        | loan, run the
// |    |          |                            |          |        | safety check on
// |    |          |                            |          |        | the imaginary
// |    |          |                            |          |        | ledger, then
// |    |          |                            |          |        | either commit or
// |    |          |                            |          |        | hand the money
// |    |          |                            |          |        | back and say
// |    |          |                            |          |        | wait. |
// | 83 | `matrix` | Banker's Worked Example. P1 requests (1,0,2) | slides 30–32
// |    |          | | travel | The full five-process, three-resource ledger from
// |    |          | |        | the deck, stepped through cell by cell, ending on
// |    |          | |        | the safe sequence ⟨P1, P3, P4, P0, P2⟩. |
//
// ENGINE VERDICT (a): extend MatrixEngine and use its render() unmodified.
// Why: the lesson IS four ledger tables swept cell by cell, exactly what
// MatrixEngine renders (per-cell probe highlight, finished-row dimming, live
// Work row, pretend-grant overlay, [id^="bar-*"] widths computed from amounts).
// Overriding render() would reimplement identical interpolation for no gain.
//
// The carrying property of the morph is WIDTH (and with it, x-position). On
// Ammu's slips every ceiling is written on the same-size slip, // position is just whose slip it is. On the ledger width stops meaning a slip
// and starts meaning units: a Need cell is as wide as what the process still
// claims, so funded rows visibly narrow to nothing as the sweep reclaims.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A rule, applied from the start): the sweep arc shows one
// beat per Task B probe, 15 probes, 15 wait/fund beats, because a different
// Work vector is a different event. P0 fails at [3,3,2], fails again at
// [5,3,2], then passes at [7,4,3]: the Work row is the thing that moves, and
// collapsing those examinations would hide the growth that makes the pass
// possible. Every examination gets its beat: 15 probes plus the satisfied
// losers a full pass scans past (P3 yields to P1, P4 to P3, P0 and P2 to P4,
// P2 to P0, the losers narrate the first-satisfiable-wins discipline behind
// the deck's order, on screen). With the 5 Need derivations, the single wrap
// beat (the scan continues after the last winner instead of restarting at
// the top, the deck order depends on it, so it earns one beat), and the
// computed verdict, the sweep arc is 22 steps. Order fidelity is asserted in lesson20.test.ts
// (funded order P1,P3,P4,P0,P2, the wrap position, the 15-probe log length);
// the stages verify visually: at step 7 P4's bar is still wide while P1's
// has narrowed to nothing, funded and live rows coexist in one frame.
// The P1-request arc adds its three checks (ceiling, cash, sweep) and the
// P4-refusal arc is declared correct at 5 steps (4 events + idle): its four
// real events are the ceiling check, the cash check, the stall probe, and
// the verdict. The pretended P4 sweep really is five failing probes
// ([0,0,2] fits no Need row), compressed to one beat because every probe
// fails identically, Work never moves, and the full probe-by-probe sweep is
// already shown in the sweep and request arcs. No beat repeats a state with
// new words: each derives, probes, reclaims, or names the computed verdict.

// The deck's T0 ledger (slides 30–31), transcribed once.
export const L20_RESOURCES = ['A', 'B', 'C'];
export const L20_PROCESSES = ['P0', 'P1', 'P2', 'P3', 'P4'];
export const L20_AVAILABLE = [3, 3, 2];
export const L20_MAX = [
  [7, 5, 3],
  [3, 2, 2],
  [9, 0, 2],
  [2, 2, 2],
  [4, 3, 3]
];
export const L20_ALLOCATION = [
  [0, 1, 0],
  [2, 0, 0],
  [3, 0, 2],
  [2, 1, 1],
  [0, 0, 2]
];

export type Lesson20Mode = 'sweep' | 'request' | 'refuse';

/** Need derivation beats: one per row, Max minus Allocation, cell by cell. */
function needBeats(): MatrixEvent[] {
  const need = needMatrix(L20_MAX, L20_ALLOCATION);
  return L20_PROCESSES.map((pid, i) => ({
    caption: `${pid} could still ask [${need[i].join(', ')}], ceiling minus drawn.`.slice(0, 120),
    probeCells: need[i].map((_, j) => [i, j] as [number, number]),
    work: [...L20_AVAILABLE],
    activeRow: i
  }));
}

/**
 * One MatrixEvent per safety probe, driven by safetyAlgorithm's own probe
 * log, the animation replays the sweep, never a re-derivation. Reclaim
 * beats reuse the probe's own work-after figure: Work grows by exactly the
 * funded row's Allocation. Resume beats fire only on a genuine wrap, when
 * the circular scan passes P0 (the restart point of the plausible wrong
 * implementation), so the learner sees the one cursor motion that decides
 * the deck's order.
 *
 * A pass can satisfy several processes but funds only its first, so a
 * satisfied probe is not always a funding: the pass assignment below replays
 * the scan positions (never the comparisons) to mark each probe as winner,
 * loser, or wait. A pid mismatch throws, the narration must fail loudly
 * rather than silently diverge from the algorithm's scan order.
 */
function sweepBeats(
  available: number[],
  max: number[][],
  allocation: number[][],
  finished: number[] = []
): { events: MatrixEvent[]; sequence: number[]; work: number[] } {
  const sweep = safetyAlgorithm(available, max, allocation);
  const events: MatrixEvent[] = [];
  const done = [...finished];
  let prevWork = [...available];
  let prevPid = -1;

  const isWinner = new Array<boolean>(sweep.steps.length).fill(false);
  const passWinnerOf = new Array<number>(sweep.steps.length).fill(-1);
  {
    const n = max.length;
    const funded = new Set<number>(finished);
    let cursor = 0;
    let k = 0;
    for (;;) {
      const pass: number[] = [];
      let passWinner = -1;
      for (let t = 0; t < n; t++) {
        const i = (cursor + t) % n;
        if (funded.has(i)) continue;
        const probe = sweep.steps[k];
        if (!probe || probe.pid !== i) {
          throw new Error(
            `L20: probe log diverged from circular scan, expected P${i} at probe ${k}`
          );
        }
        pass.push(k);
        if (probe.satisfied && passWinner < 0) passWinner = i;
        k++;
      }
      if (passWinner < 0) {
        if (k !== sweep.steps.length) {
          throw new Error(
            `L20: ${sweep.steps.length - k} probe(s) beyond the final pass, scan replay diverged`
          );
        }
        break;
      }
      const winnerProbe = pass.find((idx) => sweep.steps[idx].satisfied);
      if (winnerProbe === undefined) {
        throw new Error('L20: pass winner has no satisfied probe, scan replay diverged');
      }
      isWinner[winnerProbe] = true;
      for (const idx of pass) passWinnerOf[idx] = passWinner;
      funded.add(passWinner);
      cursor = (passWinner + 1) % n;
    }
  }

  for (let si = 0; si < sweep.steps.length; si++) {
    const probe = sweep.steps[si];
    const cells = probe.need.map((_, j) => [probe.pid, j] as [number, number]);
    // Genuine wrap only, once per pass: the circular scan passed P0 coming
    // from a higher row. A restart-from-P0 scan would examine P0 here instead
    //, and take the wrong process third. One beat names the cursor motion
    // behind the deck order. (A double P0 examination in one pass, wait then
    // fund, names the wrap once: only the first, wait-side examination.)
    const alreadyWrappedThisPass =
      events.length > 0 && events[events.length - 1].caption.startsWith('Scan wraps');
    if (
      prevPid > probe.pid &&
      probe.pid === 0 &&
      !done.includes(0) &&
      done.length > 0 &&
      !probe.satisfied &&
      !alreadyWrappedThisPass
    ) {
      events.push({
        caption: `Scan wraps past P0, resumes after P${prevPid}, not from the top.`.slice(0, 120),
        work: [...prevWork],
        finishedRows: [...done]
      });
    }
    prevPid = probe.pid;
    if (isWinner[si]) {
      done.push(probe.pid);
      prevWork = prevWork.map((v, j) => v + allocation[probe.pid][j]);
      const funded = `P${probe.pid} fits [${probe.need.join(', ')}], fund, collect back.`;
      events.push({
        caption: funded.slice(0, 120),
        probeCells: cells,
        finishedRows: [...done],
        work: [...prevWork],
        activeRow: probe.pid
      });
    } else if (probe.satisfied) {
      // Fits, but the scan already took this pass's winner: the first
      // satisfiable process in circular order wins, so P4 beats P0 in pass
      // 3, the selection discipline behind the deck's order, on screen.
      events.push({
        caption: `P${probe.pid} fits [${probe.need.join(', ')}] too. P${passWinnerOf[si]} came first in this pass.`.slice(0, 120),
        probeCells: cells,
        finishedRows: [...done],
        work: [...prevWork],
        activeRow: probe.pid
      });
    } else {
      // Every probe earns its beat, a different Work vector is a different
      // event. P0 fails at [3,3,2], fails again at [5,3,2], then passes at
      // [7,4,3]: that progression is the mechanism, not a repeat of it.
      const lacking = probe.cellOk
        .map((ok, j) => (ok ? null : `${L20_RESOURCES[j]} needs ${probe.need[j]}, holds ${probe.work[j]}`))
        .filter(Boolean)
        .join('; ');
      events.push({
        caption: `P${probe.pid} waits, ${lacking}.`.slice(0, 120),
        probeCells: cells,
        finishedRows: [...done],
        work: [...prevWork],
        activeRow: probe.pid
      });
    }
  }

  return { events, sequence: sweep.sequence, work: sweep.work };
}

export function sweepEvents(): MatrixEvent[] {
  const { events, sequence } = sweepBeats(L20_AVAILABLE, L20_MAX, L20_ALLOCATION);
  const order = sequence.map((i) => `P${i}`).join(', ');
  return [
    ...needBeats(),
    ...events,
    {
      caption: `Safe, the sweep drains ⟨${order}⟩. Lending stays open.`.slice(0, 120),
      finishedRows: [0, 1, 2, 3, 4],
      work: [10, 5, 7]
    }
  ];
}

/** P1 asks (1,0,2): the three checks, then the sweep on the pretended ledger. */
export function requestEvents(): MatrixEvent[] {
  const req = requestAlgorithm(
    { available: L20_AVAILABLE, max: L20_MAX, allocation: L20_ALLOCATION },
    1,
    [1, 0, 2]
  );
  const need1 = needMatrix(L20_MAX, L20_ALLOCATION)[1];
  if (!req.granted || !req.safety) {
    throw new Error(
      `L20: deck slide 32 says P1 (1,0,2) is granted, requestAlgorithm refused: ${req.reason}`
    );
  }
  const events: MatrixEvent[] = [
    {
      caption: `P1 asks (1, 0, 2), inside its ceiling [${need1.join(', ')}].`.slice(0, 120),
      probeCells: [[1, 0], [1, 1], [1, 2]],
      work: [...L20_AVAILABLE],
      activeRow: 1
    },
    {
      caption: `Cash [${L20_AVAILABLE.join(', ')}] covers it, pretend the loan.`.slice(0, 120),
      work: [2, 3, 0],
      finishedRows: []
    }
  ];
  const avail = [2, 3, 0];
  const alloc = L20_ALLOCATION.map((row, i) =>
    row.map((v, j) => (i === 1 ? v + [1, 0, 2][j] : v))
  );
  const { events: sweep, sequence } = sweepBeats(avail, L20_MAX, alloc);
  events.push(...sweep);
  const order = sequence.map((i) => `P${i}`).join(', ');
  // req.granted is true (guarded above): the caption states the computed
  // outcome unconditionally, no fallback text that could disagree with it.
  events.push({
    caption: `Granted, the pretended sweep drains ⟨${order}⟩.`.slice(0, 120),
    finishedRows: [0, 1, 2, 3, 4],
    work: [10, 5, 7]
  });
  return events;
}

/** P4 asks (3,3,0): passes ceiling and cash, dies in the sweep, a refusal. */
export function refuseEvents(): MatrixEvent[] {
  const req = requestAlgorithm(
    { available: L20_AVAILABLE, max: L20_MAX, allocation: L20_ALLOCATION },
    4,
    [3, 3, 0]
  );
  const need4 = needMatrix(L20_MAX, L20_ALLOCATION)[4];
  if (req.granted || !req.safety) {
    throw new Error(
      `L20: the Task B sweep proves P4 (3,3,0) unsafe, requestAlgorithm granted it`
    );
  }
  const events: MatrixEvent[] = [
    {
      caption: `P4 asks (3, 3, 0), inside its ceiling [${need4.join(', ')}].`.slice(0, 120),
      probeCells: [[4, 0], [4, 1], [4, 2]],
      work: [...L20_AVAILABLE],
      activeRow: 4
    },
    {
      caption: `Cash [${L20_AVAILABLE.join(', ')}] covers it, pretend the loan.`.slice(0, 120),
      work: [0, 0, 2],
      finishedRows: []
    },
    {
      caption: `Pretended cash [0, 0, 2] fits no Need row, the sweep stalls empty.`.slice(0, 120),
      probeCells: [[0, 0], [0, 1], [0, 2]],
      work: [0, 0, 2],
      activeRow: 0
    },
    {
      // req is refused (guarded above): the caption states the computed
      // outcome unconditionally, the refusal staged as the algorithm working.
      caption: `Refused, and that is the algorithm working, not failing.`.slice(0, 120),
      work: [0, 0, 2],
      finishedRows: []
    }
  ];
  return events;
}

export function modeEvents(mode: Lesson20Mode): MatrixEvent[] {
  switch (mode) {
    case 'request':
      return requestEvents();
    case 'refuse':
      return refuseEvents();
    default:
      return sweepEvents();
  }
}

export function modeInput(mode: Lesson20Mode): MatrixInput {
  const pretend =
    mode === 'request'
      ? {
          available: [2, 3, 0],
          allocation: L20_ALLOCATION.map((row, i) =>
            row.map((v, j) => (i === 1 ? v + [1, 0, 2][j] : v))
          )
        }
      : mode === 'refuse'
        ? {
            available: [0, 0, 2],
            allocation: L20_ALLOCATION.map((row, i) =>
              row.map((v, j) => (i === 4 ? v + [3, 3, 0][j] : v))
            )
          }
        : undefined;
  return {
    resources: [...L20_RESOURCES],
    processes: [...L20_PROCESSES],
    available: [...L20_AVAILABLE],
    max: L20_MAX.map((r) => [...r]),
    allocation: L20_ALLOCATION.map((r) => [...r]),
    events: modeEvents(mode),
    ...(pretend ? { pretend } : {}),
    analogy: { domain: 'friends' }
  };
}

const MODE_LABELS: Record<Lesson20Mode, string> = {
  sweep: '🧹 The safety sweep (T0)',
  request: '💰 P1 asks (1, 0, 2), granted',
  refuse: '🛑 P4 asks (3, 3, 0), refused'
};

/**
 * Lesson 20's engine, scoped to this lesson. Uses MatrixEngine.render()
 * unchanged, the lesson adds the Banker's story: sweep scripts driven by
 * safetyAlgorithm's probe log, the P1 grant, and the P4 refusal staged as
 * the algorithm working correctly.
 */
export class Lesson20MatrixEngine extends MatrixEngine implements PlaygroundCapable {
  private mode: Lesson20Mode = 'sweep';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  public debugHooks(): Record<string, unknown> {
    return {
      setMode: (m: Lesson20Mode) => this.applyMode(m),
      getMode: () => this.mode,
      getSequence: () => safetyAlgorithm(L20_AVAILABLE, L20_MAX, L20_ALLOCATION).sequence
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Run the sweep, grant a loan, push one too far</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(MODE_LABELS) as Lesson20Mode[]).map((id) => `
            <button type="button" class="l20-mode" data-mode="${id}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.mode === id ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.mode === id ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${MODE_LABELS[id]}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">The sweep replays cell by cell, each probe is one examination the algorithm performs. The refusal is Ammu doing her job.</div>
    `;
    host.querySelectorAll('.l20-mode').forEach((el) => {
      el.addEventListener('click', () => {
        this.applyMode((el as HTMLElement).dataset.mode as Lesson20Mode);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.renderScoreboard());
    this.renderScoreboard();
  }

  private applyMode(mode: Lesson20Mode): void {
    this.mode = mode;
    const next = modeInput(mode);
    this.input.resources = next.resources;
    this.input.processes = next.processes;
    this.input.available = next.available;
    this.input.max = next.max;
    this.input.allocation = next.allocation;
    if (next.pretend) this.input.pretend = next.pretend;
    else delete this.input.pretend;
    this.setEvents(next.events);
    const host = this.container.closest('.unit-center-col')?.querySelector('#playground');
    if (host) this.renderPlayground(host as HTMLElement, this.scoreboardHost ?? undefined);
    else this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const steps = this.getSteps();
    const state = steps[this.getCurrentIndex()]?.state;
    if (!state) return;
    const sweep = safetyAlgorithm(L20_AVAILABLE, L20_MAX, L20_ALLOCATION);
    const order = sweep.sequence.map((i) => `P${i}`).join(', ');
    const funded = state.finishedRows.length;
    const verdict =
      this.mode === 'sweep'
        ? { text: `🟢 Safe, ⟨${order}⟩ drains`, color: 'var(--running)', bg: 'rgba(8, 127, 91, 0.12)' }
        : this.mode === 'request'
          ? { text: '🟢 Granted, the sweep still drains', color: 'var(--running)', bg: 'rgba(8, 127, 91, 0.12)' }
          : { text: '🛑 Refused, the algorithm working, not failing', color: 'var(--waiting)', bg: 'rgba(217, 119, 6, 0.12)' };
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Ledger check · ${MODE_LABELS[this.mode]}</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdict.bg}; color: ${verdict.color}; border: 1px solid ${verdict.color};">${verdict.text}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Funded so far</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${funded} / 5</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">step ${this.getCurrentIndex() + 1} of ${steps.length}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Cash on hand</div>
          <div style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: 600; color: var(--accent); margin: 2px 0;">[${state.work.join(', ')}]</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">Work grows as rows return</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The safe order</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: var(--running);">⟨${order}⟩</div>
          <div style="font-size: 0.68rem; color: var(--muted); margin-top: 2px;">computed, the scan resumes, never restarts</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson20Input: MatrixInput = modeInput('sweep');

export const lesson20: Lesson<MatrixInput, MatrixState> = {
  id: 20,
  lecture: 10,
  slug: 'lesson-20',
  title: "The banker's algorithm",
  absorbsUnits: [80, 81, 82, 83],
  slides: 'slides 26–32',
  engine: 'matrix',
  engineClass: Lesson20MatrixEngine,
  lensLabels: {
    analogy: '🧾 Ammu\u2019s ledger slips',
    mechanism: '📒 Available · Max · Allocation · Need',
    analogyTitle: 'View as declared ceilings on Ammu\u2019s identical slips',
    mechanismTitle: 'View as the four ledger tables'
  },
  analogy: {
    domain: 'friends',
    text: 
      'Ammu is at the table with the envelope open in front of her and a piece of paper, and she is going to do this properly.\n\n' +
      'She writes four things down. What is in the envelope right now. The most each person said they might need. What each of them is holding already. And, from those, what each could still come back for.\n\n' +
      'Arijit asks for more. She does not say yes and she does not say no. She does something more careful: she pretends she has already given it to him, crosses out the old numbers, writes the new ones, and then asks whether the family she has just invented could still get through. Could someone finish with what is left? If they finished, could the next person finish with what came back? And the next?\n\n' +
      'If she can get all the way through the list, she rubs out the pretending and actually hands over the money. If she cannot, she says no, and the notes stay in the envelope even though they were sitting right there.'
  },
  concept:
    'The Banker decides each loan by pretending to grant it and running the safety sweep on the imaginary ledger. The sweep looks for someone whose remaining need fits the cash on hand, funds them, collects everything back, and repeats, resuming the scan after each winner rather than restarting at the top. If every process finishes, the state is safe and the loan commits; if the sweep stalls, the money stays and the asker waits. A refusal is the algorithm working, not failing.'  +
    '  This is the BANKER\'S ALGORITHM, and the name is the idea: a bank never lends so much that it could not cover every customer who might still come asking. It works on four structures you will be asked to fill in. AVAILABLE is a vector of what is free right now. MAX is a matrix of the most each process could ever demand. ALLOCATION is a matrix of what each process holds at this moment. NEED is Max minus Allocation, what each could still come back for. A request is granted only if it is within that process\'s Need, only if it fits in Available, and only if the state that results is still safe, which the safety algorithm decides by trying to find an order in which every process can finish.',
  morphReveals:
    'On Ammu\u2019s slips every ceiling is written the same size, position is just whose slip it is. On the ledger width stops meaning a slip and starts meaning units: a Need cell is as wide as what the process still claims, so each funded row visibly narrows to nothing and the cash row grows as holdings return.',
  morphMode: 'morph',
  analogyMapping: [
    'Cash on hand ➔ Available / Work',
    'Declared ceiling ➔ Max',
    'What each has drawn ➔ Allocation',
    'What each could still ask ➔ Need, ceiling minus drawn',
    'Funding someone in full ➔ a finished row, holdings reclaimed',
    'Pretending the loan ➔ the request check on the imaginary ledger',
    'Saying wait ➔ refusal: the sweep stalled, the money stays'
  ],
  input: lesson20Input
};

export default lesson20;
