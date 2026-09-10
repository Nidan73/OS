import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { GanttInput, GanttState } from '../../engines/gantt.js';
import { GanttEngine } from '../../engines/gantt.js';
import type { Process } from '../../algorithms/scheduling.js';

export const BASELINE_PROCESSES: Process[] = [
  { id: 'P1', arrival: 0, burst: 10, priority: 3 },
  { id: 'P2', arrival: 0, burst: 1, priority: 1 },
  { id: 'P3', arrival: 0, burst: 2, priority: 4 },
  { id: 'P4', arrival: 0, burst: 1, priority: 9 },
  { id: 'P5', arrival: 0, burst: 5, priority: 2 }
];

export const AGED_PROCESSES: Process[] = [
  { id: 'P1', arrival: 0, burst: 10, priority: 3 },
  { id: 'P2', arrival: 0, burst: 1, priority: 1 },
  { id: 'P4', arrival: 0, burst: 1, priority: 1 },
  { id: 'P5', arrival: 0, burst: 5, priority: 2 },
  { id: 'P3', arrival: 0, burst: 2, priority: 4 }
];


// Global state tracking for lesson 05 interactive playground
let lesson05AgingActive = false;


/**
 * Lesson 05's engine. A subclass, not a prototype patch: GanttEngine is shared
 * with lessons 1-4, and wrapping its render() globally meant every other
 * scheduling lesson carried this lesson's airport styling around with it.
 */
export class AgingGanttEngine extends GanttEngine implements PlaygroundCapable {
  /** Re-run the schedule for a new priority set and repaint the side panels. */
  private applyProcesses(procs: Process[], playgroundSection: HTMLElement, scoreboardSection: HTMLElement): void {
    this.reorderProcesses(procs);
    this.renderPlayground(playgroundSection, scoreboardSection);
  }

  public debugHooks(): Record<string, unknown> {
    return {
      isAging: () => lesson05AgingActive,
      toggleAging: (forceVal?: boolean) => {
        lesson05AgingActive = forceVal !== undefined ? forceVal : !lesson05AgingActive;
        this.reorderProcesses(
          (lesson05AgingActive ? AGED_PROCESSES : BASELINE_PROCESSES).map(p => ({ ...p }))
        );
      }
    };
  }

  protected override render(state: GanttState, view: number = 0): void {
    super.render(state, view);


    const v = Math.max(0, Math.min(1, view));
    const svg = this.svg;
    if (!svg) return;

    // Service station labels
    const truckTitle = svg.querySelector('#truck-title');
    if (truckTitle) truckTitle.textContent = 'DINNER TABLE';

    const truckState = svg.querySelector('#truck-state');
    if (truckState) {
      if (state.activeProcessId) {
        const who = this.input.analogy?.items?.[state.activeProcessId]?.customerName ?? state.activeProcessId;
        truckState.textContent = `SERVING ${who.toUpperCase()}`;
        truckState.setAttribute('fill', 'var(--friends)');
      } else {
        truckState.textContent = 'READY TO SERVE';
        truckState.setAttribute('fill', 'var(--muted)');
      }
    }

    // Family members at the dinner table in the analogy view.
    for (const p of this.input.processes) {
      const procGroup = svg.querySelector(`#proc-${p.id}`);
      if (!procGroup) continue;

      const prio = p.priority ?? 1;

      // Update tray text in sprite to Serving Order
      const trayTxt = procGroup.querySelector(`#sprite-${p.id} text`);
      if (trayTxt) {
        trayTxt.textContent = `No. ${prio}`;
      }

      // Update label
      const label = procGroup.querySelector(`#label-${p.id}`) as SVGTextElement;
      if (label) {
        if (v < 0.5) {
          label.textContent = `${p.id} · No. ${prio} (${p.burst}m)`;
        }
      }
    }
  
  }

  public renderPlayground(playgroundSection: HTMLElement, scoreboardSection: HTMLElement): void {
    const engine = this;



    const processes = engine.getProcesses();
    const schedule = engine.getScheduleResult();
    const p4 = processes.find(p => p.id === 'P4');
    const p4Priority = p4?.priority ?? 9;
    const isP4Aged = p4Priority <= 2;
    const p4Wait = schedule.metrics['P4']?.waiting ?? 0;

    // 2. Render Playground controls
    playgroundSection.removeAttribute('data-primary-control');
    playgroundSection.style.padding = '6px 10px';
    playgroundSection.style.gap = '3px';

    playgroundSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.88rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
            Dinner Table · Serving Order & Ammu's Rule
          </h3>
          <span style="font-size: 0.7rem; color: var(--muted);">
            Served first = Priority 1 · Served last = Priority 9 (Still Waiting)
          </span>
        </div>
        <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
          <button id="aging-toggle" type="button" data-primary-control="true" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; font-size: 0.74rem; font-weight: 700; border-radius: var(--rounded-pill, 9999px); border: 1.5px solid ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; background: ${isP4Aged ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)'}; color: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            <span>${isP4Aged ? '🤱 Ammu steps in: ON' : '⚠️ Ammu steps in: OFF'}</span>
            <span style="font-size: 0.65rem; padding: 1px 5px; border-radius: var(--rounded-pill, 9999px); background: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; color: #FFFFFF;">
              ${isP4Aged ? 'Toggle Off' : 'Toggle On'}
            </span>
          </button>
          <button id="btn-starvation-preset" type="button" style="padding: 2px 7px; font-size: 0.7rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--hairline); color: var(--ink-2); cursor: pointer;">
            Reset
          </button>
        </div>
      </div>

      <div id="queue-order-strip" style="display: flex; gap: 4px; margin-top: 2px; overflow-x: auto;">
        ${processes.map((p) => {
          const isStarving = p.id === 'P4' && !isP4Aged;
          const isAged = p.id === 'P4' && isP4Aged;
          const cardBorder = isStarving ? 'var(--waiting)' : isAged ? 'var(--running)' : 'var(--hairline)';
          const cardBg = isStarving ? 'rgba(217, 119, 6, 0.08)' : isAged ? 'rgba(8, 127, 91, 0.08)' : 'var(--canvas-parchment, #f5f5f7)';
          const roleLabel = p.id === 'P2' ? 'Abbu' : p.id === 'P5' ? 'Ammu' : p.id === 'P1' ? 'Arijit' : p.id === 'P3' ? 'Younger Brother' : 'Afra';

          return `
            <div class="process-order-card" data-proc="${p.id}" style="flex: 1; min-width: 76px; padding: 3px 5px; background: ${cardBg}; border: 1.5px solid ${cardBorder}; border-radius: 12px; display: flex; flex-direction: column; gap: 1px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.82rem; color: var(--accent);">${p.id}</span>
                <span style="font-size: 0.65rem; padding: 1px 3px; border-radius: var(--rounded-pill, 9999px); background: var(--surface); border: 1px solid var(--hairline); font-family: var(--font-mono); font-weight: 600;">${p.burst}ms</span>
              </div>
              <div style="font-size: 0.65rem; font-weight: 600; color: ${isStarving ? 'var(--waiting)' : isAged ? 'var(--running)' : 'var(--ink)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                No. ${p.priority ?? 1} · ${roleLabel}
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1px; gap: 2px;">
                <button type="button" class="btn-boost-prio" data-proc="${p.id}" data-delta="-1" title="Increase priority" style="padding: 1px 4px; border: 1px solid var(--hairline); border-radius: 3px; background: var(--surface); font-size: 0.62rem; font-weight: 700; cursor: pointer;">
                  ▲
                </button>
                <span style="font-family: var(--font-mono); font-size: 0.65rem; font-weight: 700; color: var(--ink);">
                  P${p.priority ?? 1}
                </span>
                <button type="button" class="btn-lower-prio" data-proc="${p.id}" data-delta="1" title="Decrease priority" style="padding: 1px 4px; border: 1px solid var(--hairline); border-radius: 3px; background: var(--surface); font-size: 0.62rem; font-weight: 700; cursor: pointer;">
                  ▼
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // 3. Render Scoreboard
    scoreboardSection.style.padding = '6px 10px';
    scoreboardSection.style.gap = '3px';

    scoreboardSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.88rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
          Live Scoreboard
        </h3>
        <div style="padding: 1px 7px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.7rem; ${isP4Aged ? 'background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);' : 'background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);'}">
          ${isP4Aged ? '✅ Afra Served by Ammu (Wait: 1 ms)' : '⚠️ Afra Skipped: Waits 18 ms'}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 4px;">
        <div style="padding: 4px 6px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: 12px;">
          <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Avg Waiting</div>
          <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; margin: 1px 0;">
            ${schedule.avgWaiting} ms
          </div>
          <div style="font-size: 0.65rem; color: var(--muted); font-family: var(--font-mono);">${isP4Aged ? '5.4 ms with aging' : '8.2 ms baseline'}</div>
        </div>
        <div style="padding: 4px 6px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: 12px;">
          <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Afra (P4) Wait</div>
          <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; margin: 1px 0;">
            ${p4Wait} ms
          </div>
          <div style="font-size: 0.65rem; color: var(--muted); font-family: var(--font-mono);">${isP4Aged ? 'Ammu moved them up' : 'Skipped at the table'}</div>
        </div>
        <div style="padding: 4px 6px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: 12px;">
          <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Dispatch Sequence</div>
          <div style="font-family: var(--font-mono); font-size: 0.68rem; margin-top: 2px; display: flex; flex-direction: column; gap: 1px;">
            ${schedule.bars.map((b, bIdx) => `
              <div style="display: flex; justify-content: space-between;">
                <span>#${bIdx + 1} <strong>${b.id}</strong> (T=${b.start}..${b.end})</span>
                <span style="color: ${b.id === 'P4' ? (isP4Aged ? 'var(--running)' : 'var(--waiting)') : 'var(--muted)'};">
                  ${schedule.metrics[b.id]?.waiting ?? 0}ms
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // 4. Attach event listeners
    const agingBtn = playgroundSection.querySelector('#aging-toggle');
    agingBtn?.addEventListener('click', () => {
      lesson05AgingActive = !lesson05AgingActive;
      const targetProcs = lesson05AgingActive
        ? AGED_PROCESSES.map(p => ({ ...p }))
        : BASELINE_PROCESSES.map(p => ({ ...p }));
      this.applyProcesses(targetProcs, playgroundSection, scoreboardSection);
    });

    const resetBtn = playgroundSection.querySelector('#btn-starvation-preset');
    resetBtn?.addEventListener('click', () => {
      lesson05AgingActive = false;
      this.applyProcesses(BASELINE_PROCESSES.map(p => ({ ...p })), playgroundSection, scoreboardSection);
    });

    const boostButtons = playgroundSection.querySelectorAll('.btn-boost-prio, .btn-lower-prio');
    boostButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const procId = target.getAttribute('data-proc');
        const delta = Number(target.getAttribute('data-delta') || '0');
        const currentProcs = engine.getProcesses();
        const proc = currentProcs.find(p => p.id === procId);
        if (proc) {
          const newPrio = Math.max(1, Math.min(9, (proc.priority ?? 1) + delta));
          proc.priority = newPrio;
          this.applyProcesses(currentProcs, playgroundSection, scoreboardSection);
        }
      });
    });

  
  }
}



export const lesson05: Lesson<GanttInput, GanttState> = {
  id: 5,
  lecture: 6,
  slug: 'lesson-05',
  title: 'Priority Scheduling, Starvation & Aging',
  absorbsUnits: [14],
  slides: 'slides 20–22',
  engine: 'gantt',
  engineClass: AgingGanttEngine,
  lensLabels: {
    analogy: '🍽️ Dinner Table Analogy',
    mechanism: '\u{1F4CA} Priority Timeline',
    analogyTitle: 'View as who gets served first at dinner',
    mechanismTitle: 'View as priority scheduling timeline'
  },
  analogy: {
    domain: 'friends',
    text: 'Who gets served first at dinner. The Afra keeps getting skipped while bigger plates go ahead — starving — until Ammu steps in and moves them up the serving order.'
  },
  concept: 'Priority scheduling assigns each process an integer priority rank where the CPU is allocated to the highest-priority job (lowest integer). However, low-priority processes can suffer from starvation (indefinite blocking) if higher-priority tasks continuously arrive. Aging solves starvation by gradually incrementing the priority of processes waiting in the ready queue, ensuring every job eventually executes.',
  morphReveals: 'At dinner your serving order decides where you sit in the line, and waiting costs you nothing. On the timeline that same position becomes when you start — so every newly served guest slides the Afra further right, and starvation is simply a bar that never gets reached. Ammu moves them up the line as they wait.',
  morphMode: 'morph',
  analogyMapping: [
    'Dinner Table ➔ CPU Core',
    'Ammu Serving ➔ Scheduler Dispatcher',
    'Serving Order (1–9) ➔ Priority Rank (1 = Highest Priority)',
    'Skipped Afra ➔ Low-Priority Process (Starvation)',
    'Ammu Moving Them Up ➔ Aging Mechanism'
  ] as any,
  input: {
    processes: [
      { id: 'P1', arrival: 0, burst: 10, priority: 3 },
      { id: 'P2', arrival: 0, burst: 1, priority: 1 },
      { id: 'P3', arrival: 0, burst: 2, priority: 4 },
      { id: 'P4', arrival: 0, burst: 1, priority: 9 },
      { id: 'P5', arrival: 0, burst: 5, priority: 2 }
    ],
    algorithm: 'priority',
    analogy: {
      domain: 'friends',
      type: 'table',
      serviceLabel: 'Dinner Table',
      serviceSublabel: 'Ammu Serving (Dispatcher)',
      queueLabel: 'Serving Line',
      items: {
        P1: {
          customerName: 'Arijit',
          orderText: 'No. 3 · Priority 3 (10m)',
          avatarColor: '#D97706'
        },
        P2: {
          customerName: 'Abbu',
          orderText: 'No. 1 · Priority 1 (1m)',
          avatarColor: '#0284C7'
        },
        P3: {
          customerName: 'Younger Brother',
          orderText: 'No. 4 · Priority 4 (2m)',
          avatarColor: '#7C3AED'
        },
        P4: {
          customerName: 'Afra',
          orderText: 'No. 9 · Priority 9 (1m)',
          avatarColor: '#DC2626'
        },
        P5: {
          customerName: 'Ammu',
          orderText: 'No. 2 · Priority 2 (5m)',
          avatarColor: '#059669'
        }
      }
    }
  }
};

export default lesson05;
