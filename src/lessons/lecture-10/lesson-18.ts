import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import {
  DiagramEngine,
  type DiagramInput,
  type DiagramNode,
  type DiagramState
} from '../../engines/diagram.js';

export type PreventionStrategy = 'none' | 'share' | 'all-at-once' | 'release' | 'order';
export type DeadlockCondition = 'mutex' | 'hold-wait' | 'no-preempt' | 'circular';

export interface PreventionResult {
  strategy: PreventionStrategy;
  conditions: Record<DeadlockCondition, boolean>;
  deadlockPossible: boolean;
  cost: string;
}

const ALL_CONDITIONS: Record<DeadlockCondition, boolean> = {
  mutex: true,
  'hold-wait': true,
  'no-preempt': true,
  circular: true
};

export function applyPrevention(strategy: PreventionStrategy): PreventionResult {
  const conditions = { ...ALL_CONDITIONS };
  let cost = 'All four necessary conditions hold.';

  switch (strategy) {
    case 'share':
      conditions.mutex = false;
      cost = 'Only resources that are genuinely shareable can use this rule.';
      break;
    case 'all-at-once':
      conditions['hold-wait'] = false;
      cost = 'A process may wait longer and hold idle resources.';
      break;
    case 'release':
      conditions['no-preempt'] = false;
      cost = 'A process can repeat work after releasing and restarting.';
      break;
    case 'order':
      conditions.circular = false;
      cost = 'Every process must obey one global resource order.';
      break;
  }

  return {
    strategy,
    conditions,
    deadlockPossible: Object.values(conditions).every(Boolean),
    cost
  };
}

const CONDITION_NODE_IDS: Record<DeadlockCondition, string> = {
  mutex: 'mutex',
  'hold-wait': 'hold-wait',
  'no-preempt': 'no-preempt',
  circular: 'circular'
};

export const PREVENTION_NODES: DiagramNode[] = [
  {
    id: 'mutex', label: 'Mutual exclusion', sublabel: 'one holder',
    analogyLabel: 'Share the dish', analogySublabel: 'when sharing is possible',
    x: 24, y: 36, width: 136, height: 54,
    analogyX: 72, analogyY: 35, analogyWidth: 150, analogyHeight: 54
  },
  {
    id: 'hold-wait', label: 'Hold and wait', sublabel: 'hold while asking',
    analogyLabel: 'Take all at once', analogySublabel: 'or take nothing',
    x: 194, y: 36, width: 136, height: 54,
    analogyX: 498, analogyY: 35, analogyWidth: 150, analogyHeight: 54
  },
  {
    id: 'no-preempt', label: 'No preemption', sublabel: 'release voluntarily',
    analogyLabel: 'Put yours down', analogySublabel: 'when the next is busy',
    x: 364, y: 36, width: 136, height: 54,
    analogyX: 72, analogyY: 166, analogyWidth: 150, analogyHeight: 54
  },
  {
    id: 'circular', label: 'Circular wait', sublabel: 'closed resource ring',
    analogyLabel: 'Follow the numbers', analogySublabel: 'lower utensil first',
    x: 534, y: 36, width: 136, height: 54,
    analogyX: 498, analogyY: 166, analogyWidth: 150, analogyHeight: 54
  },
  {
    id: 'result', label: 'Deadlock possible', sublabel: 'all four must hold',
    analogyLabel: 'Dinner can freeze', analogySublabel: 'everyone waits',
    x: 270, y: 170, width: 180, height: 60,
    analogyX: 270, analogyY: 96, analogyWidth: 180, analogyHeight: 64
  }
];

const STRATEGY_LABELS: Record<PreventionStrategy, string> = {
  none: 'All four hold',
  share: 'Share where possible',
  'all-at-once': 'Request all at once',
  release: 'Release and retry',
  order: 'Use lock ordering'
};

const STRATEGY_CAPTIONS: Record<PreventionStrategy, string> = {
  none: 'All four conditions hold together, deadlock remains possible.',
  share: 'Shareable resources remove mutual exclusion, this ring cannot deadlock.',
  'all-at-once': 'Request everything together or wait holding nothing, hold and wait is gone.',
  release: 'If the next resource is unavailable, release what you hold and retry.',
  order: 'Every process requests lower-numbered resources first, the ring cannot close.'
};

export function preventionInput(strategy: PreventionStrategy): DiagramInput {
  const result = applyPrevention(strategy);
  const broken = (Object.keys(result.conditions) as DeadlockCondition[])
    .filter((condition) => !result.conditions[condition]);
  const highlightNodeIds = broken.length > 0
    ? broken.map((condition) => CONDITION_NODE_IDS[condition])
    : ['mutex', 'hold-wait', 'no-preempt', 'circular', 'result'];

  const nodes = PREVENTION_NODES.map((node) => {
    if (node.id === 'result') {
      return {
        ...node,
        label: result.deadlockPossible ? 'Deadlock possible' : 'Deadlock impossible',
        sublabel: result.deadlockPossible ? 'all four must hold' : 'one condition removed',
        analogyLabel: result.deadlockPossible ? 'Dinner can freeze' : 'Dinner keeps moving',
        analogySublabel: result.deadlockPossible ? 'everyone waits' : 'the ring is broken'
      };
    }
    const condition = (Object.keys(CONDITION_NODE_IDS) as DeadlockCondition[])
      .find((key) => CONDITION_NODE_IDS[key] === node.id);
    if (condition && !result.conditions[condition]) {
      return { ...node, sublabel: 'removed by this rule' };
    }
    return { ...node };
  });

  return {
    title: 'Break one necessary condition',
    nodes,
    connections: [
      { id: 'mutex-result', from: 'mutex', to: 'result' },
      { id: 'hold-result', from: 'hold-wait', to: 'result' },
      { id: 'preempt-result', from: 'no-preempt', to: 'result' },
      { id: 'circular-result', from: 'circular', to: 'result' }
    ],
    reveals: [
      {
        caption: 'Prevent, avoid, detect and recover, or ignore: four ways to handle deadlock.',
        highlightNodeIds: ['result'],
        metrics: { deadlockPossible: result.deadlockPossible ? 'yes' : 'no' }
      },
      {
        caption: STRATEGY_CAPTIONS[strategy],
        highlightNodeIds,
        metrics: { deadlockPossible: result.deadlockPossible ? 'yes' : 'no' }
      }
    ],
    analogy: { domain: 'food', title: 'Serving dinner without a standstill' }
  };
}

export class Lesson18DiagramEngine extends DiagramEngine implements PlaygroundCapable {
  private strategy: PreventionStrategy = 'none';
  private scoreboardHost: HTMLElement | null = null;
  private scoreUnsub: (() => void) | null = null;

  public debugHooks(): Record<string, unknown> {
    return {
      setStrategy: (strategy: PreventionStrategy) => this.setStrategy(strategy),
      getStrategy: () => this.strategy,
      getResult: () => applyPrevention(this.strategy)
    };
  }

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Break one necessary condition</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${(Object.keys(STRATEGY_LABELS) as PreventionStrategy[]).map((strategy) => `
            <button type="button" class="l18-strategy" data-strategy="${strategy}" data-primary-control="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.strategy === strategy ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.strategy === strategy ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${STRATEGY_LABELS[strategy]}</button>
          `).join('')}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--muted);">Apply a prevention rule: if even one condition is false, deadlock is impossible.</div>
    `;
    host.querySelectorAll('.l18-strategy').forEach((button) => {
      button.addEventListener('click', () => {
        this.setStrategy((button as HTMLElement).dataset.strategy as PreventionStrategy);
        this.renderPlayground(host, this.scoreboardHost ?? undefined);
      });
    });
    if (this.scoreUnsub) this.scoreUnsub();
    this.scoreUnsub = this.onStepChange(() => this.renderScoreboard());
    this.renderScoreboard();
  }

  private setStrategy(strategy: PreventionStrategy): void {
    this.strategy = strategy;
    const next = preventionInput(strategy);
    this.input.nodes = next.nodes;
    this.input.connections = next.connections;
    this.input.reveals = next.reveals;
    this.setSteps(this.buildSteps(this.input));
    this.seek(this.getSteps().length - 1);
    this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const result = applyPrevention(this.strategy);
    const conditionRows = (Object.keys(result.conditions) as DeadlockCondition[]).map((condition) => {
      const holds = result.conditions[condition];
      const label = {
        mutex: 'Mutual exclusion',
        'hold-wait': 'Hold and wait',
        'no-preempt': 'No preemption',
        circular: 'Circular wait'
      }[condition];
      return `<div style="display: flex; justify-content: space-between; gap: 6px;"><span>${label}</span><strong style="color: ${holds ? 'var(--waiting)' : 'var(--running)'};">${holds ? 'holds' : 'removed'}</strong></div>`;
    }).join('');

    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Prevention verdict</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${result.deadlockPossible ? 'rgba(217, 119, 6, 0.12)' : 'rgba(8, 127, 91, 0.12)'}; color: ${result.deadlockPossible ? 'var(--waiting)' : 'var(--running)'}; border: 1px solid currentColor;">${result.deadlockPossible ? 'Deadlock still possible' : 'Deadlock impossible'}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px); font-size: 0.7rem; color: var(--ink); line-height: 1.45;">${conditionRows}</div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Trade-off</div>
          <div style="font-size: 0.72rem; color: var(--ink); margin-top: 3px; line-height: 1.4;">${result.cost}</div>
        </div>
      </div>
    `;
  }
}

export const lesson18Input: DiagramInput = preventionInput('none');

export const lesson18: Lesson<DiagramInput, DiagramState> = {
  id: 18,
  lecture: 10,
  slug: 'lesson-18',
  title: 'Making It Impossible',
  absorbsUnits: [72, 73, 74, 75],
  slides: 'slides 13–16',
  engine: 'diagram',
  engineClass: Lesson18DiagramEngine,
  lensLabels: {
    analogy: '🍽️ Family dinner rules',
    mechanism: '🛡️ Deadlock prevention',
    analogyTitle: 'View as four rules for serving dinner without a standstill',
    mechanismTitle: 'View as removing one necessary deadlock condition'
  },
  analogy: {
    domain: 'food',
    text: 
      'Ammu has watched the two spoons go wrong once and does not intend to watch it again. So she thinks about what would have to be true for it to happen at all.\n\n' +
      'She finds four things, and all four have to hold together. The spoons have to be the kind of thing only one person can use at a time. People have to be able to hold one while waiting for another. Nobody can have a spoon taken off them once they have it. And the waiting has to come round in a circle.\n\n' +
      'Which means she does not have to solve all four. She only has to break one.\n\n' +
      'She could put out serving spoons that everyone shares. She could make a rule that you pick up both or neither. She could allow a spoon to be taken back if you are sitting there holding it and waiting. Or she could number them and require that everyone takes the lower number first.\n\n' +
      'Any one of these makes the deadlock impossible, not unlikely. That is the difference between prevention and everything else in this lecture.'
  },
  concept: 'Operating systems can handle deadlocks four ways: prevention, avoidance, detection and recovery, or ignoring the problem. Prevention makes deadlock impossible by denying at least one necessary condition. Make resources shareable where possible; require a process to request everything before it starts; preempt held resources when another request fails; or impose a total ordering and require requests in increasing order. Each rule prevents the ring, but each has a cost in applicability, utilisation, repeated work, or programmer discipline.'  +
    '  Deadlock needs four conditions to hold at the same time, and they have names you will be asked for. MUTUAL EXCLUSION: at least one resource is non-shareable, so only one process can hold it. HOLD AND WAIT: a process is holding at least one resource while waiting for another. NO PREEMPTION: a resource cannot be taken away, it has to be released voluntarily by the process holding it. CIRCULAR WAIT: there is a set of processes where each is waiting on the next and the last waits on the first. All four must hold together, which is what makes prevention possible: break any single one and deadlock cannot occur at all.',
  morphReveals: 'At dinner, the four cards are concrete rules placed around one table. In the OS view they line up as the four necessary conditions feeding one outcome. The selected rule stays the same card as it moves: its everyday action becomes the exact condition it removes, and the deadlock result changes only when one condition stops holding.',
  morphMode: 'morph',
  analogyMapping: [
    'Share the dish ➔ remove mutual exclusion where sharing is possible',
    'Take all utensils together or none ➔ remove hold and wait',
    'Put yours down when the next is busy ➔ permit preemption and retry',
    'Take lower-numbered utensils first ➔ impose ordering and remove circular wait',
    'Every rule succeeds by removing one necessary condition ➔ deadlock becomes impossible'
  ],
  input: lesson18Input
};

export default lesson18;
