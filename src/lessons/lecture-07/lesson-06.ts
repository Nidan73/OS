import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import { QueueEngine, type QueueInput, type QueueEvent, type QueueState } from '../../engines/queue.js';
import { mlfq, type Process, type ScheduleResult } from '../../algorithms/scheduling.js';

/**
 * Demotions are DERIVED from burst vs quantum, never counted by hand (§2.1).
 * A job demotes once when it outlives Q0's quantum, and again when the
 * remainder outlives Q1's.
 */
export function countDemotions(
  items: { id: string; burst?: number; queueId?: string }[],
  q0: number,
  q1: number
): number {
  let n = 0;
  for (const it of items) {
    // Items stage in 'incoming' before the feedback loop sees them, only Q0
    // residents can demote, and everything here starts there.
    if (it.queueId !== 'incoming' && it.queueId !== 'Q0') continue;
    const burst = it.burst ?? 0;
    if (burst > q0) {
      n += 1;
      if (burst - q0 > q1) n += 1;
    }
  }
  return n;
}

export class MLFQQueueEngine extends QueueEngine implements PlaygroundCapable {
  /** Q1's round-robin quantum in ms. Q0's is the adjustable demotion threshold. */
  static readonly Q1_QUANTUM = 16;

  private threshold = 8;
  private playgroundAttached = false;

  public override init(initialView?: number): void {
    super.init(initialView);
    queueMicrotask(() => this.setupMLFQPlayground());
    setTimeout(() => this.setupMLFQPlayground(), 20);
  }

  /** Real processes from the lesson input, never invented (§2.1). */
  public getProcesses(): Process[] {
    return (this.input?.items ?? []).map(it => ({
      id: it.id,
      burst: it.burst ?? 0,
      arrival: 0
    }));
  }

  /** Computed by mlfq(), never typed. Reflects the current demotion threshold. */
  public getScheduleResult(): ScheduleResult {
    return mlfq(this.getProcesses(), this.threshold, MLFQQueueEngine.Q1_QUANTUM);
  }

  public reorderProcesses(): void {}

  public setDemotionThreshold(q0Quantum: number): void {
    this.threshold = q0Quantum;
    this.regenerateSimulation();
  }

  public moveItemToQueue(itemId: string, queueId: string): void {
    const it = this.input.items.find(x => x.id === itemId);
    if (it) {
      it.queueId = queueId;
      this.regenerateSimulation();
    }
  }

  public resetToDefault(): void {
    this.threshold = 8;
    this.input.items.forEach(it => {
      it.queueId = 'incoming';
    });
    this.input.events = [...lesson06Events];
    this.steps = this.buildSteps(this.input);
    this.seek(0);
    this.updateTransportUI();
    this.updateScoreboardUI();
  }

  private regenerateSimulation(): void {
    const q0 = this.threshold;
    const q1 = 16;
    const events: QueueEvent[] = [];

    // Simulate MLFQ progression based on current initial queues and thresholds.
    // Every quantum run is two beats, the dispatch onto the core, then what
    // the run decided (complete or demote), so the timeline stays one step
    // per discrete event at every threshold.
    const dispatch = (it: { id: string }, from: string, q: number): QueueEvent => ({
      caption: `${it.id} dispatched on CPU 0 from ${from} (q=${q}ms).`,
      action: 'dispatch',
      itemId: it.id,
      coreId: 'cpu0'
    });
    const items = this.input.items;
    for (const it of items) {
      const b = it.burst ?? 10;
      // The regen path replays items from wherever the learner put them, so an
      // arrival beat stages each one first, same discrete event as the default
      // script, not a padding step.
      const startQ = it.queueId ?? 'Q0';
      if (startQ !== 'Q0' && startQ !== 'Q1' && startQ !== 'Q2') {
        events.push({ caption: `${it.id} arrives, joins the ${startQ} table.`, action: 'enqueue', itemId: it.id, toQueue: 'Q0' });
      }
      if (startQ === 'Q0' || startQ === 'incoming') {
        events.push(dispatch(it, 'Q0', q0));
        if (b <= q0) {
          events.push({
            caption: `${it.id} finishes in Q0 within ${q0}ms quantum and exits.`,
            action: 'complete',
            itemId: it.id
          });
        } else {
          events.push({
            caption: `${it.id} runs ${q0}ms, needing ${b - q0}ms more, moved down a tier to Q1.`,
            action: 'demote',
            itemId: it.id,
            toQueue: 'Q1'
          });
          const rem1 = b - q0;
          events.push(dispatch(it, 'Q1', q1));
          if (rem1 <= q1) {
            events.push({
              caption: `${it.id} runs in Q1 for ${rem1}ms and completes.`,
              action: 'complete',
              itemId: it.id
            });
          } else {
            events.push({
              caption: `${it.id} runs ${q1}ms in Q1, still needing ${rem1 - q1}ms, moved down a tier to Q2.`,
              action: 'demote',
              itemId: it.id,
              toQueue: 'Q2'
            });
            events.push(dispatch(it, 'Q2', q1));
            events.push({
              caption: `${it.id} runs in Q2 (FCFS) to completion.`,
              action: 'complete',
              itemId: it.id
            });
          }
        }
      } else if (startQ === 'Q1') {
        events.push(dispatch(it, 'Q1', q1));
        if (b <= q1) {
          events.push({
            caption: `${it.id} runs in Q1 for ${b}ms and completes.`,
            action: 'complete',
            itemId: it.id
          });
        } else {
          events.push({
            caption: `${it.id} exceeds the Q1 quantum, moved down a tier to Q2.`,
            action: 'demote',
            itemId: it.id,
            toQueue: 'Q2'
          });
          events.push(dispatch(it, 'Q2', q1));
          events.push({
            caption: `${it.id} runs in Q2 (FCFS) to completion.`,
            action: 'complete',
            itemId: it.id
          });
        }
      } else {
        events.push(dispatch(it, 'Q2', q1));
        events.push({
          caption: `${it.id} runs in Q2 (FCFS) to completion.`,
          action: 'complete',
          itemId: it.id
        });
      }
    }

    this.input.events = events;
    this.steps = this.buildSteps(this.input);
    this.seek(0);
    this.updateTransportUI();
    this.updateScoreboardUI();
  }

  private updateTransportUI(): void {
    const scrubber = document.querySelector<HTMLInputElement>('.transport-bar input[type="range"]');
    if (scrubber) {
      scrubber.max = String(Math.max(0, this.steps.length - 1));
      scrubber.value = '0';
    }
    const indicator = document.querySelector<HTMLElement>('.step-indicator');
    if (indicator) {
      indicator.textContent = `1 / ${this.steps.length}`;
    }
    const caption = document.querySelector<HTMLElement>('.caption-banner');
    if (caption && this.steps[0]) {
      caption.textContent = this.steps[0].caption;
    }
  }

  /**
   * Every figure here is computed from mlfq() and the live threshold (§2.1).
   * Nothing in this method may be a typed constant.
   */
  private updateScoreboardUI(): void {
    const q0 = this.threshold;
    const q1 = MLFQQueueEngine.Q1_QUANTUM;
    const items = this.input.items ?? [];
    const schedule = this.getScheduleResult();
    const demotions = countDemotions(items, q0, q1);

    const turnaroundEl = document.getElementById('metric-turnaround');
    if (turnaroundEl) {
      turnaroundEl.textContent = `${schedule.avgTurnaround.toFixed(1)} ms`;
    }

    const waitingEl = document.getElementById('metric-turnaround-sub');
    if (waitingEl) {
      waitingEl.textContent = `avg wait ${schedule.avgWaiting.toFixed(1)} ms`;
    }

    const countEl = document.getElementById('metric-demotions');
    if (countEl) {
      countEl.textContent = `${demotions} ${demotions === 1 ? 'demotion' : 'demotions'}`;
    }

    const demotionsSubEl = document.getElementById('metric-demotions-sub');
    if (demotionsSubEl) {
      const paths = items
        .filter(it => (it.queueId === 'Q0' || it.queueId === 'incoming') && (it.burst ?? 0) > q0)
        .map(it => {
          const deep = (it.burst ?? 0) - q0 > q1;
          return `${it.id} (Q0\u2192Q1${deep ? '\u2192Q2' : ''})`;
        });
      demotionsSubEl.textContent = paths.length > 0 ? paths.join(', ') : 'none at this threshold';
    }

    const distEl = document.getElementById('metric-distribution');
    if (distEl) {
      distEl.innerHTML = items
        .map(it => {
          const burst = it.burst ?? 0;
          const remainder = burst - q0;
          let lands: string;
          let tone: string;
          if (burst <= q0) {
            lands = 'finishes in Q0';
            tone = 'var(--running)';
          } else if (remainder <= q1) {
            lands = 'finishes in Q1';
            tone = 'var(--waiting)';
          } else {
            lands = 'falls to Q2';
            tone = 'var(--ink-2)';
          }
          return `<div style="display: flex; justify-content: space-between;"><span style="font-weight: 600;">${it.id} (${burst}ms):</span><span style="color: ${tone};">${lands}</span></div>`;
        })
        .join('');
    }
  }

  private setupMLFQPlayground(): void {
    const playground = document.getElementById('playground');
    if (!playground || this.playgroundAttached) return;
    this.playgroundAttached = true;

    // Relocate primary control attribute to the demotion threshold slider
    playground.removeAttribute('data-primary-control');

    // Update lens switcher buttons for restaurant seating tiers & MLFQ
    const lensButtons = document.querySelectorAll('.lens-controller button');
    if (buttonsHas(lensButtons, 0)) {
      lensButtons[0].textContent = '🍽️ Restaurant Tables Analogy';
      (lensButtons[0] as HTMLButtonElement).title = 'View as restaurant seating tiers';
    }
    if (buttonsHas(lensButtons, 2)) {
      lensButtons[2].textContent = '⚙️ MLFQ Mechanism';
      (lensButtons[2] as HTMLButtonElement).title = 'View as multilevel feedback queue mechanism';
    }

    // Expose [data-view-lens] explicitly on the view slider if not already present
    const viewSlider = document.querySelector('#view-lens');
    viewSlider?.setAttribute('data-view-lens', 'true');

    // Render MLFQ interactive playground
    playground.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Interactive Playground</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="mlfq-preset-default" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--accent); color: var(--accent); cursor: pointer;">
            ⚡ Standard MLFQ (8ms / 16ms / FCFS)
          </button>
          <button id="mlfq-preset-strict" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--waiting); color: var(--waiting); cursor: pointer;">
            🪑 Fixed Tables (No Demotion)
          </button>
          <button id="mlfq-preset-fast" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--running); color: var(--running); cursor: pointer;">
            ⏩ Fast Demotion (q=4ms)
          </button>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-md, 11px); margin-top: 2px;">
        <label for="mlfq-demotion-slider" style="font-size: 0.76rem; font-weight: 600; color: var(--ink);">
          Demotion Threshold (Q0 Quantum): <span id="threshold-display" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${this.threshold} ms</span>
        </label>
        <input type="range" id="mlfq-demotion-slider" data-primary-control="true" min="4" max="24" step="2" value="${this.threshold}" style="width: 140px; cursor: pointer;" aria-label="Demotion threshold quantum slider" />
      </div>

      <div id="mlfq-process-cards" style="display: flex; gap: 6px; margin-top: 2px;">
        ${this.input.items.map(p => `
          <div class="mlfq-item-card" data-proc="${p.id}" style="flex: 1; min-width: 80px; padding: 4px 6px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px); display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; color: var(--accent);">${p.id}</span>
              <span style="font-size: 0.7rem; padding: 1px 4px; border-radius: var(--rounded-pill, 9999px); background: var(--surface); border: 1px solid var(--hairline); font-family: var(--font-mono); font-weight: 600;">${p.burst}ms</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${(p.burst ?? 0) >= 20 ? '🧳 Long / Batch' : (p.burst ?? 0) <= 8 ? '⚡ Quick / Interactive' : '⏱️ Medium Task'}
            </div>
            <div style="display: flex; gap: 4px; margin-top: 2px;">
              <button type="button" class="btn-demote-p" data-proc="${p.id}" style="flex: 1; padding: 2px 4px; border: 1px solid var(--hairline); border-radius: var(--rounded-pill, 9999px); background: var(--surface); font-size: 0.7rem; font-weight: 600; cursor: pointer;">
                Demote &darr;
              </button>
              <button type="button" class="btn-promote-p" data-proc="${p.id}" style="flex: 1; padding: 2px 4px; border: 1px solid var(--hairline); border-radius: var(--rounded-pill, 9999px); background: var(--surface); font-size: 0.7rem; font-weight: 600; cursor: pointer;">
                Promote &uarr;
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Render MLFQ Scoreboard
    const scoreboard = document.querySelector('.lesson-scoreboard');
    if (scoreboard) {
      scoreboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Live Scoreboard</h3>
          <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);">
            🛡️ Aging Active: Starvation Guarded
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1.25fr; gap: 6px;">
          <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
            <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Avg Turnaround</div>
            <div id="metric-turnaround" style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${this.getScheduleResult().avgTurnaround.toFixed(1)} ms</div>
            <div id="metric-turnaround-sub" style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">avg wait ${this.getScheduleResult().avgWaiting.toFixed(1)} ms</div>
          </div>
          <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
            <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Feedback Demotions</div>
            <div id="metric-demotions" style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--waiting); margin: 2px 0;">${countDemotions(this.input.items ?? [], this.threshold, MLFQQueueEngine.Q1_QUANTUM)} demotions</div>
            <div id="metric-demotions-sub" style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">&nbsp;</div>
          </div>
          <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
            <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Queue Distribution</div>
            <div id="metric-distribution" style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;"></div>
          </div>
        </div>
      `;
    }

    // Attach event listeners for controls
    const thresholdSlider = playground.querySelector<HTMLInputElement>('#mlfq-demotion-slider');
    thresholdSlider?.addEventListener('input', () => {
      const val = Number(thresholdSlider.value);
      const disp = playground.querySelector('#threshold-display');
      if (disp) disp.textContent = `${val} ms`;
      this.setDemotionThreshold(val);
    });

    playground.querySelector('#mlfq-preset-default')?.addEventListener('click', () => {
      if (thresholdSlider) thresholdSlider.value = '8';
      const disp = playground.querySelector('#threshold-display');
      if (disp) disp.textContent = '8 ms';
      this.resetToDefault();
    });

    playground.querySelector('#mlfq-preset-strict')?.addEventListener('click', () => {
      if (thresholdSlider) thresholdSlider.value = '30';
      const disp = playground.querySelector('#threshold-display');
      if (disp) disp.textContent = '30 ms';
      this.setDemotionThreshold(30);
    });

    playground.querySelector('#mlfq-preset-fast')?.addEventListener('click', () => {
      if (thresholdSlider) thresholdSlider.value = '4';
      const disp = playground.querySelector('#threshold-display');
      if (disp) disp.textContent = '4 ms';
      this.setDemotionThreshold(4);
    });

    playground.querySelectorAll('.btn-demote-p').forEach(btn => {
      btn.addEventListener('click', e => {
        const pId = (e.currentTarget as HTMLElement).getAttribute('data-proc');
        const it = this.input.items.find(x => x.id === pId);
        if (it) {
          const nextQ = it.queueId === 'incoming' || it.queueId === 'Q0' ? 'Q1' : 'Q2';
          this.moveItemToQueue(it.id, nextQ);
        }
      });
    });

    playground.querySelectorAll('.btn-promote-p').forEach(btn => {
      btn.addEventListener('click', e => {
        const pId = (e.currentTarget as HTMLElement).getAttribute('data-proc');
        const it = this.input.items.find(x => x.id === pId);
        if (it) {
          const prevQ = it.queueId === 'Q2' ? 'Q1' : it.queueId === 'Q1' ? 'Q0' : 'Q0';
          this.moveItemToQueue(it.id, prevQ);
        }
      });
    });
  
    // Fill the computed tiles now that the scoreboard exists in the DOM.
    this.updateScoreboardUI();
  }
}

function buttonsHas(list: NodeListOf<Element>, index: number): boolean {
  return Boolean(list && list.length > index && list[index]);
}

// Register MLFQQueueEngine for engine id 'queue'

export const lesson06Events: QueueEvent[] = [
  { caption: 'P1 arrives, is seated at the Q0 express table.', analogyCaption: 'A table sits down and is put at the front, where service is quickest. Everyone starts there.', action: 'enqueue', itemId: 'P1', toQueue: 'Q0' },
  { caption: 'P2 arrives, the quick order queues behind P1.', analogyCaption: 'A second table arrives and waits behind them, also at the front.', action: 'enqueue', itemId: 'P2', toQueue: 'Q0' },
  { caption: 'P3 arrives, three deep in Q0, nobody served yet.', analogyCaption: 'And a third. Three tables at the front now, none of them served yet, and the host still has no idea which of them will be quick.', action: 'enqueue', itemId: 'P3', toQueue: 'Q0' },
  { caption: 'P1 dispatched on CPU 0 from Q0 (q=8). It runs its first quantum.', analogyCaption: 'The waiter goes to the first table and gives them a short stretch of attention.', action: 'dispatch', itemId: 'P1', coreId: 'cpu0' },
  { caption: 'P1 outlives the 8ms slice with 22ms left, moved down a tier to Q1.', analogyCaption: 'They are nowhere near done. So the host moves them back a tier, not as a punishment, but because they have now shown what kind of table they are.', action: 'demote', itemId: 'P1', toQueue: 'Q1' },
  { caption: 'P2 dispatched on CPU 0 from Q0 (q=8). Short order, runs to the end of its burst.', analogyCaption: 'The second table gets its stretch of attention.', action: 'dispatch', itemId: 'P2', coreId: 'cpu0' },
  { caption: 'P2 finishes inside Q0 in 8ms and exits, no demotion.', analogyCaption: 'They finish inside it and leave. They were never moved back, because they never needed to be.', action: 'complete', itemId: 'P2' },
  { caption: 'P3 dispatched on CPU 0 from Q0 (q=8). It runs its first quantum.', analogyCaption: 'The third table gets its turn at the front.', action: 'dispatch', itemId: 'P3', coreId: 'cpu0' },
  { caption: 'P3 still needs 7ms after 8ms, moved down a tier to Q1.', analogyCaption: 'Still not finished, so back a tier they go as well.', action: 'demote', itemId: 'P3', toQueue: 'Q1' },
  { caption: 'P1 dispatched again, now from Q1 (q=16). It runs its second quantum.', analogyCaption: 'Back at the middle tier the first table gets a longer stretch this time, because tables back here are known to need it.', action: 'dispatch', itemId: 'P1', coreId: 'cpu0' },
  { caption: 'P1 still needs 6ms after 16ms, moved down a tier to Q2.', analogyCaption: 'Still not done. Back one more tier.', action: 'demote', itemId: 'P1', toQueue: 'Q2' },
  { caption: 'P3 dispatched from Q1 (q=16). Its 7ms remainder fits, runs to completion.', analogyCaption: 'The third table gets the longer stretch and it is enough for them.', action: 'dispatch', itemId: 'P3', coreId: 'cpu0' },
  { caption: 'P3 finishes in Q1 and exits.', analogyCaption: 'They finish and leave from the middle tier.', action: 'complete', itemId: 'P3' },
  { caption: 'P1 dispatched from Q2 (FCFS). The long batch runs to completion.', analogyCaption: 'The first table, now at the back, is finally left alone for as long as it takes.', action: 'dispatch', itemId: 'P1', coreId: 'cpu0' },
  { caption: 'P1 finishes in Q2 and exits. Every job landed where its burst earned.', analogyCaption: 'They finish too. Nobody was ever asked how long they would take. Every table ended up in the tier its own behaviour put it in.', action: 'complete', itemId: 'P1' }
];

// DENSITY (Task A audit): 16 steps, step 0 stages three arrivals in an
// incoming lane (an arrival is a discrete event and would collapse into the
// initial frame without the lane), then one step per dispatch, completion or
// demotion the feedback loop decides. Three demotions is exactly what
// countDemotions derives: P1 drops twice (30 > 8, 22 > 16), P3 once.
export const lesson06Input: QueueInput = {
  queues: [
    { id: 'incoming', label: 'Incoming (New Arrivals)' },
    { id: 'Q0', label: 'Q0 (RR q=8ms)', quantum: 8 },
    { id: 'Q1', label: 'Q1 (RR q=16ms)', quantum: 16 },
    { id: 'Q2', label: 'Q2 (FCFS)' }
  ],
  cores: [{ id: 'cpu0', label: 'CPU 0' }],
  items: [
    { id: 'P1', name: 'Order 1', burst: 30, queueId: 'incoming' },
    { id: 'P2', name: 'Order 2', burst: 8, queueId: 'incoming' },
    { id: 'P3', name: 'Order 3', burst: 15, queueId: 'incoming' }
  ],
  events: lesson06Events,
  initialAnalogyCaption: 'The host desk opens: three orders arrive, and the kitchen tiers decide who cooks first.',
  analogy: {
    domain: 'food',
    serviceLabel: 'Host Desk',
    queueLabels: { incoming: 'Door Queue (Arriving)', Q0: 'Front Tables', Q1: 'Middle Tables', Q2: 'Back Tables' }
  }
};

export const lesson06: Lesson<QueueInput, QueueState> = {
  id: 6,
  lecture: 7,
  slug: 'lesson-06',
  title: 'Queues within queues (MLFQ)',
  absorbsUnits: [15, 16],
  slides: 'slides 3–6',
  engine: 'queue',
  engineClass: MLFQQueueEngine,
  lensLabels: {
    analogy: '🍽️ Restaurant Tables Analogy',
    mechanism: '⚙️ MLFQ Mechanism',
    analogyTitle: 'View as restaurant seating tiers',
    mechanismTitle: 'View as multilevel feedback queue mechanism'
  },
  analogy: {
    domain: 'food',
    text: 
      'At Yum Cha the tables near the window turn over fast, and the ones at the back do not. That is not an accident, it is the seating rule.\n\n' +
      'Everyone starts at the front. Order quickly, eat, and leave, and next time you are seated at the front again. Sit for two hours over one plate of chicken nanban and the host quietly starts putting you at the back, where the service is slower and the queue is longer, because you have shown you are not in a hurry.\n\n' +
      'The clever part is that it works without anyone being asked anything. The host never has to know in advance who will be quick. He finds out by watching, and he adjusts.\n\n' +
      'And because a table stuck at the back forever would eventually stop coming, there is one more rule: wait long enough back there and you get moved forward again, whatever your history.'
  },
  concept: 'Multilevel Queue scheduling partitions ready jobs into permanent priority tiers with independent scheduling algorithms, risking starvation for lower queues. Multilevel Feedback Queue (MLFQ) dynamically adjusts priority based on observed CPU-burst behavior: jobs that exhaust their time quantum are demoted to lower-priority, higher-quantum queues, while interactive I/O jobs remain at top priority. Aging mechanisms periodically promote long-waiting jobs to prevent starvation.',
  morphReveals: 'At the restaurant, which tier you sit at is printed on your booking, a fact about who you are before you arrive. In the feedback queues that same vertical position is earned: every job that outlives its time slice drops a row. Height stops describing what a job is and starts recording how it has behaved.',
  morphMode: 'morph',
  analogyMapping: [
    'Front Tables ➔ Top Priority Queue Q0 (RR q=8ms)',
    'Middle Tables ➔ Medium Priority Queue Q1 (RR q=16ms)',
    'Back Tables ➔ Low Priority Queue Q2 (FCFS)',
    'Host Desk / Kitchen ➔ CPU Core (cpu0)',
    'Fast Order (P2) ➔ Interactive I/O-bound job',
    'Lingering Order (P1, P3) ➔ CPU-bound batch job',
    'Moved Down a Tier ➔ MLFQ Feedback Demotion on Quantum Expiry'
  ],
  input: lesson06Input
};

export default lesson06;
