import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';
import { GanttEngine } from '../../engines/gantt.js';
import { LessonPlayer } from '../../components/LessonPlayer.js';
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

export const lesson05: Lesson<GanttInput> = {
  id: 5,
  lecture: 6,
  slug: 'lesson-05',
  title: 'Priority Scheduling, Starvation & Aging',
  absorbsUnits: [14],
  slides: 'slides 20–22',
  engine: 'gantt',
  analogy: {
    domain: 'travel',
    text: 'Airport boarding groups. The Group 9 passenger who watches four flights board ahead of them is starving — aging is the gate agent quietly bumping them up per hour waited.'
  },
  concept: 'Priority scheduling assigns each process an integer priority rank where the CPU is allocated to the highest-priority job (lowest integer). However, low-priority processes can suffer from starvation (indefinite blocking) if higher-priority tasks continuously arrive. Aging solves starvation by gradually incrementing the priority of processes waiting in the ready queue, ensuring every job eventually executes.',
  morphReveals: 'In airport boarding, Group 1 boards ahead of Group 9 regardless of arrival. In priority scheduling, lower-priority jobs starve indefinitely unless aging incrementally increases their priority over time.',
  morphMode: 'morph',
  analogyMapping: [
    'Boarding Gate ➔ CPU Core',
    'Gate Agent ➔ Scheduler Dispatcher',
    'Boarding Group (1–9) ➔ Priority Rank (1 = Highest Priority)',
    'Starving Group 9 Traveler ➔ Low-Priority Process (Starvation)',
    'Priority Upgrade per Hour Waited ➔ Aging Mechanism'
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
      domain: 'travel',
      type: 'airport',
      serviceLabel: 'Boarding Gate',
      serviceSublabel: 'Gate Agent (Dispatcher)',
      queueLabel: 'Boarding Queue',
      items: {
        P1: {
          customerName: 'Business Traveler',
          orderText: 'Group 3 · Priority 3 (10m)',
          avatarColor: '#D97706'
        },
        P2: {
          customerName: 'First Class',
          orderText: 'Group 1 · Priority 1 (1m)',
          avatarColor: '#0284C7'
        },
        P3: {
          customerName: 'Main Cabin Select',
          orderText: 'Group 4 · Priority 4 (2m)',
          avatarColor: '#7C3AED'
        },
        P4: {
          customerName: 'Group 9 Passenger',
          orderText: 'Group 9 · Priority 9 (1m)',
          avatarColor: '#DC2626'
        },
        P5: {
          customerName: 'Sky Priority',
          orderText: 'Group 2 · Priority 2 (5m)',
          avatarColor: '#059669'
        }
      }
    }
  }
};

// Global state tracking for lesson 05 interactive playground
let lesson05AgingActive = false;

// Patch LessonPlayer prototype safely for Priority & Aging lesson
const origRenderPlayground = (LessonPlayer.prototype as any).renderPlaygroundAndScoreboard;
if (origRenderPlayground && !(LessonPlayer.prototype as any).__lesson05Patched) {
  (LessonPlayer.prototype as any).__lesson05Patched = true;

  (LessonPlayer.prototype as any).renderPlaygroundAndScoreboard = function () {
    const engine: GanttEngine = (this as any).engine;
    const input: GanttInput = (engine as any)?.input;
    const isPriorityLesson = input?.algorithm === 'priority' || input?.analogy?.type === 'airport';

    if (!isPriorityLesson) {
      return origRenderPlayground.call(this);
    }

    // 1. Update Lens controller buttons for airport domain
    if ((this as any).analogyBtn) {
      (this as any).analogyBtn.textContent = '✈️ Airport Analogy';
      (this as any).analogyBtn.title = 'View as airport boarding queue';
    }
    if ((this as any).mechBtn) {
      (this as any).mechBtn.textContent = '📊 Priority Timeline';
      (this as any).mechBtn.title = 'View as priority scheduling timeline';
    }

    const processes = engine.getProcesses();
    const schedule = engine.getScheduleResult();
    const p4 = processes.find(p => p.id === 'P4');
    const p4Priority = p4?.priority ?? 9;
    const isP4Aged = p4Priority <= 2;
    const p4Wait = schedule.metrics['P4']?.waiting ?? 0;

    // 2. Render Playground controls
    const playgroundSection: HTMLElement = (this as any).playgroundSection;
    playgroundSection.removeAttribute('data-primary-control');
    playgroundSection.style.padding = '6px 10px';
    playgroundSection.style.gap = '3px';

    playgroundSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.88rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
            Airport Gate · Priority & Aging Playground
          </h3>
          <span style="font-size: 0.7rem; color: var(--muted);">
            Group 1 = Priority 1 · Group 9 = Priority 9 (Starving)
          </span>
        </div>
        <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
          <button id="aging-toggle" type="button" data-primary-control="true" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; font-size: 0.74rem; font-weight: 700; border-radius: var(--rounded-pill, 9999px); border: 1.5px solid ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; background: ${isP4Aged ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)'}; color: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            <span>${isP4Aged ? '🛡️ Aging: ON' : '⚠️ Aging: OFF'}</span>
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
          const roleLabel = p.id === 'P2' ? 'First' : p.id === 'P5' ? 'Sky' : p.id === 'P1' ? 'Business' : p.id === 'P3' ? 'Main' : 'Group 9';

          return `
            <div class="process-order-card" data-proc="${p.id}" style="flex: 1; min-width: 76px; padding: 3px 5px; background: ${cardBg}; border: 1.5px solid ${cardBorder}; border-radius: 12px; display: flex; flex-direction: column; gap: 1px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.82rem; color: var(--accent);">${p.id}</span>
                <span style="font-size: 0.65rem; padding: 1px 3px; border-radius: var(--rounded-pill, 9999px); background: var(--surface); border: 1px solid var(--hairline); font-family: var(--font-mono); font-weight: 600;">${p.burst}ms</span>
              </div>
              <div style="font-size: 0.65rem; font-weight: 600; color: ${isStarving ? 'var(--waiting)' : isAged ? 'var(--running)' : 'var(--ink)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Grp ${p.priority ?? 1} · ${roleLabel}
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
    const scoreboardSection: HTMLElement = (this as any).scoreboardSection;
    scoreboardSection.style.padding = '6px 10px';
    scoreboardSection.style.gap = '3px';

    scoreboardSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.88rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
          Live Scoreboard
        </h3>
        <div style="padding: 1px 7px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.7rem; ${isP4Aged ? 'background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);' : 'background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);'}">
          ${isP4Aged ? '✅ Group 9 Rescued by Aging (Wait: 1 ms)' : '⚠️ Starvation Active: Group 9 Waits 18 ms'}
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
          <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Group 9 (P4) Wait</div>
          <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: ${isP4Aged ? 'var(--running)' : 'var(--waiting)'}; margin: 1px 0;">
            ${p4Wait} ms
          </div>
          <div style="font-size: 0.65rem; color: var(--muted); font-family: var(--font-mono);">${isP4Aged ? 'Rescued from starvation' : 'Starving at line end'}</div>
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
      (this as any).reorderTo(targetProcs);
    });

    const resetBtn = playgroundSection.querySelector('#btn-starvation-preset');
    resetBtn?.addEventListener('click', () => {
      lesson05AgingActive = false;
      (this as any).reorderTo(BASELINE_PROCESSES.map(p => ({ ...p })));
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
          (this as any).reorderTo(currentProcs);
        }
      });
    });

    // Expose aging helpers on window.__lesson
    if (typeof window !== 'undefined' && (window as any).__lesson) {
      (window as any).__lesson.isAging = () => isP4Aged;
      (window as any).__lesson.toggleAging = (forceVal?: boolean) => {
        lesson05AgingActive = forceVal !== undefined ? forceVal : !lesson05AgingActive;
        const targetProcs = lesson05AgingActive
          ? AGED_PROCESSES.map(p => ({ ...p }))
          : BASELINE_PROCESSES.map(p => ({ ...p }));
        (this as any).reorderTo(targetProcs);
      };
    }
  };
}

// Enhance GanttEngine render for Airport Boarding domain without altering element IDs
const origGanttRender = (GanttEngine.prototype as any).render;
if (origGanttRender && !(GanttEngine.prototype as any).__lesson05GanttPatched) {
  (GanttEngine.prototype as any).__lesson05GanttPatched = true;

  (GanttEngine.prototype as any).render = function (state: any, view: number = 0) {
    origGanttRender.call(this, state, view);

    const isPriorityLesson = this.input?.algorithm === 'priority' || this.input?.analogy?.type === 'airport';
    if (!isPriorityLesson) return;

    const v = Math.max(0, Math.min(1, view));
    const svg: SVGSVGElement = (this as any).svg;
    if (!svg) return;

    // Service station labels
    const truckTitle = svg.querySelector('#truck-title');
    if (truckTitle) truckTitle.textContent = 'GATE 42';

    const truckState = svg.querySelector('#truck-state');
    if (truckState) {
      if (state.activeProcessId) {
        truckState.textContent = `BOARDING ${state.activeProcessId}`;
        truckState.setAttribute('fill', 'var(--travel)');
      } else {
        truckState.textContent = 'GATE READY';
        truckState.setAttribute('fill', 'var(--muted)');
      }
    }

    // Polish sprites and process labels for airport domain
    for (const p of this.input.processes) {
      const procGroup = svg.querySelector(`#proc-${p.id}`);
      if (!procGroup) continue;

      const prio = p.priority ?? 1;

      // Update tray text in sprite to Boarding Group
      const trayTxt = procGroup.querySelector(`#sprite-${p.id} text`);
      if (trayTxt) {
        trayTxt.textContent = `Grp ${prio}`;
      }

      // Update label
      const label = procGroup.querySelector(`#label-${p.id}`) as SVGTextElement;
      if (label) {
        if (v < 0.5) {
          label.textContent = `${p.id} · Grp ${prio} (${p.burst}m)`;
        }
      }
    }
  };
}

export default lesson05;
