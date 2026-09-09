import { AnimationEngine } from '../core/engine.js';
import type { Step } from '../core/types.js';
import {
  type Process,
  type GanttBar,
  type ProcessMetrics,
  type ScheduleResult,
  fcfs,
  sjf,
  srtf,
  roundRobin,
  priorityScheduling
} from '../algorithms/scheduling.js';

export interface GanttAnalogyItem {
  customerName: string;
  orderText: string;
  orderIcon?: 'party-burger' | 'coffee' | 'meal';
  avatarColor?: string;
}

export interface GanttAnalogyConfig {
  domain: 'food' | 'travel' | 'friends';
  type: 'food-truck' | 'cafe' | 'express-lane' | 'karaoke' | 'airport';
  serviceLabel?: string;
  serviceSublabel?: string;
  queueLabel?: string;
  items?: Record<string, GanttAnalogyItem>;
}

export interface GanttInput {
  processes: Process[];
  algorithm: 'fcfs' | 'sjf' | 'srtf' | 'rr' | 'priority';
  quantum?: number;
  analogy?: GanttAnalogyConfig;
}

export interface GanttState {
  playheadTime: number;
  activeProcessId: string | null;
  executedBars: GanttBar[];
  currentBar: GanttBar | null;
  readyQueue: string[];
  metrics: Record<string, ProcessMetrics>;
  averages: {
    avgWaiting: number;
    avgTurnaround: number;
    avgResponse: number;
  };
}

export class GanttEngine extends AnimationEngine<GanttInput, GanttState> {
  protected svg!: SVGSVGElement;
  private barsGroup!: SVGGElement;
  private playheadGroup!: SVGGElement;
  private cursorLine!: SVGLineElement;
  private cursorBg!: SVGRectElement;
  private cursorLabel!: SVGTextElement;
  private serviceStationGroup!: SVGGElement;
  private trackGuideGroup!: SVGGElement;
  private metricsTable!: HTMLElement;
  private scheduleResult!: ScheduleResult;

  private readonly chartWidth = 660;
  private readonly chartHeight = 150;
  private readonly leftMargin = 100;
  private readonly topMargin = 30;
  private timeScale = 1;

  protected buildSteps(input: GanttInput): Step<GanttState>[] {
    if (!input.processes || input.processes.length === 0) {
      throw new Error('GanttEngine: input.processes must not be empty');
    }

    // Pure algorithm execution
    switch (input.algorithm) {
      case 'fcfs':
        this.scheduleResult = fcfs(input.processes);
        break;
      case 'sjf':
        this.scheduleResult = sjf(input.processes);
        break;
      case 'srtf':
        this.scheduleResult = srtf(input.processes);
        break;
      case 'rr':
        this.scheduleResult = roundRobin(input.processes, input.quantum ?? 4);
        break;
      case 'priority':
        this.scheduleResult = priorityScheduling(input.processes);
        break;
      default:
        throw new Error(`GanttEngine: unknown algorithm "${(input as any).algorithm}"`);
    }

    const { bars, totalTime, metrics, avgWaiting, avgTurnaround, avgResponse } = this.scheduleResult;
    const steps: Step<GanttState>[] = [];
    let currentTimeSec = 0;

    const initialReady = input.processes.filter(p => p.arrival === 0).map(p => p.id);

    // Step 0: Arrival
    steps.push({
      t: 0,
      caption: `T=0: Queue arrives [${initialReady.join(', ')}]. ${input.processes[0]?.id} (burst ${input.processes[0]?.burst}) at front of line.`,
      state: {
        playheadTime: 0,
        activeProcessId: null,
        executedBars: [],
        currentBar: null,
        readyQueue: initialReady,
        metrics: this.computeLiveMetrics(input.processes, [], 0),
        averages: { avgWaiting: 0, avgTurnaround: 0, avgResponse: 0 }
      },
      highlight: initialReady
    });

    currentTimeSec += 0.8;

    // Steps for execution
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const previousBars = bars.slice(0, i);
      const currentExecuted = [...previousBars, bar];

      const readyAtStart = input.processes
        .filter(p => p.arrival <= bar.start && !previousBars.some(b => b.id === p.id && b.end <= bar.start && p.burst <= currentExecuted.filter(cb => cb.id === p.id).reduce((sum, cb) => sum + (cb.end - cb.start), 0)))
        .map(p => p.id);

      // Start dispatch
      steps.push({
        t: Number(currentTimeSec.toFixed(2)),
        caption: `T=${bar.start}: Dispatch ${bar.id} (${bar.start} → ${bar.end}). Remaining queue waits.`,
        state: {
          playheadTime: bar.start,
          activeProcessId: bar.id,
          executedBars: currentExecuted,
          currentBar: bar,
          readyQueue: readyAtStart.filter(id => id !== bar.id),
          metrics: this.computeLiveMetrics(input.processes, currentExecuted, bar.start),
          averages: this.computeLiveAverages(input.processes, currentExecuted, bar.start)
        },
        highlight: [bar.id]
      });

      currentTimeSec += 1.0;

      // Completion of this segment
      const isLastBarForProcess = !bars.slice(i + 1).some(b => b.id === bar.id);
      const arrival = input.processes.find(p => p.id === bar.id)?.arrival ?? 0;
      const completionCaption = isLastBarForProcess
        ? `T=${bar.end}: ${bar.id} completes! Total turnaround: ${bar.end - arrival}.`
        : `T=${bar.end}: ${bar.id} segment ends at T=${bar.end}.`;

      steps.push({
        t: Number(currentTimeSec.toFixed(2)),
        caption: completionCaption,
        state: {
          playheadTime: bar.end,
          activeProcessId: null,
          executedBars: currentExecuted,
          currentBar: null,
          readyQueue: input.processes.filter(p => p.arrival <= bar.end && !currentExecuted.filter(cb => cb.id === p.id).length).map(p => p.id),
          metrics: this.computeLiveMetrics(input.processes, currentExecuted, bar.end),
          averages: this.computeLiveAverages(input.processes, currentExecuted, bar.end)
        },
        highlight: [bar.id]
      });

      currentTimeSec += 0.8;
    }

    // Final summary step
    steps.push({
      t: Number(currentTimeSec.toFixed(2)),
      caption: `Done at T=${totalTime}. Avg Wait: ${avgWaiting} ms, Avg Turnaround: ${avgTurnaround} ms.`,
      state: {
        playheadTime: totalTime,
        activeProcessId: null,
        executedBars: bars,
        currentBar: null,
        readyQueue: [],
        metrics,
        averages: { avgWaiting, avgTurnaround, avgResponse }
      }
    });

    return steps;
  }

  private computeLiveMetrics(processes: Process[], executed: GanttBar[], currentTime: number): Record<string, ProcessMetrics> {
    const metrics: Record<string, ProcessMetrics> = {};
    for (const p of processes) {
      const pBars = executed.filter(b => b.id === p.id);
      const isFinished = pBars.reduce((sum, b) => sum + (b.end - b.start), 0) >= p.burst;
      const firstRun = pBars.length > 0 ? pBars[0].start : -1;
      const resp = firstRun >= 0 ? firstRun - p.arrival : 0;
      const lastEnd = pBars.length > 0 ? pBars[pBars.length - 1].end : currentTime;
      const tat = isFinished ? lastEnd - p.arrival : Math.max(0, currentTime - p.arrival);
      const wait = isFinished ? tat - p.burst : Math.max(0, tat - pBars.reduce((sum, b) => sum + (b.end - b.start), 0));

      metrics[p.id] = {
        waiting: wait,
        turnaround: tat,
        response: Math.max(0, resp),
        completion: isFinished ? lastEnd : 0
      };
    }
    return metrics;
  }

  private computeLiveAverages(processes: Process[], executed: GanttBar[], currentTime: number) {
    const live = this.computeLiveMetrics(processes, executed, currentTime);
    let tw = 0, tt = 0, tr = 0;
    const n = processes.length || 1;
    for (const p of processes) {
      tw += live[p.id].waiting;
      tt += live[p.id].turnaround;
      tr += live[p.id].response;
    }
    const round2 = (num: number) => Math.round(num * 100) / 100;
    return {
      avgWaiting: round2(tw / n),
      avgTurnaround: round2(tt / n),
      avgResponse: round2(tr / n)
    };
  }

  getScheduleResult(): ScheduleResult {
    return this.scheduleResult;
  }

  getProcesses(): Process[] {
    return [...this.input.processes];
  }

  /**
   * Interactive playground control (§3C.4): reorders the queue and recalculates pure schedule.
   */
  reorderProcesses(newProcesses: Process[]): void {
    this.input.processes = newProcesses.map(p => ({ ...p }));
    this.setSteps(this.buildSteps(this.input));
    const totalTime = Math.max(1, this.scheduleResult?.totalTime || 30);
    this.timeScale = this.chartWidth / totalTime;
    this.remountScaffolding();
    this.seek(0);
  }

  private remountScaffolding(): void {
    this.container.replaceChildren();
    this.mount();
  }

  protected mount(): void {
    const totalTime = Math.max(1, this.scheduleResult?.totalTime || 30);
    this.timeScale = this.chartWidth / totalTime;

    const root = document.createElement('div');
    root.className = 'gantt-renderer';
    root.style.width = '100%';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = 'calc(var(--step) * 0.75)';

    const svgScroll = document.createElement('div');
    svgScroll.className = 'gantt-svg-scroll';
    svgScroll.style.overflowX = 'auto';
    svgScroll.style.width = '100%';
    svgScroll.style.border = '1px solid var(--hairline)';
    svgScroll.style.borderRadius = 'var(--rounded-lg, 18px)';
    svgScroll.style.background = 'var(--surface)';

    const svgNS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${this.chartWidth + this.leftMargin + 40} ${this.chartHeight + this.topMargin + 50}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.style.width = '100%';
    this.svg.style.maxHeight = '180px';
    this.svg.style.display = 'block';
    this.svg.style.margin = '0 auto';

    // 1. Service Station / CPU Core (Left Boundary)
    this.serviceStationGroup = document.createElementNS(svgNS, 'g');
    this.serviceStationGroup.setAttribute('id', 'service-station');

    // Mechanism: Core box
    const coreBox = document.createElementNS(svgNS, 'rect');
    coreBox.setAttribute('id', 'core-box');
    coreBox.setAttribute('x', '10');
    coreBox.setAttribute('y', String(this.topMargin + 10));
    coreBox.setAttribute('width', '75');
    coreBox.setAttribute('height', '110');
    coreBox.setAttribute('rx', '6');
    coreBox.setAttribute('fill', 'var(--surface-alt)');
    coreBox.setAttribute('stroke', 'var(--rule)');
    coreBox.setAttribute('stroke-width', '1.5');

    const coreTitle = document.createElementNS(svgNS, 'text');
    coreTitle.setAttribute('id', 'core-title');
    coreTitle.setAttribute('x', '47.5');
    coreTitle.setAttribute('y', String(this.topMargin + 45));
    coreTitle.setAttribute('font-family', 'var(--font-mono)');
    coreTitle.setAttribute('font-size', '11');
    coreTitle.setAttribute('font-weight', '700');
    coreTitle.setAttribute('text-anchor', 'middle');
    coreTitle.setAttribute('fill', 'var(--accent)');
    coreTitle.textContent = 'CPU CORE';

    const coreState = document.createElementNS(svgNS, 'text');
    coreState.setAttribute('id', 'core-state');
    coreState.setAttribute('x', '47.5');
    coreState.setAttribute('y', String(this.topMargin + 75));
    coreState.setAttribute('font-family', 'var(--font-mono)');
    coreState.setAttribute('font-size', '10');
    coreState.setAttribute('text-anchor', 'middle');
    coreState.setAttribute('fill', 'var(--muted)');
    coreState.textContent = 'DISPATCH';

    // Analogy: Food Truck storefront
    const truckBox = document.createElementNS(svgNS, 'rect');
    truckBox.setAttribute('id', 'truck-box');
    truckBox.setAttribute('x', '10');
    truckBox.setAttribute('y', String(this.topMargin + 10));
    truckBox.setAttribute('width', '75');
    truckBox.setAttribute('height', '110');
    truckBox.setAttribute('rx', '8');
    truckBox.setAttribute('fill', 'var(--surface-alt)');
    truckBox.setAttribute('stroke', 'var(--food)');
    truckBox.setAttribute('stroke-width', '1.5');

    const truckTitle = document.createElementNS(svgNS, 'text');
    truckTitle.setAttribute('id', 'truck-title');
    truckTitle.setAttribute('x', '47.5');
    truckTitle.setAttribute('y', String(this.topMargin + 45));
    truckTitle.setAttribute('font-family', 'var(--font-ui)');
    truckTitle.setAttribute('font-size', '11');
    truckTitle.setAttribute('font-weight', '700');
    truckTitle.setAttribute('text-anchor', 'middle');
    truckTitle.setAttribute('fill', 'var(--food)');
    truckTitle.textContent = 'CHEF PASS';

    const truckState = document.createElementNS(svgNS, 'text');
    truckState.setAttribute('id', 'truck-state');
    truckState.setAttribute('x', '47.5');
    truckState.setAttribute('y', String(this.topMargin + 75));
    truckState.setAttribute('font-family', 'var(--font-ui)');
    truckState.setAttribute('font-size', '9');
    truckState.setAttribute('text-anchor', 'middle');
    truckState.setAttribute('fill', 'var(--muted)');
    truckState.textContent = '1-BY-1';

    this.serviceStationGroup.append(coreBox, coreTitle, coreState, truckBox, truckTitle, truckState);

    // 2. Track Guide / Timeline Axis
    this.trackGuideGroup = document.createElementNS(svgNS, 'g');
    this.trackGuideGroup.setAttribute('id', 'track-guide');

    const axisLine = document.createElementNS(svgNS, 'line');
    axisLine.setAttribute('id', 'axis-line');
    axisLine.setAttribute('x1', String(this.leftMargin));
    axisLine.setAttribute('x2', String(this.leftMargin + this.chartWidth));
    axisLine.setAttribute('y1', String(this.topMargin + this.chartHeight));
    axisLine.setAttribute('y2', String(this.topMargin + this.chartHeight));
    axisLine.setAttribute('stroke', 'var(--rule)');
    axisLine.setAttribute('stroke-width', '1.5');

    // Time ticks
    const stepTicks = totalTime <= 15 ? 1 : totalTime <= 30 ? 3 : 5;
    const ticksGroup = document.createElementNS(svgNS, 'g');
    ticksGroup.setAttribute('id', 'ticks-group');

    for (let t = 0; t <= totalTime; t += stepTicks) {
      const x = this.leftMargin + t * this.timeScale;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('y1', String(this.topMargin + 10));
      line.setAttribute('y2', String(this.topMargin + this.chartHeight));
      line.setAttribute('stroke', 'var(--rule)');
      line.setAttribute('stroke-dasharray', '2,2');
      line.setAttribute('stroke-width', '1');

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(this.topMargin + this.chartHeight + 18));
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', '11');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'var(--muted)');
      text.textContent = String(t);

      ticksGroup.append(line, text);
    }

    this.trackGuideGroup.append(axisLine, ticksGroup);

    // 3. Process Bars & Customer Sprites (Isomorphic items)
    this.barsGroup = document.createElementNS(svgNS, 'g');
    this.barsGroup.setAttribute('id', 'bars-group');

    for (const p of this.input.processes) {
      const procGroup = document.createElementNS(svgNS, 'g');
      procGroup.setAttribute('id', `proc-${p.id}`);

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('id', `bar-${p.id}`);

      const sprite = document.createElementNS(svgNS, 'g');
      sprite.setAttribute('id', `sprite-${p.id}`);

      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('id', `label-${p.id}`);

      const badge = document.createElementNS(svgNS, 'g');
      badge.setAttribute('id', `badge-${p.id}`);

      procGroup.append(rect, sprite, label, badge);
      this.barsGroup.appendChild(procGroup);
    }

    // 4. Playhead Cursor
    this.playheadGroup = document.createElementNS(svgNS, 'g');
    this.playheadGroup.setAttribute('id', 'playhead-group');

    this.cursorLine = document.createElementNS(svgNS, 'line');
    this.cursorLine.setAttribute('id', 'cursor-line');
    this.cursorLine.setAttribute('y1', String(this.topMargin + 5));
    this.cursorLine.setAttribute('y2', String(this.topMargin + this.chartHeight + 22));
    this.cursorLine.setAttribute('stroke', 'var(--accent)');
    this.cursorLine.setAttribute('stroke-width', '2');

    this.cursorBg = document.createElementNS(svgNS, 'rect');
    this.cursorBg.setAttribute('id', 'cursor-bg');
    this.cursorBg.setAttribute('height', '18');
    this.cursorBg.setAttribute('rx', '4');
    this.cursorBg.setAttribute('fill', 'var(--accent)');

    this.cursorLabel = document.createElementNS(svgNS, 'text');
    this.cursorLabel.setAttribute('id', 'cursor-label');
    this.cursorLabel.setAttribute('font-family', 'var(--font-mono)');
    this.cursorLabel.setAttribute('font-size', '10');
    this.cursorLabel.setAttribute('font-weight', '700');
    this.cursorLabel.setAttribute('text-anchor', 'middle');
    this.cursorLabel.setAttribute('fill', '#FFFFFF');

    this.playheadGroup.append(this.cursorLine, this.cursorBg, this.cursorLabel);

    this.svg.append(this.serviceStationGroup, this.trackGuideGroup, this.barsGroup, this.playheadGroup);
    svgScroll.appendChild(this.svg);

    // Metrics Table
    this.metricsTable = document.createElement('div');
    this.metricsTable.className = 'metrics-table-wrapper';
    this.metricsTable.style.overflowX = 'auto';

    root.append(svgScroll, this.metricsTable);
    this.container.appendChild(root);

    this.validateIsomorphism();
    this.validateMorph();
  }

  /**
   * Validates structural isomorphism (§3C.2, §3C.3): both views must emit identical element IDs.
   */
  public validateIsomorphism(): void {
    const requiredIds = [
      'service-station',
      'core-box',
      'core-title',
      'core-state',
      'truck-box',
      'truck-title',
      'truck-state',
      'track-guide',
      'axis-line',
      'bars-group',
      'playhead-group',
      'cursor-line',
      'cursor-bg',
      'cursor-label',
      ...this.input.processes.flatMap(p => [
        `proc-${p.id}`,
        `bar-${p.id}`,
        `sprite-${p.id}`,
        `label-${p.id}`,
        `badge-${p.id}`
      ])
    ];

    for (const id of requiredIds) {
      if (!this.svg.querySelector(`#${id}`)) {
        throw new Error(`Isomorphism violation (§3C.2): element #${id} missing from SVG`);
      }
    }
  }

  /**
   * Validates geometric morph (§3C.2a, §3C.3): asserts at least one geometric attribute
   * per entity differs between view 0 and view 1.
   */
  public validateMorph(): void {
    const currentState = this.steps[this.getCurrentIndex()]?.state ?? this.steps[0].state;
    const initialView = this.currentView;

    // Sample geometry at view 0
    this.render(currentState, 0);
    const view0 = this.input.processes.map(p => {
      const el = this.svg.querySelector(`#bar-${p.id}`) as SVGRectElement;
      return {
        id: p.id,
        x: parseFloat(el?.getAttribute('x') || '0'),
        width: parseFloat(el?.getAttribute('width') || '0')
      };
    });

    // Sample geometry at view 1
    this.render(currentState, 1);
    const view1 = this.input.processes.map(p => {
      const el = this.svg.querySelector(`#bar-${p.id}`) as SVGRectElement;
      return {
        id: p.id,
        x: parseFloat(el?.getAttribute('x') || '0'),
        width: parseFloat(el?.getAttribute('width') || '0')
      };
    });

    // Restore initial view
    this.render(currentState, initialView);

    // Verify each process entity differs geometrically between view 0 and view 1
    for (let i = 0; i < this.input.processes.length; i++) {
      const g0 = view0[i];
      const g1 = view1[i];
      const diffX = Math.abs(g1.x - g0.x);
      const diffW = Math.abs(g1.width - g0.width);

      if (diffX < 1 && diffW < 1) {
        throw new Error(
          `Morph violation (§3C.2a): Entity #${g0.id} has identical geometry at view=0 and view=1 (x: ${g0.x}, width: ${g0.width}). A transition that changes only paint is a reskin, not a morph.`
        );
      }
    }
  }

  protected render(state: GanttState, view: number = 0): void {
    const v = Math.max(0, Math.min(1, view));
    const svgNS = 'http://www.w3.org/2000/svg';

    // 1. Update Service Station (Station on left)
    const coreBox = this.svg.querySelector('#core-box') as SVGRectElement;
    const coreTitle = this.svg.querySelector('#core-title') as SVGTextElement;
    const coreState = this.svg.querySelector('#core-state') as SVGTextElement;
    const truckBox = this.svg.querySelector('#truck-box') as SVGRectElement;
    const truckTitle = this.svg.querySelector('#truck-title') as SVGTextElement;
    const truckState = this.svg.querySelector('#truck-state') as SVGTextElement;

    if (coreBox && truckBox) {
      coreBox.style.opacity = String(v);
      coreTitle.style.opacity = String(v);
      coreState.style.opacity = String(v);

      truckBox.style.opacity = String(1 - v);
      truckTitle.style.opacity = String(1 - v);
      truckState.style.opacity = String(1 - v);

      if (state.activeProcessId) {
        coreState.textContent = state.activeProcessId;
        coreState.setAttribute('fill', 'var(--running)');
        truckState.textContent = `Order ${state.activeProcessId}`;
        truckState.setAttribute('fill', 'var(--food)');
      } else {
        coreState.textContent = 'IDLE';
        coreState.setAttribute('fill', 'var(--muted)');
        truckState.textContent = 'WAITING';
        truckState.setAttribute('fill', 'var(--muted)');
      }
    }

    // 2. Track Guide (Axis ticks vs pavement markers)
    const ticksGroup = this.svg.querySelector('#ticks-group') as SVGGElement;
    if (ticksGroup) {
      ticksGroup.style.opacity = String(v);
    }

    // 3. Render isomorphic process bars & customer sprites
    const analogyItems = this.input.analogy?.items || {};

    for (const p of this.input.processes) {
      const procGroup = this.svg.querySelector(`#proc-${p.id}`) as SVGGElement;
      if (!procGroup) continue;

      const bar = this.scheduleResult.bars.find(b => b.id === p.id);
      const start = bar ? bar.start : p.arrival;
      const end = bar ? bar.end : p.arrival + p.burst;
      const burst = end - start;
      // Equal space in queue (view = 0) vs burst-proportional in mechanism (view = 1) (§3C.2)
      const eqW = this.chartWidth / this.input.processes.length;
      const queueIndex = this.input.processes.findIndex(proc => proc.id === p.id);
      const eqX = this.leftMargin + (queueIndex >= 0 ? queueIndex : 0) * eqW;

      const mechW = burst * this.timeScale;
      const mechX = this.leftMargin + start * this.timeScale;

      const width = eqW + (mechW - eqW) * v;
      const x = eqX + (mechX - eqX) * v;
      const y = this.topMargin + 10;
      const height = 110;

      const isCurrent = state.currentBar && state.currentBar.id === p.id;
      const isCompleted = state.executedBars.some(eb => eb.id === p.id && eb.end <= state.playheadTime);
      const isWaiting = !isCompleted && !isCurrent;

      // Update Bar Rect
      const rect = procGroup.querySelector(`#bar-${p.id}`) as SVGRectElement;
      if (rect) {
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(8 - 2 * v));

        if (v >= 0.5) {
          // Mechanism view: crisp Gantt block
          rect.setAttribute('fill', isCurrent ? 'var(--running)' : isCompleted ? 'var(--completed)' : 'var(--surface-alt)');
          rect.setAttribute('stroke', isCurrent ? 'var(--accent)' : 'var(--rule)');
          rect.setAttribute('stroke-width', isCurrent ? '2' : '1');
        } else {
          // Analogy view: food queue customer slot
          rect.setAttribute('fill', isCurrent ? 'rgba(8, 127, 91, 0.16)' : isCompleted ? 'rgba(42, 111, 151, 0.16)' : 'rgba(217, 119, 6, 0.10)');
          rect.setAttribute('stroke', isCurrent ? 'var(--running)' : isCompleted ? 'var(--completed)' : 'var(--waiting)');
          rect.setAttribute('stroke-width', '1.5');
        }
      }

      // Update Customer Sprite (anchored in upper-middle portion to avoid colliding with label)
      const sprite = procGroup.querySelector(`#sprite-${p.id}`) as SVGGElement;
      if (sprite) {
        sprite.style.opacity = String(1 - v);
        sprite.replaceChildren();

        const cx = x + width / 2;
        const cy = y + 36;
        const itemInfo = analogyItems[p.id];
        const avatarCol = itemInfo?.avatarColor || (p.burst > 10 ? '#D97706' : '#0284C7');

        // Head
        const head = document.createElementNS(svgNS, 'circle');
        head.setAttribute('cx', String(cx));
        head.setAttribute('cy', String(cy - 6));
        head.setAttribute('r', '9');
        head.setAttribute('fill', avatarCol);

        // Face details
        const eye1 = document.createElementNS(svgNS, 'circle');
        eye1.setAttribute('cx', String(cx - 3));
        eye1.setAttribute('cy', String(cy - 7));
        eye1.setAttribute('r', '1.2');
        eye1.setAttribute('fill', '#FFFFFF');

        const eye2 = document.createElementNS(svgNS, 'circle');
        eye2.setAttribute('cx', String(cx + 3));
        eye2.setAttribute('cy', String(cy - 7));
        eye2.setAttribute('r', '1.2');
        eye2.setAttribute('fill', '#FFFFFF');

        // Torso
        const torso = document.createElementNS(svgNS, 'rect');
        torso.setAttribute('x', String(cx - 8));
        torso.setAttribute('y', String(cy + 4));
        torso.setAttribute('width', '16');
        torso.setAttribute('height', '18');
        torso.setAttribute('rx', '3');
        torso.setAttribute('fill', avatarCol);
        torso.setAttribute('opacity', '0.85');

        // Order badge / Tray
        const tray = document.createElementNS(svgNS, 'g');
        const trayW = Math.min(width - 12, 46);
        const trayBg = document.createElementNS(svgNS, 'rect');
        trayBg.setAttribute('x', String(cx - trayW / 2));
        trayBg.setAttribute('y', String(cy + 25));
        trayBg.setAttribute('width', String(trayW));
        trayBg.setAttribute('height', '15');
        trayBg.setAttribute('rx', '3');
        trayBg.setAttribute('fill', 'var(--surface)');
        trayBg.setAttribute('stroke', 'var(--hairline)');
        trayBg.setAttribute('stroke-width', '1');

        const trayTxt = document.createElementNS(svgNS, 'text');
        trayTxt.setAttribute('x', String(cx));
        trayTxt.setAttribute('y', String(cy + 36));
        trayTxt.setAttribute('font-family', 'var(--font-ui)');
        trayTxt.setAttribute('font-size', '8.5');
        trayTxt.setAttribute('font-weight', '600');
        trayTxt.setAttribute('text-anchor', 'middle');
        trayTxt.setAttribute('fill', 'var(--ink)');
        trayTxt.textContent = width >= 150
          ? (p.burst >= 20 ? '🍔 × 24' : '☕ 1 coffee')
          : (p.burst >= 20 ? '🍔 24' : '☕ 1');

        tray.append(trayBg, trayTxt);
        sprite.append(head, eye1, eye2, torso, tray);
      }

      // Update Label (anchored below sprite in analogy view; centered or stacked in mechanism view)
      const label = procGroup.querySelector(`#label-${p.id}`) as SVGTextElement;
      if (label) {
        label.setAttribute('x', String(x + width / 2));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-weight', '600');

        if (v >= 0.5) {
          label.setAttribute('fill', isCurrent || isCompleted ? '#FFFFFF' : 'var(--ink)');
          if (width >= 80) {
            label.setAttribute('y', String(y + height / 2 + 5));
            label.setAttribute('font-family', 'var(--font-mono)');
            label.setAttribute('font-size', '12');
            label.textContent = `${p.id} (${p.burst}ms)`;
          } else {
            // Narrow width (e.g. 66px): stack process ID and burst time to prevent clipping
            label.setAttribute('y', String(y + height / 2 - 2));
            label.setAttribute('font-family', 'var(--font-ui)');
            label.setAttribute('font-size', '11');
            label.innerHTML = `
              <tspan x="${x + width / 2}" dy="0">${p.id}</tspan>
              <tspan x="${x + width / 2}" dy="13" font-size="9" font-family="var(--font-mono)" fill="${isCurrent || isCompleted ? 'rgba(255,255,255,0.85)' : 'var(--muted)'}">${p.burst}ms</tspan>
            `;
          }
        } else {
          // Analogy view: positioned cleanly BELOW the customer sprite (never collides)
          label.setAttribute('y', String(y + 98));
          label.setAttribute('font-family', 'var(--font-ui)');
          label.setAttribute('font-size', width >= 160 ? '10.5' : '9.5');
          label.setAttribute('fill', 'var(--ink)');
          label.textContent = width >= 160 ? `${p.id}: ${p.burst}m order` : `${p.id} (${p.burst}m)`;
        }
      }

      // Update Badge (anchored at top; adapts width & abbreviation to never clip)
      const badge = procGroup.querySelector(`#badge-${p.id}`) as SVGGElement;
      if (badge) {
        badge.replaceChildren();
        const finalWait = this.scheduleResult.metrics[p.id]?.waiting ?? 0;
        const liveWait = state.metrics[p.id]?.waiting ?? 0;
        const displayWait = v >= 0.5 ? liveWait : finalWait;

        const badgeW = width < 70 ? 38 : width < 110 ? 52 : 64;
        const badgeX = x + width / 2 - badgeW / 2;

        const pill = document.createElementNS(svgNS, 'rect');
        pill.setAttribute('x', String(badgeX));
        pill.setAttribute('y', String(y + 5));
        pill.setAttribute('width', String(badgeW));
        pill.setAttribute('height', '15');
        pill.setAttribute('rx', '3');
        pill.setAttribute('fill', 'var(--surface)');
        pill.setAttribute('stroke', 'var(--hairline)');
        pill.setAttribute('stroke-width', '1');

        const pillTxt = document.createElementNS(svgNS, 'text');
        pillTxt.setAttribute('x', String(x + width / 2));
        pillTxt.setAttribute('y', String(y + 16));
        pillTxt.setAttribute('font-family', 'var(--font-mono)');
        pillTxt.setAttribute('font-size', width < 70 ? '8.5' : '9');
        pillTxt.setAttribute('font-weight', '600');
        pillTxt.setAttribute('text-anchor', 'middle');
        pillTxt.setAttribute('fill', isWaiting ? 'var(--waiting)' : 'var(--muted)');
        pillTxt.textContent = width < 70 ? `W:${displayWait}` : `Wait: ${displayWait}`;

        badge.append(pill, pillTxt);
      }
    }

    // 4. Playhead cursor positioning with interpolation between queue progress and mechanism time
    const mechCursorX = this.leftMargin + state.playheadTime * this.timeScale;
    let eqCursorX = this.leftMargin;
    const eqW = this.chartWidth / this.input.processes.length;
    const currentBar = this.scheduleResult.bars.find(b => state.playheadTime >= b.start && state.playheadTime <= b.end);
    if (currentBar) {
      const qIdx = this.input.processes.findIndex(pr => pr.id === currentBar.id);
      const frac = currentBar.end > currentBar.start ? (state.playheadTime - currentBar.start) / (currentBar.end - currentBar.start) : 0;
      eqCursorX = this.leftMargin + Math.max(0, qIdx) * eqW + frac * eqW;
    } else if (state.playheadTime >= this.scheduleResult.totalTime) {
      eqCursorX = this.leftMargin + this.chartWidth;
    }
    const cursorX = eqCursorX + (mechCursorX - eqCursorX) * v;

    this.cursorLine.setAttribute('x1', String(cursorX));
    this.cursorLine.setAttribute('x2', String(cursorX));

    const labelText = v >= 0.5
      ? `T=${state.playheadTime.toFixed(0)}ms`
      : (state.activeProcessId ? `Serving ${state.activeProcessId}` : 'Now Serving');
    const labelWidth = Math.max(68, labelText.length * 7.5 + 16);
    this.cursorBg.setAttribute('x', String(cursorX - labelWidth / 2));
    this.cursorBg.setAttribute('y', String(this.topMargin - 15));
    this.cursorBg.setAttribute('width', String(labelWidth));

    this.cursorLabel.setAttribute('x', String(cursorX));
    this.cursorLabel.setAttribute('y', String(this.topMargin - 3));
    this.cursorLabel.textContent = labelText;

    // 5. Reference Metrics Table (Showing FINAL computed schedule metrics per Finding 2 + live accumulation)
    this.metricsTable.innerHTML = `
      <table class="gantt-metrics-table" style="width:100%; border-collapse: collapse; font-family: var(--font-ui); font-size: 0.74rem; line-height: 1.25; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px); overflow: hidden;">
        <thead>
          <tr style="border-bottom: 1px solid var(--hairline); background: var(--surface-alt); text-align: left;">
            <th style="padding: 2px 6px; font-weight: 600;">Process</th>
            <th style="padding: 2px 6px; font-weight: 600;">Burst</th>
            <th style="padding: 2px 6px; font-weight: 600;">Arrival</th>
            <th style="padding: 2px 6px; font-weight: 600;">Wait Time</th>
            <th style="padding: 2px 6px; font-weight: 600;">Turnaround</th>
            <th style="padding: 2px 6px; font-weight: 600;">Live Progress</th>
          </tr>
        </thead>
        <tbody>
          ${this.input.processes.map(p => {
            const finalM = this.scheduleResult.metrics[p.id] ?? { waiting: 0, turnaround: 0, response: 0 };
            const liveM = state.metrics[p.id] ?? { waiting: 0, turnaround: 0, response: 0 };
            const isRowActive = state.activeProcessId === p.id;
            return `
              <tr style="border-bottom: 1px solid var(--hairline); ${isRowActive ? 'background: rgba(0,102,204,0.06); font-weight:600;' : ''}">
                <td style="padding: 2px 6px; font-family: var(--font-mono);">${p.id}</td>
                <td style="padding: 2px 6px; font-family: var(--font-mono);">${p.burst}</td>
                <td style="padding: 2px 6px; font-family: var(--font-mono);">${p.arrival}</td>
                <td style="padding: 2px 6px; font-family: var(--font-mono); color: var(--waiting); font-weight: 600;">${finalM.waiting} ms</td>
                <td style="padding: 2px 6px; font-family: var(--font-mono);">${finalM.turnaround} ms</td>
                <td style="padding: 2px 6px; font-family: var(--font-mono); color: var(--muted); font-size: 0.72rem;">waited ${liveM.waiting}ms</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: var(--surface-alt); font-weight: 600;">
            <td colspan="3" style="padding: 2px 6px;">Average Schedule Baseline</td>
            <td style="padding: 2px 6px; font-family: var(--font-mono); color: var(--waiting); font-size: 0.82rem; font-weight: 700;">${this.scheduleResult.avgWaiting} ms</td>
            <td style="padding: 2px 6px; font-family: var(--font-mono);">${this.scheduleResult.avgTurnaround} ms</td>
            <td style="padding: 2px 6px; font-family: var(--font-mono); color: var(--muted); font-size: 0.72rem;">live avg: ${state.averages.avgWaiting}ms</td>
          </tr>
        </tfoot>
      </table>
    `;

    this.validateIsomorphism();
  }
}
