import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import { QueueEngine, type QueueInput, type QueueEvent, type QueueState } from '../../engines/queue.js';

// DENSITY (Task A audit): push/pull run 14 steps, affinity 13. Three arrivals
// stage through the incoming lane first (an arrival is a discrete event, // without the lane they would collapse into the initial frame), then one step
// per dispatch, completion, balancer tick, migration or its refusal,
// cold-cache stall, and closing verdict. The tick and the move are separate
// because detection and migration are separate kernel acts; the stall is
// separate because the line refill lands mid-execution, after dispatch.

export type MigrationScenario = 'push' | 'pull' | 'affinity';

/** New work lands here before joining a core's runqueue, arrivals are events. */

const ARRIVAL_EVENTS: QueueEvent[] = [
  { caption: "P1 arrives, joins Core 0's runqueue.", analogyCaption: "The first party arrives and sits in waiter one's section.", action: 'enqueue', itemId: 'P1', toQueue: 'q_core0' },
  { caption: 'P2 arrives, queues behind P1 on Core 0.', analogyCaption: 'A second table sits down in the same section, behind the one already waiting.', action: 'enqueue', itemId: 'P2', toQueue: 'q_core0' },
  { caption: "P3 arrives. Core 0's line grows to three while Core 1 idles.", analogyCaption: 'A third party arrives: waiter one now holds three tables while waiter two has none.', action: 'enqueue', itemId: 'P3', toQueue: 'q_core0' }
];

export const SCENARIO_EVENTS: Record<MigrationScenario, QueueEvent[]> = {
  push: [
    ...ARRIVAL_EVENTS,
    { caption: 'Core 0 dispatches P1, cache warm from the start.', analogyCaption: 'The waiter takes the first table. It is his own section, so he already knows them.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'P1 runs its slice on Core 0 with a warm cache.', analogyCaption: 'That table is served quickly, because nothing had to be asked twice.', action: 'complete', itemId: 'P1' },
    { caption: 'Balancer tick: Core 0 still holds P2 and P3 while Core 1 sits empty. P3 is chosen.', analogyCaption: 'The manager looks up and sees one waiter with two tables waiting and the other with none. He picks the third table to hand over.', action: 'stall', itemId: 'P3' },
    { caption: "Balancer pushes P3 to Core 1's runqueue.", analogyCaption: 'The manager walks one table over: the idle waiter gets work.', action: 'migrate', itemId: 'P3', toQueue: 'q_core1' },
    { caption: 'Core 1 dispatches P3, busy at last, but its cache is cold.', analogyCaption: 'The second waiter takes that table. He is busy now, but he is starting from nothing: he does not know the order, the allergies, or what is already late.', action: 'dispatch', itemId: 'P3', coreId: 'core1' },
    { caption: 'P3 stalls on Core 1, cold lines refill before it can run.', analogyCaption: 'So he stands there asking all of it again, and nothing moves while he does.', action: 'stall', itemId: 'P3' },
    { caption: 'P3 finishes on Core 1 after paying the reload cost.', analogyCaption: 'That table is served in the end, but it took longer than it would have with the waiter who already knew them.', action: 'complete', itemId: 'P3' },
    { caption: 'Core 0 dispatches P2, affinity intact, cache still warm.', analogyCaption: 'Meanwhile the first waiter takes his second table, still in his own section, still knowing everything.', action: 'dispatch', itemId: 'P2', coreId: 'core0' },
    { caption: 'P2 finishes on Core 0 with warm-cache hits.', analogyCaption: 'Served fast, for the same reason as the first one.', action: 'complete', itemId: 'P2' },
    { caption: 'Balanced, both cores ran; one cold reload was the price.', analogyCaption: 'Both waiters ended up working, which is what the manager wanted. The bill for it was one table served slowly by someone who had to start from scratch.', action: 'stall', itemId: 'P2' }
  ],
  pull: [
    ...ARRIVAL_EVENTS,
    { caption: 'Core 0 dispatches P1, cache warm from the start.', analogyCaption: 'The waiter takes the first table. It is his own section, so he already knows them.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'P1 runs its slice on Core 0 with a warm cache.', analogyCaption: 'That table is served quickly, because nothing had to be asked twice.', action: 'complete', itemId: 'P1' },
    { caption: 'Core 1 drains dry and idles, the work-stealer scans Core 0 and chooses P3.', analogyCaption: 'This time nobody tells the quiet waiter anything. He simply runs out of tables, looks across at the busy section himself, and picks one.', action: 'stall', itemId: 'P3' },
    { caption: 'Idle Core 1 steals: it pulls P3 from Core 0 runqueue.', analogyCaption: 'He walks over and takes it. Nobody asked him to, and the cost is exactly the same as before: he arrives knowing nothing about them.', action: 'migrate', itemId: 'P3', toQueue: 'q_core1' },
    { caption: 'Core 1 dispatches the stolen P3, paying cold-cache reload.', action: 'dispatch', itemId: 'P3', coreId: 'core1' },
    { caption: 'P3 stalls on Core 1, cold lines refill before it can run.', analogyCaption: 'So he stands there asking all of it again, and nothing moves while he does.', action: 'stall', itemId: 'P3' },
    { caption: 'P3 finishes on Core 1.', action: 'complete', itemId: 'P3' },
    { caption: 'Core 0 dispatches P2, affinity intact, cache still warm.', analogyCaption: 'Meanwhile the first waiter takes his second table, still in his own section, still knowing everything.', action: 'dispatch', itemId: 'P2', coreId: 'core0' },
    { caption: 'P2 finishes on Core 0.', action: 'complete', itemId: 'P2' },
    { caption: 'Stealing beat idling, both cores ran; one reload was the price.', action: 'stall', itemId: 'P2' }
  ],
  affinity: [
    ...ARRIVAL_EVENTS,
    { caption: 'P1, P2, P3 pinned to Core 0 by hard affinity; Core 1 idles.', action: 'dispatch', itemId: 'P1', coreId: 'core0' },
    { caption: 'P1 finishes on Core 0, cache warm throughout.', action: 'complete', itemId: 'P1' },
    { caption: 'Balancer tick: Core 0 still holds P2 and P3 while Core 1 sits empty, imbalance found.', action: 'stall', itemId: 'P3' },
    { caption: 'The move is forbidden. P3 stays pinned to Core 0 despite the imbalance.', action: 'stall', itemId: 'P3' },
    { caption: 'Core 0 dispatches P2, still pinned, still warm.', action: 'dispatch', itemId: 'P2', coreId: 'core0' },
    { caption: 'P2 finishes on Core 0 with full warm-cache hits.', action: 'complete', itemId: 'P2' },
    { caption: 'Core 0 dispatches P3, still pinned, still warm.', action: 'dispatch', itemId: 'P3', coreId: 'core0' },
    { caption: 'P3 finishes on Core 0 with full warm-cache hits.', action: 'complete', itemId: 'P3' },
    { caption: 'Pinned. Core 1 never ran, zero reloads paid; locality kept, balance lost.', action: 'stall', itemId: 'P3' }
  ]
};

/**
 * Lesson 08's engine. Scoped to this lesson: the queue engine is shared with
 * lessons 6 and 7, so patching its prototype, or LessonPlayer's, made the
 * page depend on which lesson the learner opened first.
 */
export class MigrationQueueEngine extends QueueEngine implements PlaygroundCapable {
  /** Rebuild the timeline for a migration scenario. */
  public reconfigure(events: QueueEvent[]): void {
    this.input.events = events;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
  }

  public debugHooks(): Record<string, unknown> {
    return {
      getItems: () => this.getItems(),
      setScenario: (sc: MigrationScenario) => this.activeScenario(sc)
    };
  }

  private scenarioSwitcher: ((sc: MigrationScenario) => void) | null = null;

  private activeScenario(sc: MigrationScenario): void {
    this.scenarioSwitcher?.(sc);
  }

  public renderPlayground(playgroundSection: HTMLElement, scoreboardSection: HTMLElement): void {
  const engine = this;

  const updatePlaygroundAndScoreboard = (sc: MigrationScenario) => {
    const isPush = sc === 'push';
    const isPull = sc === 'pull';
    const isAffinity = sc === 'affinity';
    const isBalanced = isPush || isPull;

    // 1. Playground controls
    const playground = playgroundSection;
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
    const scoreboard = scoreboardSection;
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
    updatePlaygroundAndScoreboard(sc);
  };

    this.scenarioSwitcher = switchScenario;
    updatePlaygroundAndScoreboard('push');
  }
}

export const lesson08: Lesson<QueueInput, QueueState> = {
  id: 8,
  lecture: 7,
  slug: 'lesson-08',
  title: 'Keeping Every Core Busy',
  absorbsUnits: [24, 25, 26],
  slides: 'slides 15–17',
  engine: 'queue',
  engineClass: MigrationQueueEngine,
  lensLabels: {
    analogy: '👨‍🍳 Restaurant Sections Analogy',
    mechanism: '📊 Multiprocessor Runqueues',
    analogyTitle: 'View as restaurant sections and orders',
    mechanismTitle: 'View as multi-core runqueues and CPU caches'
  },
  analogy: {
    domain: 'food',
    text: 
      'Yum Cha has two sections and two waiters, one each. Then a large group sits down in the left section, and suddenly one waiter has eleven tables and the other has three.\n\n' +
      'There are two ways this gets fixed. Either the manager notices and sends the quiet waiter over, or the quiet waiter notices himself and goes. Both happen in real restaurants and both have a name in the exam.\n\n' +
      'But there is a cost that nobody sees, and it is the interesting part. The waiter who has been looking after your table all evening knows that you asked for no chilli, that the child needs a fork, and that you are waiting on one dish that was slow. Send him to the other section and a new waiter arrives who knows none of it. Everything he needs to know is still true. It is just no longer in anyone\'s head, so it has to be gathered again from scratch.'
  },
  concept: 'Multiprocessor scheduling balances workloads across cores using push and pull migration. However, migrating threads across processor cores destroys CPU cache state (processor affinity), introducing cold-cache memory stalls. NUMA systems further penalize migration when threads are moved away from their local memory nodes.'  +
    '  Two names for the exam. Keeping every core busy is called LOAD BALANCING, and it takes two forms: push migration, where the system periodically checks each core and moves threads off the overloaded ones, and pull migration, where an idle core reaches over and takes a waiting thread from a busy one. Most systems run both. The thing that argues against moving anyone is PROCESSOR AFFINITY, the fact that a thread has built up warm cache state on the core it has been running on, and moving it throws that away. Soft affinity means the system tries to keep a thread on the same core but makes no promise. Hard affinity means the thread can insist.',
  morphReveals: 'In the restaurant, walking to a busier section is free, sideways distance costs nothing but a few steps, so the host always evens the sections. Across cores that same sideways move throws away a warm cache, so horizontal distance turns into a price paid in reload time. Balance and locality pull opposite ways.',
  morphMode: 'morph',
  analogyMapping: [
    'Restaurant Section / Table ➔ CPU Core',
    'Section Order Spike ➔ Per-Core Ready Runqueue',
    'Host Moving a Waiter (Push) ➔ OS Load Balancing Daemon',
    'Idle Waiter Calling Orders (Pull) ➔ Work-Stealing Idle Dispatcher',
    'Waiter Remembering Your Order ➔ L1/L2 CPU Cache Warmth',
    'Switching Sections and Re-learning ➔ Cold Cache Reload Penalty'
  ],
  input: {
    queues: [
      { id: 'incoming', label: 'Incoming Line (New Arrivals)' },
      { id: 'q_core0', label: 'Core 0 Local Queue (Warm Cache)' },
      { id: 'q_core1', label: 'Core 1 Local Queue (Cold Cache)' }
    ],
    cores: [
      { id: 'core0', label: 'Core 0 (Warm Cache)' },
      { id: 'core1', label: 'Core 1 (Idle)' }
    ],
    items: [
      { id: 'P1', name: 'Regular Diner', burst: 12, queueId: 'incoming', affinity: 'core0' },
      { id: 'P2', name: 'Regular Diner', burst: 15, queueId: 'incoming', affinity: 'core0' },
      { id: 'P3', name: 'Regular Diner', burst: 20, queueId: 'incoming', affinity: 'core0' }
    ],
    events: SCENARIO_EVENTS.push,
    initialAnalogyCaption: 'Two sections open for service: each waiter keeps his own tables.',
    analogy: {
      domain: 'food',
      serviceLabel: 'Host Desk',
      queueLabels: {
        incoming: 'Door Queue (Arriving)',
        q_core0: 'Busy Section (Known Waiter)',
        q_core1: 'Quiet Section (Empty)'
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
