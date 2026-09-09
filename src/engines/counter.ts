import { AnimationEngine } from '../core/engine.js';
import type { PlaygroundCapable } from '../core/types.js';
import type { Step } from '../core/types.js';

export interface CounterActor {
  id: string;
  name: string;
  color?: string;
  analogyName?: string;
}

export interface CounterEvent {
  t?: number;
  actorId: string;
  action: 'acquire' | 'release' | 'spin' | 'block' | 'wakeup' | 'omit_signal' | 'fail';
  delta?: number;
  caption: string;
}

export interface CounterInput {
  initial: number;
  capacity: number;
  mode: 'spin' | 'block';
  resourceLabel?: string;
  actors: CounterActor[];
  events: CounterEvent[];
  analogy?: {
    domain: 'travel' | 'food' | 'friends';
    resourceLabel: string;
    holderLabel: string;
    waitingLabel: string;
    actorNames?: Record<string, string>;
  };
}

export interface CounterState {
  stepIndex: number;
  value: number;
  capacity: number;
  activeActorId: string | null;
  holders: string[];
  waiting: string[];
  action: string;
  caption: string;
}

export class CounterEngine extends AnimationEngine<CounterInput, CounterState> implements PlaygroundCapable {
  renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    if ((this.input as any).renderPlayground) {
      (this.input as any).renderPlayground(host, scoreboardHost, this);
    }
  }
  private svg!: SVGSVGElement;
  private resourceGroup!: SVGGElement;
  private holdersGroup!: SVGGElement;
  private waitingGroup!: SVGGElement;
  private actorsGroup!: SVGGElement;

  private readonly canvasWidth = 720;
  private readonly canvasHeight = 260;

  protected buildSteps(input: CounterInput): Step<CounterState>[] {
    if (!input.actors || input.actors.length === 0) {
      throw new Error('CounterEngine: input.actors must not be empty');
    }

    const steps: Step<CounterState>[] = [];
    let value = input.initial;
    const holders: string[] = [];
    const waiting: string[] = [];

    // Step 0: Initial state
    steps.push({
      t: 0,
      caption: `Initial state: Resource count = ${value} (capacity ${input.capacity}). No active contenders.`,
      highlight: [],
      state: {
        stepIndex: 0,
        value,
        capacity: input.capacity,
        activeActorId: null,
        holders: [],
        waiting: [],
        action: 'init',
        caption: 'Initial state before synchronization events.'
      }
    });

    let curT = 1.0;

    for (let i = 0; i < (input.events || []).length; i++) {
      const ev = input.events[i];

      switch (ev.action) {
        case 'acquire':
          value--;
          if (value < 0 && input.mode === 'block') {
            if (!waiting.includes(ev.actorId)) waiting.push(ev.actorId);
          } else {
            if (!holders.includes(ev.actorId)) holders.push(ev.actorId);
          }
          break;

        case 'release':
          value++;
          const hIdx = holders.indexOf(ev.actorId);
          if (hIdx >= 0) holders.splice(hIdx, 1);
          if (input.mode === 'block' && waiting.length > 0 && value <= 0) {
            const woke = waiting.shift();
            if (woke && !holders.includes(woke)) holders.push(woke);
          }
          break;

        case 'spin':
          if (!waiting.includes(ev.actorId)) waiting.push(ev.actorId);
          break;

        case 'block':
          value--;
          if (!waiting.includes(ev.actorId)) waiting.push(ev.actorId);
          break;

        case 'wakeup':
          const wIdx = waiting.indexOf(ev.actorId);
          if (wIdx >= 0) waiting.splice(wIdx, 1);
          if (!holders.includes(ev.actorId)) holders.push(ev.actorId);
          break;

        case 'omit_signal':
          // Actor leaves without signaling
          const oIdx = holders.indexOf(ev.actorId);
          if (oIdx >= 0) holders.splice(oIdx, 1);
          break;

        default:
          break;
      }

      steps.push({
        t: ev.t ?? curT++,
        caption: ev.caption,
        highlight: [ev.actorId],
        state: {
          stepIndex: i + 1,
          value,
          capacity: input.capacity,
          activeActorId: ev.actorId,
          holders: [...holders],
          waiting: [...waiting],
          action: ev.action,
          caption: ev.caption
        }
      });
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

    this.resourceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.resourceGroup.setAttribute('id', 'counter-resource');

    this.holdersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.holdersGroup.setAttribute('id', 'counter-holders');

    this.waitingGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.waitingGroup.setAttribute('id', 'counter-waiting');

    this.actorsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.actorsGroup.setAttribute('id', 'counter-actors');

    this.svg.append(this.resourceGroup, this.holdersGroup, this.waitingGroup, this.actorsGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: CounterState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.resourceGroup.innerHTML = '';
    this.holdersGroup.innerHTML = '';
    this.waitingGroup.innerHTML = '';
    this.actorsGroup.innerHTML = '';

    // 1. Resource Meter Box (Left)
    const meterX = 24;
    const meterY = 24;
    const meterW = 190;
    const meterH = 150;

    const meterBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    meterBg.setAttribute('x', String(meterX));
    meterBg.setAttribute('y', String(meterY));
    meterBg.setAttribute('width', String(meterW));
    meterBg.setAttribute('height', String(meterH));
    meterBg.setAttribute('rx', '12');
    meterBg.setAttribute('fill', 'var(--surface, #ffffff)');
    meterBg.setAttribute('stroke', state.value <= 0 ? 'var(--waiting)' : 'var(--accent)');
    meterBg.setAttribute('stroke-width', '1.5');

    const meterTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    meterTitle.setAttribute('x', String(meterX + meterW / 2));
    meterTitle.setAttribute('y', String(meterY + 28));
    meterTitle.setAttribute('text-anchor', 'middle');
    meterTitle.setAttribute('font-size', '11');
    meterTitle.setAttribute('font-weight', '700');
    meterTitle.setAttribute('fill', 'var(--muted)');
    meterTitle.textContent = v < 0.5 && this.input.analogy?.resourceLabel
      ? this.input.analogy.resourceLabel
      : (this.input.resourceLabel || 'RESOURCE COUNT / PERMITS');

    const countNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    countNumber.setAttribute('x', String(meterX + meterW / 2));
    countNumber.setAttribute('y', String(meterY + 85));
    countNumber.setAttribute('text-anchor', 'middle');
    countNumber.setAttribute('font-family', 'var(--font-mono)');
    countNumber.setAttribute('font-size', '44');
    countNumber.setAttribute('font-weight', '700');
    countNumber.setAttribute('fill', state.value < 0 ? 'var(--waiting)' : state.value === 0 ? 'var(--ink)' : 'var(--running)');
    countNumber.textContent = String(state.value);

    const subInfo = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subInfo.setAttribute('x', String(meterX + meterW / 2));
    subInfo.setAttribute('y', String(meterY + 120));
    subInfo.setAttribute('text-anchor', 'middle');
    subInfo.setAttribute('font-size', '11');
    subInfo.setAttribute('fill', 'var(--muted)');
    subInfo.textContent = state.value < 0
      ? `${Math.abs(state.value)} process(es) sleeping in queue`
      : `${state.value} available permit(s)`;

    this.resourceGroup.append(meterBg, meterTitle, countNumber, subInfo);

    // 2. Critical Section / Holders Slot (Center)
    const holderX = 236;
    const holderY = 24;
    const holderW = 220;
    const holderH = 150;

    const holderBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    holderBg.setAttribute('x', String(holderX));
    holderBg.setAttribute('y', String(holderY));
    holderBg.setAttribute('width', String(holderW));
    holderBg.setAttribute('height', String(holderH));
    holderBg.setAttribute('rx', '12');
    holderBg.setAttribute('fill', 'var(--surface, #ffffff)');
    holderBg.setAttribute('stroke', state.holders.length > 0 ? 'var(--running)' : 'var(--hairline)');
    holderBg.setAttribute('stroke-width', state.holders.length > 0 ? '2' : '1');

    const holderTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    holderTitle.setAttribute('x', String(holderX + holderW / 2));
    holderTitle.setAttribute('y', String(holderY + 28));
    holderTitle.setAttribute('text-anchor', 'middle');
    holderTitle.setAttribute('font-size', '11');
    holderTitle.setAttribute('font-weight', '700');
    holderTitle.setAttribute('fill', 'var(--muted)');
    holderTitle.textContent = v < 0.5 && this.input.analogy?.holderLabel
      ? this.input.analogy.holderLabel
      : 'CRITICAL SECTION (HOLDER)';

    this.holdersGroup.append(holderBg, holderTitle);

    // 3. Waiting Area / Queue (Right)
    const waitX = 478;
    const waitY = 24;
    const waitW = 218;
    const waitH = 150;

    const waitBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    waitBg.setAttribute('x', String(waitX));
    waitBg.setAttribute('y', String(waitY));
    waitBg.setAttribute('width', String(waitW));
    waitBg.setAttribute('height', String(waitH));
    waitBg.setAttribute('rx', '12');
    waitBg.setAttribute('fill', 'var(--surface, #ffffff)');
    waitBg.setAttribute('stroke', state.waiting.length > 0 ? 'var(--waiting)' : 'var(--hairline)');
    waitBg.setAttribute('stroke-width', '1');

    const waitTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    waitTitle.setAttribute('x', String(waitX + waitW / 2));
    waitTitle.setAttribute('y', String(waitY + 28));
    waitTitle.setAttribute('text-anchor', 'middle');
    waitTitle.setAttribute('font-size', '11');
    waitTitle.setAttribute('font-weight', '700');
    waitTitle.setAttribute('fill', 'var(--muted)');
    waitTitle.textContent = v < 0.5 && this.input.analogy?.waitingLabel
      ? this.input.analogy.waitingLabel
      : (this.input.mode === 'spin' ? 'SPINNING QUEUE (BUSY WAIT)' : 'WAITING QUEUE (BLOCKED)');

    this.waitingGroup.append(waitBg, waitTitle);

    // 4. Render Isomorphic Actors with [id^="bar-${actor.id}"]
    this.input.actors.forEach((actor, aIdx) => {
      const isHolder = state.holders.includes(actor.id);
      const isWaiting = state.waiting.includes(actor.id);

      // Analogy Geometry: equal width tokens standing or seated
      const aTokenW = 54;
      const aTokenH = 44;
      let aX = 30 + aIdx * (aTokenW + 12);
      let aY = 190;
      if (isHolder) {
        const hPos = state.holders.indexOf(actor.id);
        aX = holderX + 24 + hPos * (aTokenW + 8);
        aY = holderY + 54;
      } else if (isWaiting) {
        const wPos = state.waiting.indexOf(actor.id);
        aX = waitX + 20 + wPos * (aTokenW + 8);
        aY = waitY + 54;
      }

      // Mechanism Geometry: execution bar / token
      const mTokenW = 84;
      const mTokenH = 44;
      let mX = 24 + aIdx * (mTokenW + 10);
      let mY = 190;
      if (isHolder) {
        const hPos = state.holders.indexOf(actor.id);
        mX = holderX + 16 + hPos * (mTokenW + 8);
        mY = holderY + 54;
      } else if (isWaiting) {
        const wPos = state.waiting.indexOf(actor.id);
        mX = waitX + 16 + wPos * (mTokenW + 8);
        mY = waitY + 54;
      }

      // Interpolate:
      const curX = aX + (mX - aX) * v;
      const curY = aY + (mY - aY) * v;
      const curW = aTokenW + (mTokenW - aTokenW) * v;
      const curH = aTokenH + (mTokenH - aTokenH) * v;

      const actorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      actorGroup.setAttribute('id', `bar-${actor.id}`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(curX));
      rect.setAttribute('y', String(curY));
      rect.setAttribute('width', String(curW));
      rect.setAttribute('height', String(curH));
      rect.setAttribute('rx', v < 0.5 ? '16' : '6');
      rect.setAttribute('fill', isHolder ? 'var(--running)' : isWaiting ? 'var(--waiting)' : 'var(--surface)');
      rect.setAttribute('stroke', isHolder ? 'var(--running)' : isWaiting ? 'var(--waiting)' : 'var(--hairline)');
      rect.setAttribute('stroke-width', '1.5');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(curX + curW / 2));
      label.setAttribute('y', String(curY + curH / 2 + 4));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '11');
      label.setAttribute('font-weight', '700');
      label.setAttribute('fill', isHolder || isWaiting ? '#ffffff' : 'var(--ink)');
      label.textContent = v < 0.5 && actor.analogyName ? actor.analogyName : actor.name;

      actorGroup.append(rect, label);
      this.actorsGroup.appendChild(actorGroup);
    });
  }

  public getActors(): CounterActor[] {
    return this.input.actors;
  }
}
