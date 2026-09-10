import { AnimationEngine } from '../core/engine.js';
import type { Step } from '../core/types.js';

export interface QueueItem {
  id: string;
  name?: string;
  burst?: number;
  remaining?: number;
  priority?: number;
  queueId: string;
  coreId?: string | null;
  affinity?: string;
  color?: string;
}

export interface QueueLane {
  id: string;
  label: string;
  policy?: string;
  quantum?: number;
}

export interface ProcessorCore {
  id: string;
  label: string;
  cache?: 'warm' | 'cold';
}

export interface QueueEvent {
  /** the same beat in the scene's words, shown on the analogy lens */
  analogyCaption?: string;
  t?: number;
  caption: string;
  action: 'enqueue' | 'dispatch' | 'demote' | 'promote' | 'migrate' | 'complete' | 'stall' | 'resume';
  itemId: string;
  fromQueue?: string;
  toQueue?: string;
  coreId?: string | null;
}

export interface QueueAnalogyConfig {
  domain: 'food' | 'travel' | 'friends';
  type?: string;
  serviceLabel?: string;
  queueLabels?: Record<string, string>;
  itemLabels?: Record<string, { name: string; icon?: string; badge?: string }>;
}

export interface QueueInput {
  queues: QueueLane[];
  cores?: ProcessorCore[];
  items: QueueItem[];
  events?: QueueEvent[];
  analogy?: QueueAnalogyConfig;
  /** The opening beat in the scene's words, shown on the analogy lens. */
  initialAnalogyCaption?: string;
}

export interface QueueState {
  time: number;
  queues: Record<string, string[]>;
  cores: Record<string, string | null>;
  completed: string[];
  activeItemId: string | null;
  itemLocations: Record<string, { queueId: string | null; coreId: string | null; progress: number }>;
}

export class QueueEngine extends AnimationEngine<QueueInput, QueueState> {
  protected svg!: SVGSVGElement;
  private lanesGroup!: SVGGElement;
  private coresGroup!: SVGGElement;
  private itemsGroup!: SVGGElement;
  private analogyServiceGroup!: SVGGElement;

  private readonly canvasWidth = 720;
  private readonly canvasHeight = 260;

  protected buildSteps(input: QueueInput): Step<QueueState>[] {
    if (!input.queues || input.queues.length === 0) {
      throw new Error('QueueEngine: input.queues must not be empty');
    }
    if (!input.items || input.items.length === 0) {
      throw new Error('QueueEngine: input.items must not be empty');
    }

    const steps: Step<QueueState>[] = [];
    const queueMap: Record<string, string[]> = {};
    input.queues.forEach(q => { queueMap[q.id] = []; });

    const coreMap: Record<string, string | null> = {};
    (input.cores ?? [{ id: 'cpu0', label: 'CPU 0' }]).forEach(c => {
      coreMap[c.id] = null;
    });

    const itemLocations: Record<string, { queueId: string | null; coreId: string | null; progress: number }> = {};
    const completed: string[] = [];

    // Initial distribution
    input.items.forEach(item => {
      const qId = item.queueId ?? input.queues[0].id;
      if (!queueMap[qId]) queueMap[qId] = [];
      queueMap[qId].push(item.id);
      itemLocations[item.id] = { queueId: qId, coreId: null, progress: 0 };
    });

    // Step 0: Initial ready queue state
    const cloneQueues = () => {
      const copy: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(queueMap)) copy[k] = [...v];
      return copy;
    };

    steps.push({
      t: 0,
      caption: 'Initial queue layout: tasks arrive and await assignment.',
      analogyCaption: input.initialAnalogyCaption,
      state: {
        time: 0,
        queues: cloneQueues(),
        cores: { ...coreMap },
        completed: [...completed],
        activeItemId: null,
        itemLocations: JSON.parse(JSON.stringify(itemLocations))
      }
    });

    if (input.events && input.events.length > 0) {
      let curT = 1;
      for (const ev of input.events) {
        const item = input.items.find(it => it.id === ev.itemId);
        if (!item) continue;

        if (ev.action === 'dispatch') {
          const targetCore = ev.coreId ?? Object.keys(coreMap)[0];
          // Remove from previous queue
          for (const qId of Object.keys(queueMap)) {
            queueMap[qId] = queueMap[qId].filter(id => id !== ev.itemId);
          }
          coreMap[targetCore] = ev.itemId;
          itemLocations[ev.itemId] = { queueId: null, coreId: targetCore, progress: 0.5 };
        } else if (ev.action === 'demote' || ev.action === 'promote' || ev.action === 'migrate' || ev.action === 'enqueue' || ev.action === 'stall' || ev.action === 'resume') {
          const toQ = ev.toQueue ?? input.queues[0].id;
          // A tick that names no new queue is still an event (the scan fired,
          // the refill landed), record the beat without moving the item.
          const isTick = ev.action === 'stall' || ev.action === 'resume';
          const alreadyThere = queueMap[toQ]?.includes(ev.itemId) || itemLocations[ev.itemId]?.coreId !== null;
          if (isTick && (!ev.toQueue || alreadyThere)) {
            steps.push({
              t: ev.t ?? curT++,
              caption: ev.caption,
              analogyCaption: ev.analogyCaption,
              state: {
                time: curT,
                queues: cloneQueues(),
                cores: { ...coreMap },
                completed: [...completed],
                activeItemId: ev.itemId,
                itemLocations: JSON.parse(JSON.stringify(itemLocations))
              }
            });
            continue;
          }
          // Clear core if it was running
          for (const cId of Object.keys(coreMap)) {
            if (coreMap[cId] === ev.itemId) coreMap[cId] = null;
          }
          // Remove from other queues
          for (const qId of Object.keys(queueMap)) {
            queueMap[qId] = queueMap[qId].filter(id => id !== ev.itemId);
          }
          if (!queueMap[toQ]) queueMap[toQ] = [];
          queueMap[toQ].push(ev.itemId);
          itemLocations[ev.itemId] = { queueId: toQ, coreId: null, progress: 0 };
        } else if (ev.action === 'complete') {
          for (const cId of Object.keys(coreMap)) {
            if (coreMap[cId] === ev.itemId) coreMap[cId] = null;
          }
          for (const qId of Object.keys(queueMap)) {
            queueMap[qId] = queueMap[qId].filter(id => id !== ev.itemId);
          }
          if (!completed.includes(ev.itemId)) completed.push(ev.itemId);
          itemLocations[ev.itemId] = { queueId: null, coreId: null, progress: 1 };
        }

        steps.push({
          t: ev.t ?? curT++,
          caption: ev.caption,
          analogyCaption: ev.analogyCaption,
          state: {
            time: curT,
            queues: cloneQueues(),
            cores: { ...coreMap },
            completed: [...completed],
            activeItemId: ev.itemId,
            itemLocations: JSON.parse(JSON.stringify(itemLocations))
          }
        });
      }
    } else {
      // Default step generation: dispatch items sequentially
      let time = 1;
      const coreKeys = Object.keys(coreMap);
      for (const item of input.items) {
        const core = coreKeys[0];
        // Dispatch
        for (const qId of Object.keys(queueMap)) {
          queueMap[qId] = queueMap[qId].filter(id => id !== item.id);
        }
        coreMap[core] = item.id;
        itemLocations[item.id] = { queueId: null, coreId: core, progress: 0.5 };
        steps.push({
          t: time++,
          caption: `${item.id} dispatched from queue to ${coreMap[core] ? core : 'processor core'}.`,
          state: {
            time,
            queues: cloneQueues(),
            cores: { ...coreMap },
            completed: [...completed],
            activeItemId: item.id,
            itemLocations: JSON.parse(JSON.stringify(itemLocations))
          }
        });

        // Complete
        coreMap[core] = null;
        completed.push(item.id);
        itemLocations[item.id] = { queueId: null, coreId: null, progress: 1 };
        steps.push({
          t: time++,
          caption: `${item.id} finishes execution burst.`,
          state: {
            time,
            queues: cloneQueues(),
            cores: { ...coreMap },
            completed: [...completed],
            activeItemId: null,
            itemLocations: JSON.parse(JSON.stringify(itemLocations))
          }
        });
      }
    }

    return steps;
  }

  protected mount(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = 'var(--step)';

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
    this.svg.setAttribute('width', '100%');
    this.svg.style.maxHeight = '300px';
    this.svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.svg.style.background = 'var(--surface-alt, #fafafc)';
    this.svg.style.border = '1px solid var(--hairline)';

    this.lanesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.lanesGroup.setAttribute('id', 'queue-lanes');

    this.coresGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.coresGroup.setAttribute('id', 'processor-cores');

    this.analogyServiceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.analogyServiceGroup.setAttribute('id', 'analogy-service');

    this.itemsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.itemsGroup.setAttribute('id', 'queue-items');

    this.svg.append(this.lanesGroup, this.coresGroup, this.analogyServiceGroup, this.itemsGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: QueueState, view: number): void {
    const v = view;
    const { queues, cores } = state;
    const input = this.input;

    this.lanesGroup.innerHTML = '';
    this.coresGroup.innerHTML = '';
    this.analogyServiceGroup.innerHTML = '';
    this.itemsGroup.innerHTML = '';

    const numLanes = input.queues.length;
    const laneHeight = Math.min(54, Math.floor(180 / numLanes));
    const laneStartY = 24;

    // Render Queue Lanes
    input.queues.forEach((q, idx) => {
      const y = laneStartY + idx * (laneHeight + 12);
      const laneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      laneRect.setAttribute('x', '16');
      laneRect.setAttribute('y', String(y));
      laneRect.setAttribute('width', '440');
      laneRect.setAttribute('height', String(laneHeight));
      laneRect.setAttribute('rx', '10');
      laneRect.setAttribute('fill', 'var(--surface, #ffffff)');
      laneRect.setAttribute('stroke', 'var(--hairline)');
      laneRect.setAttribute('stroke-width', '1');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '26');
      label.setAttribute('y', String(y + laneHeight / 2 + 4));
      label.setAttribute('font-size', '10');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', 'var(--muted)');
      const laneName = (v < 0.5 && input.analogy?.queueLabels?.[q.id]) ? input.analogy.queueLabels[q.id] : q.label;
      // The label shares the lane with the items, so it gets a fixed budget
      // and is truncated rather than allowed to run underneath them. At 10px
      // roughly 30 characters fit in the 145px before the first item starts.
      label.textContent = laneName.length > 30 ? laneName.slice(0, 29) + '…' : laneName;

      this.lanesGroup.append(laneRect, label);
    });

    // Render Cores / Service Desk
    const coreList = input.cores ?? [{ id: 'cpu0', label: 'CPU 0' }];
    const coreStartX = 500;
    const coreWidth = 200;
    const coreHeight = Math.min(70, Math.floor(200 / coreList.length));

    coreList.forEach((c, idx) => {
      const cy = laneStartY + idx * (coreHeight + 16);
      const coreBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      coreBox.setAttribute('x', String(coreStartX));
      coreBox.setAttribute('y', String(cy));
      coreBox.setAttribute('width', String(coreWidth));
      coreBox.setAttribute('height', String(coreHeight));
      coreBox.setAttribute('rx', '12');
      coreBox.setAttribute('fill', 'var(--surface, #ffffff)');
      coreBox.setAttribute('stroke', 'var(--accent)');
      coreBox.setAttribute('stroke-width', '1.5');
      coreBox.setAttribute('stroke-dasharray', v < 0.5 ? '4,4' : 'none');

      const coreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      coreText.setAttribute('x', String(coreStartX + 14));
      coreText.setAttribute('y', String(cy + 22));
      coreText.setAttribute('font-size', '12');
      coreText.setAttribute('font-weight', '600');
      coreText.setAttribute('fill', 'var(--ink)');
      coreText.textContent = v < 0.5 ? (input.analogy?.serviceLabel ?? 'Counter / Desk') : c.label;

      const coreSubtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      coreSubtext.setAttribute('x', String(coreStartX + 14));
      coreSubtext.setAttribute('y', String(cy + 40));
      coreSubtext.setAttribute('font-size', '10');
      coreSubtext.setAttribute('fill', 'var(--muted)');
      const executing = cores[c.id];
      coreSubtext.textContent = executing ? `Active: ${executing}` : 'Idle (ready)';

      this.coresGroup.append(coreBox, coreText, coreSubtext);
    });

    // ── Fit items inside their lane ────────────────────────────────────────
    // The lane is a fixed 440 wide and items are burst-proportional, so a lane
    // holding three long bursts used to run past its own right edge and sit on
    // top of the core boxes. Reported from a screenshot: P3 (20ms) landed at
    // x=390 with width 100, ending at 490, while the lane ends at 456.
    //
    // Rather than clipping, which hides a process, the row is scaled to fit:
    // work out what the widest lane needs and shrink every item by the same
    // factor, so relative widths still carry burst length.
    const LANE_X = 16;
    const LANE_W = 440;
    const ITEM_LEFT = LANE_X + 158; // clear of the truncated lane label
    const ITEM_RIGHT = LANE_X + LANE_W - 10;
    const laneSpan = ITEM_RIGHT - ITEM_LEFT;

    const rawWidth = (it: { burst?: number }): number =>
      Math.max(40, Math.min(100, (it.burst ?? 10) * 5));

    let fit = 1;
    for (const q of input.queues) {
      const ids = queues[q.id] ?? [];
      if (ids.length === 0) continue;
      const need = ids.reduce((sum, id) => {
        const it = input.items.find((i) => i.id === id);
        return sum + rawWidth(it ?? {}) + 10;
      }, -10);
      if (need > laneSpan) fit = Math.min(fit, laneSpan / need);
    }
    const analogyFit = (() => {
      let f = 1;
      for (const q of input.queues) {
        const n = (queues[q.id] ?? []).length;
        if (n === 0) continue;
        const need = n * 58 - 8;
        if (need > laneSpan) f = Math.min(f, laneSpan / need);
      }
      return f;
    })();

    // Render Items with Isomorphic IDs: [id^="bar-${item.id}"]
    input.items.forEach(item => {
      const loc = state.itemLocations[item.id] ?? { queueId: item.queueId, coreId: null, progress: 0 };
      
      // Calculate Analogy Geometry (view=0): equal footprint person/order token
      const analogyW = 50;
      let analogyX = 140;
      let analogyY = laneStartY + 6;
      if (loc.queueId) {
        const laneIdx = input.queues.findIndex(q => q.id === loc.queueId);
        const posInQueue = queues[loc.queueId]?.indexOf(item.id) ?? 0;
        analogyY = laneStartY + Math.max(0, laneIdx) * (laneHeight + 12) + 6;
        analogyX = ITEM_LEFT + posInQueue * (analogyW + 8) * analogyFit;
      } else if (loc.coreId) {
        const cIdx = coreList.findIndex(c => c.id === loc.coreId);
        analogyX = coreStartX + 80;
        analogyY = laneStartY + Math.max(0, cIdx) * (coreHeight + 16) + 12;
      } else {
        analogyX = coreStartX + coreWidth + 20;
      }

      // Calculate Mechanism Geometry (view=1): burst-proportional or PCB block
      const burst = item.burst ?? 10;
      const mechW = Math.max(40, Math.min(100, burst * 5)) * fit;
      let mechX = 140;
      let mechY = analogyY;
      if (loc.queueId) {
        const laneIdx = input.queues.findIndex(q => q.id === loc.queueId);
        const posInQueue = queues[loc.queueId]?.indexOf(item.id) ?? 0;
        mechY = laneStartY + Math.max(0, laneIdx) * (laneHeight + 12) + 6;
        // stride from the items actually ahead of it, so unequal widths stack
        // without gaps or overlaps
        const ahead = (queues[loc.queueId] ?? []).slice(0, posInQueue);
        const offset = ahead.reduce((sum, id) => {
          const it = input.items.find((i) => i.id === id);
          return sum + Math.max(40, Math.min(100, (it?.burst ?? 10) * 5)) * fit + 10;
        }, 0);
        mechX = ITEM_LEFT + offset;
      } else if (loc.coreId) {
        const cIdx = coreList.findIndex(c => c.id === loc.coreId);
        mechX = coreStartX + 70;
        mechY = laneStartY + Math.max(0, cIdx) * (coreHeight + 16) + 12;
      } else {
        mechX = coreStartX + coreWidth + 20;
      }

      // Interpolate Geometry monotonically along view axis
      const curX = analogyX + (mechX - analogyX) * v;
      const curY = analogyY + (mechY - analogyY) * v;
      const curW = analogyW + (mechW - analogyW) * v;
      const curH = laneHeight - 12;

      const itemG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      itemG.setAttribute('id', `bar-${item.id}`);

      const itemRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      itemRect.setAttribute('x', String(curX));
      itemRect.setAttribute('y', String(curY));
      itemRect.setAttribute('width', String(curW));
      itemRect.setAttribute('height', String(curH));
      itemRect.setAttribute('rx', v < 0.5 ? '16' : '6');
      itemRect.setAttribute('fill', item.color ?? (loc.coreId ? 'var(--running, #087f5b)' : 'var(--waiting, #d97706)'));
      itemRect.setAttribute('stroke', 'var(--hairline)');
      itemRect.setAttribute('stroke-width', '1');

      const itemLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      itemLabel.setAttribute('x', String(curX + curW / 2));
      itemLabel.setAttribute('y', String(curY + curH / 2 + 4));
      itemLabel.setAttribute('text-anchor', 'middle');
      itemLabel.setAttribute('font-size', '11');
      itemLabel.setAttribute('font-weight', '600');
      itemLabel.setAttribute('fill', '#ffffff');
      itemLabel.textContent = v < 0.5 ? (input.analogy?.itemLabels?.[item.id]?.name ?? item.id) : `${item.id}${item.burst ? ` (${item.burst}ms)` : ''}`;

      itemG.append(itemRect, itemLabel);
      this.itemsGroup.appendChild(itemG);
    });
  }

  public getItems(): QueueItem[] {
    return this.input.items;
  }
}
