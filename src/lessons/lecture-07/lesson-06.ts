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
    if (it.queueId !== 'Q0') continue;
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

  /** Real processes from the lesson input — never invented (§2.1). */
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
      it.queueId = 'Q0';
    });
    this.input.events = [
      { caption: 'P1 enters Q0 (q=8). It runs for 8ms but does not finish, so it demotes to Q1.', action: 'demote', itemId: 'P1', toQueue: 'Q1' },
      { caption: 'P2 enters Q0 (q=8). It finishes in 8ms and exits.', action: 'complete', itemId: 'P2' },
      { caption: 'P3 enters Q0 (q=8). It uses 8ms, still needs 7ms, demoting to Q1.', action: 'demote', itemId: 'P3', toQueue: 'Q1' },
      { caption: 'P1 runs in Q1 (q=16), uses 16ms, still needs 6ms, demoting to Q2.', action: 'demote', itemId: 'P1', toQueue: 'Q2' }
    ];
    this.steps = this.buildSteps(this.input);
    this.seek(0);
    this.updateTransportUI();
    this.updateScoreboardUI();
  }

  private regenerateSimulation(): void {
    const q0 = this.threshold;
    const q1 = 16;
    const events: QueueEvent[] = [];

    // Simulate MLFQ progression based on current initial queues and thresholds
    const items = this.input.items;
    for (const it of items) {
      const b = it.burst ?? 10;
      if (it.queueId === 'Q0') {
        if (b <= q0) {
          events.push({
            caption: `${it.id} finishes in Q0 within ${q0}ms quantum and exits.`,
            action: 'complete',
            itemId: it.id
          });
        } else {
          events.push({
            caption: `${it.id} enters Q0 (q=${q0}). It runs for ${q0}ms, needing ${b - q0}ms more, demoting to Q1.`,
            action: 'demote',
            itemId: it.id,
            toQueue: 'Q1'
          });
          const rem1 = b - q0;
          if (rem1 <= q1) {
            events.push({
              caption: `${it.id} runs in Q1 (q=${q1}ms) for ${rem1}ms and completes.`,
              action: 'complete',
              itemId: it.id
            });
          } else {
            events.push({
              caption: `${it.id} runs in Q1 (q=${q1}), uses ${q1}ms, still needing ${rem1 - q1}ms, demoting to Q2.`,
              action: 'demote',
              itemId: it.id,
              toQueue: 'Q2'
            });
          }
        }
      } else if (it.queueId === 'Q1') {
        if (b <= q1) {
          events.push({
            caption: `${it.id} runs in Q1 (q=${q1}ms) for ${b}ms and completes.`,
            action: 'complete',
            itemId: it.id
          });
        } else {
          events.push({
            caption: `${it.id} runs in Q1 (q=${q1}ms), exceeds quantum, demoting to Q2.`,
            action: 'demote',
            itemId: it.id,
            toQueue: 'Q2'
          });
        }
      } else {
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
        .filter(it => it.queueId === 'Q0' && (it.burst ?? 0) > q0)
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

    // Update lens switcher buttons for airport lanes & MLFQ
    const lensButtons = document.querySelectorAll('.lens-controller button');
    if (buttonsHas(lensButtons, 0)) {
      lensButtons[0].textContent = '✈️ Airport Lanes Analogy';
      (lensButtons[0] as HTMLButtonElement).title = 'View as class-based airport lanes';
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
            ✈️ Fixed Lanes (No Demotion)
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
          const nextQ = it.queueId === 'Q0' ? 'Q1' : 'Q2';
          this.moveItemToQueue(it.id, nextQ);
        }
      });
    });

    playground.querySelectorAll('.btn-promote-p').forEach(btn => {
      btn.addEventListener('click', e => {
        const pId = (e.currentTarget as HTMLElement).getAttribute('data-proc');
        const it = this.input.items.find(x => x.id === pId);
        if (it) {
          const prevQ = it.queueId === 'Q2' ? 'Q1' : 'Q0';
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

export const lesson06Input: QueueInput = {
  queues: [
    { id: 'Q0', label: 'Q0 (RR q=8ms)', quantum: 8 },
    { id: 'Q1', label: 'Q1 (RR q=16ms)', quantum: 16 },
    { id: 'Q2', label: 'Q2 (FCFS)' }
  ],
  cores: [{ id: 'cpu0', label: 'CPU 0' }],
  items: [
    { id: 'P1', name: 'Order 1', burst: 30, queueId: 'Q0' },
    { id: 'P2', name: 'Order 2', burst: 8, queueId: 'Q0' },
    { id: 'P3', name: 'Order 3', burst: 15, queueId: 'Q0' }
  ],
  events: [
    { caption: 'P1 enters Q0 (q=8). It runs for 8ms but does not finish, so it demotes to Q1.', action: 'demote', itemId: 'P1', toQueue: 'Q1' },
    { caption: 'P2 enters Q0 (q=8). It finishes in 8ms and exits.', action: 'complete', itemId: 'P2' },
    { caption: 'P3 enters Q0 (q=8). It uses 8ms, still needs 7ms, demoting to Q1.', action: 'demote', itemId: 'P3', toQueue: 'Q1' },
    { caption: 'P1 runs in Q1 (q=16), uses 16ms, still needs 6ms, demoting to Q2.', action: 'demote', itemId: 'P1', toQueue: 'Q2' }
  ],
  analogy: {
    domain: 'travel',
    serviceLabel: 'Check-in Desk',
    queueLabels: { Q0: 'First Class Lane', Q1: 'Business Lane', Q2: 'Economy Lane' }
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
    analogy: '\u2708\ufe0f Airport Lanes Analogy',
    mechanism: '\u2699\ufe0f MLFQ Mechanism',
    analogyTitle: 'View as class-based airport lanes',
    mechanismTitle: 'View as multilevel feedback queue mechanism'
  },
  analogy: {
    domain: 'travel',
    text: 'Airport check-in with permanently separate lines for first, business, and economy where lower classes wait indefinitely — paired with a counter that demotes dithering customers to slower lanes with longer time slots, while quick orders stay in express.'
  },
  concept: 'Multilevel Queue scheduling partitions ready jobs into permanent priority tiers with independent scheduling algorithms, risking starvation for lower queues. Multilevel Feedback Queue (MLFQ) dynamically adjusts priority based on observed CPU-burst behavior: jobs that exhaust their time quantum are demoted to lower-priority, higher-quantum queues, while interactive I/O jobs remain at top priority. Aging mechanisms periodically promote long-waiting jobs to prevent starvation.',
  morphReveals: 'At the airport, which lane you stand in is printed on your ticket — a fact about who you are before you arrive. In the feedback queues that same vertical position is earned: every job that outlives its time slice drops a row. Height stops describing what a job is and starts recording how it has behaved.',
  morphMode: 'morph',
  analogyMapping: [
    'First Class Lane ➔ Top Priority Queue Q0 (RR q=8ms)',
    'Business Class Lane ➔ Medium Priority Queue Q1 (RR q=16ms)',
    'Economy Class Lane ➔ Low Priority Queue Q2 (FCFS)',
    'Check-in Desk / Counter ➔ CPU Core (cpu0)',
    'Fast Check-in / Quick Order (P2) ➔ Interactive I/O-bound job',
    'Complex Inquiry / Dithering (P1, P3) ➔ CPU-bound batch job',
    'Lane Demotion ➔ MLFQ Feedback Demotion on Quantum Expiry'
  ],
  input: lesson06Input
};

export default lesson06;
