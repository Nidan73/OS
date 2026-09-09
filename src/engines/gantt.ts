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

export interface GanttInput {
  processes: Process[];
  algorithm: 'fcfs' | 'sjf' | 'srtf' | 'rr' | 'priority';
  quantum?: number;
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
  private svg!: SVGSVGElement;
  private barsGroup!: SVGGElement;
  private playheadLine!: SVGLineElement;
  private playheadLabel!: SVGTextElement;
  private metricsTable!: HTMLElement;
  private scheduleResult!: ScheduleResult;

  private readonly chartWidth = 720;
  private readonly chartHeight = 180;
  private readonly leftMargin = 60;
  private readonly topMargin = 30;
  private timeScale = 1;

  protected buildSteps(input: GanttInput): Step<GanttState>[] {
    if (!input.processes || input.processes.length === 0) {
      throw new Error('GanttEngine: input.processes must not be empty');
    }

    // Compute schedule through pure algorithm
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

    // Step 0: Initial arrival frame
    const initialReady = input.processes.filter(p => p.arrival === 0).map(p => p.id);

    steps.push({
      t: 0,
      caption: `T=0: Processes arrive. Ready queue: [${initialReady.join(', ')}].`,
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

    // Discrete step for each bar progression
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const previousBars = bars.slice(0, i);
      const currentExecuted = [...previousBars, bar];

      // Dispatch step
      const readyAtStart = input.processes
        .filter(p => p.arrival <= bar.start && !previousBars.some(b => b.id === p.id && b.end <= bar.start && p.burst <= currentExecuted.filter(cb => cb.id === p.id).reduce((sum, cb) => sum + (cb.end - cb.start), 0)))
        .map(p => p.id);

      steps.push({
        t: Number(currentTimeSec.toFixed(2)),
        caption: `T=${bar.start}: Dispatch ${bar.id} on CPU (${bar.start} → ${bar.end}).`,
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
      const completionCaption = isLastBarForProcess
        ? `T=${bar.end}: ${bar.id} completes execution (turnaround: ${bar.end - (input.processes.find(p => p.id === bar.id)?.arrival ?? 0)}).`
        : `T=${bar.end}: ${bar.id} quantum expired / preempted at T=${bar.end}.`;

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
      caption: `Schedule complete. Total time: ${totalTime}. Avg Wait: ${avgWaiting}, Avg Turnaround: ${avgTurnaround}.`,
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

  protected mount(): void {
    const totalTime = Math.max(1, this.scheduleResult?.totalTime || 30);
    this.timeScale = this.chartWidth / totalTime;

    // Scoped container wrapper
    const root = document.createElement('div');
    root.className = 'gantt-renderer';
    root.style.width = '100%';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = 'calc(var(--step) * 2)';

    // Scrollable SVG wrapper
    const svgScroll = document.createElement('div');
    svgScroll.className = 'gantt-svg-scroll';
    svgScroll.style.overflowX = 'auto';
    svgScroll.style.width = '100%';
    svgScroll.style.border = '1px solid var(--rule)';
    svgScroll.style.borderRadius = '8px';
    svgScroll.style.background = 'var(--surface)';

    const svgNS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${this.chartWidth + this.leftMargin + 40} ${this.chartHeight + this.topMargin + 40}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';

    // Grid lines and time ticks
    const axisGroup = document.createElementNS(svgNS, 'g');
    axisGroup.setAttribute('class', 'axis-grid');

    const stepTicks = totalTime <= 15 ? 1 : totalTime <= 30 ? 2 : 5;
    for (let t = 0; t <= totalTime; t += stepTicks) {
      const x = this.leftMargin + t * this.timeScale;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('y1', String(this.topMargin));
      line.setAttribute('y2', String(this.topMargin + this.chartHeight));
      line.setAttribute('stroke', 'var(--rule)');
      line.setAttribute('stroke-dasharray', '2,2');
      line.setAttribute('stroke-width', '1');

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(this.topMargin + this.chartHeight + 20));
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', '11');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'var(--muted)');
      text.textContent = String(t);

      axisGroup.append(line, text);
    }

    // Process labels on left
    const procGroup = document.createElementNS(svgNS, 'g');
    const rowHeight = this.chartHeight / (this.input.processes.length || 1);
    this.input.processes.forEach((p, idx) => {
      const y = this.topMargin + idx * rowHeight + rowHeight / 2;
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', String(this.leftMargin - 12));
      label.setAttribute('y', String(y + 4));
      label.setAttribute('font-family', 'var(--font-mono)');
      label.setAttribute('font-size', '13');
      label.setAttribute('font-weight', '600');
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', 'var(--ink)');
      label.textContent = p.id;
      procGroup.appendChild(label);
    });

    // Bars container
    this.barsGroup = document.createElementNS(svgNS, 'g');
    this.barsGroup.setAttribute('class', 'bars-group');

    // Playhead line
    this.playheadLine = document.createElementNS(svgNS, 'line');
    this.playheadLine.setAttribute('stroke', 'var(--accent)');
    this.playheadLine.setAttribute('stroke-width', '2');
    this.playheadLine.setAttribute('y1', String(this.topMargin - 10));
    this.playheadLine.setAttribute('y2', String(this.topMargin + this.chartHeight + 10));

    this.playheadLabel = document.createElementNS(svgNS, 'text');
    this.playheadLabel.setAttribute('font-family', 'var(--font-mono)');
    this.playheadLabel.setAttribute('font-size', '10');
    this.playheadLabel.setAttribute('font-weight', '700');
    this.playheadLabel.setAttribute('text-anchor', 'middle');
    this.playheadLabel.setAttribute('fill', 'var(--accent)');
    this.playheadLabel.setAttribute('y', String(this.topMargin - 14));

    this.svg.append(axisGroup, procGroup, this.barsGroup, this.playheadLine, this.playheadLabel);
    svgScroll.appendChild(this.svg);

    // Metrics table element
    this.metricsTable = document.createElement('div');
    this.metricsTable.className = 'metrics-table-wrapper';
    this.metricsTable.style.overflowX = 'auto';

    root.append(svgScroll, this.metricsTable);
    this.container.appendChild(root);
  }

  protected render(state: GanttState): void {
    const svgNS = 'http://www.w3.org/2000/svg';
    const rowHeight = this.chartHeight / (this.input.processes.length || 1);

    // 1. Idempotent bars rendering
    this.barsGroup.replaceChildren();

    // Map process id to row index
    const procRowMap: Record<string, number> = {};
    this.input.processes.forEach((p, idx) => { procRowMap[p.id] = idx; });

    state.executedBars.forEach(b => {
      const rowIdx = procRowMap[b.id] ?? 0;
      const x = this.leftMargin + b.start * this.timeScale;
      const width = Math.max(2, (b.end - b.start) * this.timeScale);
      const y = this.topMargin + rowIdx * rowHeight + 4;
      const height = rowHeight - 8;

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(height));
      rect.setAttribute('rx', '4');

      const isCurrent = state.currentBar && state.currentBar.id === b.id && state.currentBar.start === b.start;
      rect.setAttribute('fill', isCurrent ? 'var(--running)' : 'var(--travel)');
      rect.setAttribute('stroke', isCurrent ? 'var(--accent)' : 'var(--surface)');
      rect.setAttribute('stroke-width', '1.5');

      const barText = document.createElementNS(svgNS, 'text');
      barText.setAttribute('x', String(x + width / 2));
      barText.setAttribute('y', String(y + height / 2 + 4));
      barText.setAttribute('font-family', 'var(--font-mono)');
      barText.setAttribute('font-size', '11');
      barText.setAttribute('font-weight', '600');
      barText.setAttribute('text-anchor', 'middle');
      barText.setAttribute('fill', '#FFFFFF');
      barText.textContent = `${b.id} (${b.end - b.start})`;

      this.barsGroup.append(rect, barText);
    });

    // 2. Playhead positioning
    const playheadX = this.leftMargin + state.playheadTime * this.timeScale;
    this.playheadLine.setAttribute('x1', String(playheadX));
    this.playheadLine.setAttribute('x2', String(playheadX));
    this.playheadLabel.setAttribute('x', String(playheadX));
    this.playheadLabel.textContent = `T=${state.playheadTime.toFixed(1)}`;

    // 3. Live metrics table
    this.metricsTable.innerHTML = `
      <table class="gantt-metrics-table" style="width:100%; border-collapse: collapse; font-family: var(--font-ui); font-size: 0.85rem; background: var(--surface); border: 1px solid var(--rule); border-radius: 6px;">
        <thead>
          <tr style="border-bottom: 2px solid var(--rule); background: var(--surface-alt); text-align: left;">
            <th style="padding: 8px 12px;">Process</th>
            <th style="padding: 8px 12px;">Burst</th>
            <th style="padding: 8px 12px;">Arrival</th>
            <th style="padding: 8px 12px;">Wait Time</th>
            <th style="padding: 8px 12px;">Turnaround</th>
            <th style="padding: 8px 12px;">Response</th>
          </tr>
        </thead>
        <tbody>
          ${this.input.processes.map(p => {
            const m = state.metrics[p.id] ?? { waiting: 0, turnaround: 0, response: 0 };
            const isRowActive = state.activeProcessId === p.id;
            return `
              <tr style="border-bottom: 1px solid var(--rule); ${isRowActive ? 'background: var(--surface-alt); font-weight:600;' : ''}">
                <td style="padding: 6px 12px; font-family: var(--font-mono);">${p.id}</td>
                <td style="padding: 6px 12px; font-family: var(--font-mono);">${p.burst}</td>
                <td style="padding: 6px 12px; font-family: var(--font-mono);">${p.arrival}</td>
                <td style="padding: 6px 12px; font-family: var(--font-mono); color: var(--waiting);">${m.waiting}</td>
                <td style="padding: 6px 12px; font-family: var(--font-mono);">${m.turnaround}</td>
                <td style="padding: 6px 12px; font-family: var(--font-mono);">${m.response}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: var(--surface-alt); font-weight: 700;">
            <td colspan="3" style="padding: 8px 12px;">Average</td>
            <td style="padding: 8px 12px; font-family: var(--font-mono); color: var(--waiting);">${state.averages.avgWaiting}</td>
            <td style="padding: 8px 12px; font-family: var(--font-mono);">${state.averages.avgTurnaround}</td>
            <td style="padding: 8px 12px; font-family: var(--font-mono);">${state.averages.avgResponse}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }
}
