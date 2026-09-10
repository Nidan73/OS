import type { Lesson } from '../../core/types.js';
import type { GanttInput, GanttState } from '../../engines/gantt.js';
import { GanttEngine } from '../../engines/gantt.js';

export class RoundRobinGanttEngine extends GanttEngine {
  constructor(container: HTMLElement, input: GanttInput) {
    super(container, input);
  }

  /**
   * Updates time quantum q, recomputes schedule, and updates the view.
   */
  public setQuantum(q: number): void {
    const clampedQ = Math.max(1, Math.min(30, Math.round(q)));
    this.input.quantum = clampedQ;
    this.steps = this.buildSteps(this.input);
    const totalTime = Math.max(1, (this as any).scheduleResult?.totalTime || 30);
    (this as any).timeScale = (this as any).chartWidth / totalTime;
    (this as any).remountScaffolding();
    this.seek(0);
    this.updateCustomControls();
  }

  public getQuantum(): number {
    return this.input.quantum ?? 4;
  }

  protected override mount(): void {
    super.mount();
    this.customizeSvgScaffolding();
    this.scheduleCustomUiEnhancement();
  }

  protected override render(state: GanttState, view: number = 0): void {
    super.render(state, view);
    if (this.input.algorithm !== 'rr') return;

    const v = Math.max(0, Math.min(1, view));
    const svg = this.container.querySelector('svg');
    if (!svg) return;

    const truckTitle = svg.querySelector('#truck-title') as SVGTextElement | null;
    const truckState = svg.querySelector('#truck-state') as SVGTextElement | null;
    const truckBox = svg.querySelector('#truck-box') as SVGRectElement | null;
    const coreTitle = svg.querySelector('#core-title') as SVGTextElement | null;
    const coreState = svg.querySelector('#core-state') as SVGTextElement | null;

    if (truckBox) {
      truckBox.setAttribute('stroke', 'var(--friends)');
    }

    if (truckTitle && truckState) {
      truckTitle.textContent = 'FAMILY CAR';
      truckTitle.setAttribute('fill', 'var(--friends)');
      if (state.activeProcessId) {
        const who = this.input.analogy?.items?.[state.activeProcessId]?.customerName ?? state.activeProcessId;
        truckState.textContent = `Driving: ${who}`;
        truckState.setAttribute('fill', 'var(--friends)');
      } else {
        truckState.textContent = 'KEY LINE';
        truckState.setAttribute('fill', 'var(--muted)');
      }
    }

    if (coreTitle && coreState) {
      coreTitle.textContent = 'CPU CORE';
      if (state.activeProcessId) {
        coreState.textContent = `${state.activeProcessId} (q=${this.getQuantum()})`;
      } else {
        coreState.textContent = 'IDLE';
      }
    }

    // Family members waiting on the car in the analogy view.
    for (const p of this.input.processes) {
      const procGroup = svg.querySelector(`#proc-${p.id}`) as SVGGElement | null;
      if (!procGroup) continue;

      const sprite = procGroup.querySelector(`#sprite-${p.id}`) as SVGGElement | null;
      if (sprite && v < 0.5) {
        const trayTxt = sprite.querySelector('text');
        if (trayTxt) {
          trayTxt.textContent = p.burst >= 20 ? '🚗 long drive' : '🚗 short drive';
        }
      }

      const label = procGroup.querySelector(`#label-${p.id}`) as SVGTextElement | null;
      if (label && v < 0.5) {
        label.textContent = `${p.id} (${p.burst}m turn)`;
      }
    }
  }

  private customizeSvgScaffolding(): void {
    if (this.input.algorithm !== 'rr') return;
    const svg = this.container.querySelector('svg');
    if (!svg) return;

    const truckBox = svg.querySelector('#truck-box') as SVGRectElement | null;
    if (truckBox) {
      truckBox.setAttribute('stroke', 'var(--friends)');
    }
    const truckTitle = svg.querySelector('#truck-title') as SVGTextElement | null;
    if (truckTitle) {
      truckTitle.textContent = 'FAMILY CAR';
      truckTitle.setAttribute('fill', 'var(--friends)');
    }
  }

  private scheduleCustomUiEnhancement(): void {
    if (this.input.algorithm !== 'rr') return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const tryEnhance = () => {
      const root = this.container.closest('.unit-center-col') || document;
      const playground = root.querySelector('#playground') as HTMLElement | null;
      const scoreboard = root.querySelector('.lesson-scoreboard') as HTMLElement | null;
      const lensBtns = root.querySelectorAll('.lens-controller button');

      if (!playground || !scoreboard) {
        return;
      }

      // Update lens button labels
      if (lensBtns.length >= 3) {
        lensBtns[0].textContent = '🚗 Family Car Analogy';
        lensBtns[0].setAttribute('title', 'View as family members sharing the car in fixed turns');
        lensBtns[2].textContent = '📊 Round Robin Mechanism';
        lensBtns[2].setAttribute('title', 'View as preemptive CPU timeline');
      }

      this.renderCustomPlayground(playground);
      this.renderCustomScoreboard(scoreboard);
    };

    queueMicrotask(tryEnhance);
  }

  private updateCustomControls(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = this.container.closest('.unit-center-col') || document;
    const playground = root.querySelector('#playground') as HTMLElement | null;
    const scoreboard = root.querySelector('.lesson-scoreboard') as HTMLElement | null;

    if (playground) this.renderCustomPlayground(playground);
    if (scoreboard) this.renderCustomScoreboard(scoreboard);

    // Update transport scrubber length if present
    const scrubber = root.querySelector('.transport-bar input[type="range"]') as HTMLInputElement | null;
    const stepIndicator = root.querySelector('.step-indicator') as HTMLElement | null;
    const steps = this.getSteps();
    if (scrubber) {
      scrubber.max = String(Math.max(0, steps.length - 1));
      scrubber.value = '0';
    }
    if (stepIndicator) {
      stepIndicator.textContent = `1 / ${steps.length}`;
    }

    // Update caption banner
    const captionBanner = root.querySelector('.caption-banner') as HTMLElement | null;
    if (captionBanner && steps[0]) {
      captionBanner.textContent = steps[0].caption;
    }
  }

  private calculateContextSwitchStats(): {
    switches: number;
    switchCostMs: number;
    effectiveTurnaround: number;
    bottomedOut: boolean;
  } {
    const schedule = this.getScheduleResult();
    const bars = schedule.bars;
    let switches = 0;
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].id !== bars[i - 1].id) {
        switches++;
      }
    }

    const switchCostPerSwitch = 0.5; // 0.5 ms per context switch
    const totalSwitchCost = Math.round(switches * switchCostPerSwitch * 10) / 10;
    const n = this.input.processes.length || 1;
    const effectiveTat = Math.round((schedule.avgTurnaround + totalSwitchCost / n) * 100) / 100;
    const q = this.getQuantum();
    const bottomedOut = q >= 3 && q <= 8;

    return {
      switches,
      switchCostMs: totalSwitchCost,
      effectiveTurnaround: effectiveTat,
      bottomedOut
    };
  }

  private renderCustomPlayground(playground: HTMLElement): void {
    const q = this.getQuantum();

    playground.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Interactive Playground</h3>
          <span style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: var(--accent); background: rgba(0, 102, 204, 0.08); padding: 2px 8px; border-radius: var(--rounded-pill, 9999px);">q = ${q} ms</span>
        </div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="btn-q-1" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${q === 1 ? 'var(--accent)' : 'var(--hairline)'}; color: var(--ink); cursor: pointer;">
            ⚡ q = 1 ms (High Switching)
          </button>
          <button id="btn-q-4" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${q === 4 ? 'var(--accent)' : 'var(--hairline)'}; color: var(--running); cursor: pointer;">
            ⭐ q = 4 ms (Slide 17 Baseline)
          </button>
          <button id="btn-q-24" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${q === 24 ? 'var(--accent)' : 'var(--hairline)'}; color: var(--waiting); cursor: pointer;">
            ⏳ q = 24 ms (FCFS Convoy)
          </button>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
        <input
          type="range"
          id="quantum-slider"
          data-primary-control="true"
          class="quantum-slider playground"
          min="1"
          max="30"
          value="${q}"
          step="1"
          aria-label="Time quantum slider"
          style="width: 100%; height: 28px; cursor: pointer;"
        />
        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">
          <span>q=1 (Handovers eat the drive)</span>
          <span style="color: var(--running); font-weight: 600;">q=4 (Optimal turnaround)</span>
          <span>q=30 (Convoy returns)</span>
        </div>
      </div>
    `;

    const slider = playground.querySelector('#quantum-slider') as HTMLInputElement | null;
    slider?.addEventListener('input', () => {
      this.setQuantum(Number(slider.value));
    });

    playground.querySelector('#btn-q-1')?.addEventListener('click', () => this.setQuantum(1));
    playground.querySelector('#btn-q-4')?.addEventListener('click', () => this.setQuantum(4));
    playground.querySelector('#btn-q-24')?.addEventListener('click', () => this.setQuantum(24));
  }

  private renderCustomScoreboard(scoreboard: HTMLElement): void {
    const q = this.getQuantum();
    const schedule = this.getScheduleResult();
    const stats = this.calculateContextSwitchStats();
    const n = this.input.processes.length || 3;
    const maxWaitGuarantee = (n - 1) * q;

    const badgeText = q <= 2
      ? '⚠️ Context-Switch Penalty Active, handovers eat the drive'
      : stats.bottomedOut
      ? '⚡ Turnaround Bottomed Out, optimal balance of responsiveness & overhead'
      : '⚠️ Large Quantum, degenerating into First-Come First-Served convoy';

    const badgeColor = q <= 2
      ? 'var(--waiting)'
      : stats.bottomedOut
      ? 'var(--running)'
      : 'var(--waiting)';

    scoreboard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Live Scoreboard & Switching Cost</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: rgba(0, 102, 204, 0.08); color: ${badgeColor}; border: 1px solid currentColor;">
          ${badgeText}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Avg Turnaround</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: ${stats.bottomedOut ? 'var(--running)' : 'var(--ink)'}; margin: 2px 0;">
            ${schedule.avgTurnaround} ms
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">Effective: ${stats.effectiveTurnaround} ms</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Switching Overhead</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: ${stats.switches > 10 ? 'var(--waiting)' : 'var(--ink)'}; margin: 2px 0;">
            ${stats.switches} switches
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">+${stats.switchCostMs} ms lost time</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Fairness Guarantee</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: var(--accent); margin: 2px 0;">
            ≤ ${maxWaitGuarantee} ms
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">(n−1)q = (3−1)×${q}</div>
        </div>
      </div>
    `;
  }
}

// Register RoundRobinGanttEngine so dynamic lesson loader uses it

export const lesson04: Lesson<GanttInput, GanttState> = {
  id: 4,
  lecture: 6,
  slug: 'lesson-04',
  title: 'Round Robin and the Cost of Fairness',
  absorbsUnits: [12, 13],
  slides: 'slides 16–19',
  engine: 'gantt',
  engineClass: RoundRobinGanttEngine,
  analogy: {
    domain: 'friends',
    text: 
      'There is one family car and three people who want it this evening. Rather than argue, they agree on a rule: everyone gets a fixed slot, and when your slot is up you bring the car back and hand the key to the next person, finished or not.\n\n' +
      'It is properly fair. Nobody can take the car for the entire evening. Whatever you need it for, you know roughly when your turn will come, because at worst you wait for everyone ahead of you to use one slot each.\n\n' +
      'Then somebody suggests making it fairer still by cutting the slots to five minutes. Now every turn is: find the car, adjust the seat, pull out, drive four minutes, come back, park, hand over the key. The evening fills up with handovers and almost nobody gets anywhere.\n\n' +
      'Fairness has a price, the price is the handover, and the length of the slot decides how much of the evening you spend paying it.'
  },
  concept: 'Round Robin (RR) allocates the CPU using fixed time slices called time quanta (q). Each process executes for at most q units before being preempted to the back of the ready queue, ensuring no process waits more than (n−1)q time units. However, when q is too small, context-switch overhead dominates execution time, causing turnaround time to spike. When q is too large, Round Robin degenerates into First-Come First-Served (FCFS). Tuning q balances responsiveness against switching costs.',
  morphReveals: 'Taking turns with the car, every slot is the same length, so fairness is just holding your place in the key line. On the timeline that same equal width becomes the quantum, and a long drive now needs many separate turns, so shrinking the slot to feel fairer multiplies the handovers until the evening is spent passing the keys.',
  morphMode: 'morph',
  analogyMapping: [
    'Family Car & Keys ➔ CPU Core & Dispatcher',
    'Family Members in Line ➔ Processes in Ready Queue',
    'Trip Lengths (P1: 24 min, P2: 3 min, P3: 3 min) ➔ CPU Burst Times',
    'Fixed Driving Slot (q = 4 min) ➔ Time Quantum Slice',
    'Parking, Keys & Seatbelts ➔ Context-Switch Overhead',
    'Key Line Order ➔ Round Robin Preemptive Schedule'
  ],
  input: {
    processes: [
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 }
    ],
    algorithm: 'rr',
    quantum: 4,
    analogy: {
      domain: 'friends',
      type: 'car',
      serviceLabel: 'Family Car',
      serviceSublabel: 'Driver at the Wheel (CPU Core)',
      queueLabel: 'Key Line Turns',
      items: {
        P1: {
          customerName: 'Abbu',
          orderText: 'Drive to the Market (24 min)',
          orderIcon: 'meal',
          avatarColor: '#E65100'
        },
        P2: {
          customerName: 'Ammu',
          orderText: 'Drive Nearby (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#1565C0'
        },
        P3: {
          customerName: 'Arijit',
          orderText: 'Drive Nearby (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#2E7D32'
        }
      }
    }
  }
};

export default lesson04;
