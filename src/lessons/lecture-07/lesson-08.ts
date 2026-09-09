import type { Lesson } from '../../core/types.js';
import { QueueEngine, type QueueInput, type QueueEvent } from '../../engines/queue.js';
import { LessonPlayer } from '../../components/LessonPlayer.js';

// Polyfill Gantt-specific methods on QueueEngine prototype if absent
if (!(QueueEngine.prototype as any).getProcesses) {
  (QueueEngine.prototype as any).getProcesses = function() {
    return (this as any).getItems?.() ?? [];
  };
}
if (!(QueueEngine.prototype as any).getScheduleResult) {
  (QueueEngine.prototype as any).getScheduleResult = function() {
    return { avgWaiting: 0, avgTurnaround: 0, metrics: {} };
  };
}

export type MigrationScenario = 'push' | 'pull' | 'affinity';

export const SCENARIO_EVENTS: Record<MigrationScenario, QueueEvent[]> = {
  push: [
    { caption: 'Core 0 has 3 processes in its local runqueue; Core 1 is idle.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'Push migration: OS load balancer detects overload and pushes P3 to Core 1.', action: 'migrate', itemId: 'P3', toQueue: 'q_core1' },
    { caption: 'Core 1 immediately pulls P3 to execute. Trade-off: Core 1 is busy, but P3 suffers cold cache penalty.', action: 'dispatch', itemId: 'P3', coreId: 'core1' },
    { caption: 'Processor affinity preserved for P2 on Core 0 with warm cache.', action: 'dispatch', itemId: 'P2', coreId: 'core0' }
  ],
  pull: [
    { caption: 'Core 0 has 3 processes in its local runqueue; Core 1 has finished all work and is idle.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'Pull migration: Idle Core 1 executes work-stealing and pulls P3 from Core 0 runqueue.', action: 'migrate', itemId: 'P3', toQueue: 'q_core1' },
    { caption: 'Core 1 immediately executes stolen process P3, paying cold-cache reload cost.', action: 'dispatch', itemId: 'P3', coreId: 'core1' },
    { caption: 'Core 0 dispatches P2 with warm cache hits; both processor cores now fully utilized.', action: 'dispatch', itemId: 'P2', coreId: 'core0' }
  ],
  affinity: [
    { caption: 'Core 0 has 3 processes pinned by hard affinity; Core 1 remains completely idle.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'Hard affinity enforced: OS load balancer is forbidden from migrating P3 despite core imbalance.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'P1 completes on Core 0; Core 0 dispatches P2 with 100% warm cache hits while Core 1 sits idle.', action: 'dispatch', itemId: 'P2', coreId: 'core0' },
    { caption: 'Core 0 dispatches P3 with warm cache. Trade-off: Zero cold-cache misses, but severe core starvation.', action: 'dispatch', itemId: 'P3', coreId: 'core0' }
  ]
};

// Augment QueueEngine prototype with reconfigure for lesson 08 interactive playground
if (!(QueueEngine.prototype as any).reconfigure) {
  (QueueEngine.prototype as any).reconfigure = function(events: QueueEvent[]) {
    this.input.events = events;
    (this as any).steps = (this as any).buildSteps(this.input);
    this.seek(0);
  };
}

// Hook LessonPlayer for QueueEngine lessons
const origRenderPlayground = (LessonPlayer.prototype as any).renderPlaygroundAndScoreboard;
(LessonPlayer.prototype as any).renderPlaygroundAndScoreboard = function() {
  const engine = (this as any).engine;
  if (!engine || typeof engine.getItems !== 'function') {
    origRenderPlayground.call(this);
    return;
  }

  // Update lens controller buttons for Multiprocessor queue domain
  if ((this as any).analogyBtn) {
    (this as any).analogyBtn.textContent = '✈️ Agent Desk Analogy';
    (this as any).analogyBtn.title = 'View as physical airport counter and passenger queues';
  }
  if ((this as any).mechBtn) {
    (this as any).mechBtn.textContent = '📊 Multiprocessor Runqueues';
    (this as any).mechBtn.title = 'View as multi-core runqueues and CPU caches';
  }

  const updatePlaygroundAndScoreboard = (sc: MigrationScenario) => {
    const isPush = sc === 'push';
    const isPull = sc === 'pull';
    const isAffinity = sc === 'affinity';
    const isBalanced = isPush || isPull;

    // 1. Playground controls
    const playground = (this as any).playgroundSection as HTMLElement;
    playground.setAttribute('data-primary-control', 'true');
    playground.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Multiprocessor Migration & Affinity Controls</h3>
        <div data-primary-control="true" style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="btn-push-migration" type="button" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: ${isPush ? 'var(--accent)' : 'var(--surface-alt)'}; border: 1px solid ${isPush ? 'var(--accent)' : 'var(--hairline)'}; color: ${isPush ? '#ffffff' : 'var(--ink)'}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            Push Migration (Balancer)
          </button>
          <button id="btn-pull-migration" type="button" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: ${isPull ? 'var(--accent)' : 'var(--surface-alt)'}; border: 1px solid ${isPull ? 'var(--accent)' : 'var(--hairline)'}; color: ${isPull ? '#ffffff' : 'var(--ink)'}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            Pull Migration (Stealing)
          </button>
          <button id="btn-hard-affinity" type="button" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: ${isAffinity ? 'var(--waiting)' : 'var(--surface-alt)'}; border: 1px solid ${isAffinity ? 'var(--waiting)' : 'var(--hairline)'}; color: ${isAffinity ? '#ffffff' : 'var(--ink)'}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            Hard Affinity (Pinned)
          </button>
        </div>
      </div>
      <div style="display: flex; gap: 6px; margin-top: 4px; font-size: 0.78rem; color: var(--ink-2); line-height: 1.4;">
        <span>${isPush ? 'OS load balancer periodically inspects runqueues and pushes overloaded tasks to idle cores.' : isPull ? 'Work-stealing: idle Core 1 detects an empty local queue and pulls runnable tasks from Core 0.' : 'Hard processor affinity binds all tasks to Core 0. Cache warmth is preserved at the cost of core starvation.'}</span>
      </div>
    `;

    // 2. Scoreboard
    const scoreboard = (this as any).scoreboardSection as HTMLElement;
    scoreboard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Multiprocessor Performance Metrics</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; ${isBalanced ? 'background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);' : 'background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);'}">
          ${isBalanced ? '⚡ Workload Balanced Across Cores' : '⚠️ Severe Core Imbalance (Core 1 Idle)'}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Core 1 State</div>
          <div style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 600; letter-spacing: -0.374px; color: ${isBalanced ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">
            ${isBalanced ? 'Active (Busy)' : '100% Idle'}
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${isBalanced ? 'P3 executing' : 'Runqueue starved'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Cache Warmth</div>
          <div style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 600; letter-spacing: -0.374px; color: ${isAffinity ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">
            ${isAffinity ? '100% Warm' : '67% (P3 Cold)'}
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${isAffinity ? 'Zero cache reload cost' : 'P3 suffers cache penalty'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">System Trade-off</div>
          <div style="font-family: var(--font-ui); font-size: 0.75rem; margin-top: 3px; line-height: 1.35; color: var(--ink-2);">
            ${isPush ? 'Push: Balancer evens load quickly; P3 repopulates cache.' : isPull ? 'Pull: Work-stealing prevents idle waste; cache warm-up needed.' : 'Affinity: Fast single-core cache, but secondary core sits unused.'}
          </div>
        </div>
      </div>
    `;

    // Hook buttons
    playground.querySelector('#btn-push-migration')?.addEventListener('click', () => switchScenario('push'));
    playground.querySelector('#btn-pull-migration')?.addEventListener('click', () => switchScenario('pull'));
    playground.querySelector('#btn-hard-affinity')?.addEventListener('click', () => switchScenario('affinity'));
  };

  const switchScenario = (sc: MigrationScenario) => {
    engine.reconfigure(SCENARIO_EVENTS[sc]);
    const steps = engine.getSteps();
    const scrubber = (this as any).scrubber as HTMLInputElement;
    if (scrubber) {
      scrubber.max = String(Math.max(0, steps.length - 1));
      scrubber.value = '0';
    }
    const stepIndicator = (this as any).stepIndicator as HTMLElement;
    if (stepIndicator) {
      stepIndicator.textContent = `1 / ${steps.length}`;
    }
    const captionBanner = (this as any).captionBanner as HTMLElement;
    if (captionBanner && steps[0]) {
      captionBanner.textContent = steps[0].caption;
    }
    updatePlaygroundAndScoreboard(sc);
  };

  updatePlaygroundAndScoreboard('push');

  if (typeof window !== 'undefined') {
    (window as any).__lesson = {
      setView: (v: number) => (this as any).setView(v),
      getView: () => engine.getView(),
      getItems: () => engine.getItems(),
      setScenario: (sc: MigrationScenario) => switchScenario(sc),
      morphMode: (this as any).morphMode ?? 'morph'
    };
  }
};

export const lesson08: Lesson<QueueInput> = {
  id: 8,
  lecture: 7,
  slug: 'lesson-08',
  title: 'Keeping Every Core Busy',
  absorbsUnits: [24, 25, 26],
  slides: 'slides 15–17',
  engine: 'queue',
  analogy: {
    domain: 'travel',
    text: 'A staffer waving passengers from a long queue over to an empty counter balances waiting lines immediately. However, if an agent already knows your travel booking, switching counters discards that warm context and forces re-explaining from scratch.'
  },
  concept: 'Multiprocessor scheduling balances workloads across cores using push and pull migration. However, migrating threads across processor cores destroys CPU cache state (processor affinity), introducing cold-cache memory stalls. NUMA systems further penalize migration when threads are moved away from their local memory nodes.',
  morphReveals: 'Waving a passenger to an empty counter balances line length instantly, but if the previous agent already knew their booking details, switching counters forces re-explaining everything — that is the cost of migrating across CPU caches.',
  morphMode: 'morph',
  analogyMapping: [
    'Service Counter / Desk ➔ CPU Core',
    'Long Queue / Desk Line ➔ Per-Core Ready Runqueue',
    'Staffer Directing Line (Push) ➔ OS Load Balancing Daemon',
    'Idle Agent Calling Passenger (Pull) ➔ Work-Stealing Idle Dispatcher',
    'Agent Booking Notes ➔ L1/L2 CPU Cache Warmth',
    'Switching Desks and Re-explaining ➔ Cold Cache Reload Penalty'
  ],
  input: {
    queues: [
      { id: 'q_core0', label: 'Core 0 Local Queue (Warm Cache)' },
      { id: 'q_core1', label: 'Core 1 Local Queue (Cold Cache)' }
    ],
    cores: [
      { id: 'core0', label: 'Core 0 (Warm Cache)' },
      { id: 'core1', label: 'Core 1 (Idle)' }
    ],
    items: [
      { id: 'P1', name: 'Regular Diner', burst: 15, queueId: 'q_core0', affinity: 'core0' },
      { id: 'P2', name: 'Regular Diner', burst: 15, queueId: 'q_core0', affinity: 'core0' },
      { id: 'P3', name: 'Regular Diner', burst: 15, queueId: 'q_core0', affinity: 'core0' }
    ],
    events: [
      { caption: 'Core 0 has 3 processes in its local runqueue; Core 1 is idle.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
      { caption: 'Push migration: OS load balancer detects overload and pushes P3 to Core 1.', action: 'migrate', itemId: 'P3', toQueue: 'q_core1' },
      { caption: 'Core 1 immediately pulls P3 to execute. Trade-off: Core 1 is busy, but P3 suffers cold cache penalty.', action: 'dispatch', itemId: 'P3', coreId: 'core1' },
      { caption: 'Processor affinity preserved for P2 on Core 0 with warm cache.', action: 'dispatch', itemId: 'P2', coreId: 'core0' }
    ],
    analogy: {
      domain: 'travel',
      serviceLabel: 'Agent Desk',
      queueLabels: {
        q_core0: 'Desk 1 Line (Known Agent)',
        q_core1: 'Desk 2 Line (Empty)'
      },
      itemLabels: {
        P1: { name: 'P1' },
        P2: { name: 'P2' },
        P3: { name: 'P3' }
      }
    }
  }
};

export default lesson08;
