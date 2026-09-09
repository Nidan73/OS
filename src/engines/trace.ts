import { AnimationEngine } from '../core/engine.js';
import type { PlaygroundCapable } from '../core/types.js';
import type { Step } from '../core/types.js';

export interface TraceThread {
  id: string;
  name: string;
  instructions: string[];
  color?: string;
  analogyName?: string;
}

export interface TraceInput {
  threads: TraceThread[];
  interleaving: number[]; // index of thread to execute next instruction at each step
  initial: Record<string, number>;
  analogy?: {
    domain: 'friends' | 'travel' | 'food';
    title?: string;
    labels?: Record<string, string>;
  };
}

export interface TraceState {
  stepIndex: number;
  activeThreadIndex: number | null;
  threadPointers: number[]; // index of current instruction in each thread
  registers: Record<string, number | null>; // e.g. R1, R2
  memory: Record<string, number>; // e.g. counter: 5
  lastModifiedVar: string | null;
  caption: string;
}

export class TraceEngine extends AnimationEngine<TraceInput, TraceState> implements PlaygroundCapable {
  renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    if ((this.input as any).renderPlayground) {
      (this.input as any).renderPlayground(host, scoreboardHost, this);
    }
  }
  private svg!: SVGSVGElement;
  private columnsGroup!: SVGGElement;
  private memoryGroup!: SVGGElement;
  private cursorsGroup!: SVGGElement;

  private readonly canvasWidth = 720;
  private readonly canvasHeight = 260;

  protected buildSteps(input: TraceInput): Step<TraceState>[] {
    if (!input.threads || input.threads.length === 0) {
      throw new Error('TraceEngine: input.threads must not be empty');
    }

    const steps: Step<TraceState>[] = [];
    const memory = { ...input.initial };
    const registers: Record<string, number | null> = {};
    const threadPointers = input.threads.map(() => 0);

    input.threads.forEach((t, i) => {
      registers[`R${i + 1}`] = null;
    });

    // Step 0: Initial state before any instruction runs
    steps.push({
      t: 0,
      caption: `Initial state: Shared memory = [${Object.entries(memory).map(([k, v]) => `${k}:${v}`).join(', ')}]. Threads ready.`,
      highlight: input.threads.map(t => t.id),
      state: {
        stepIndex: 0,
        activeThreadIndex: null,
        threadPointers: [...threadPointers],
        registers: { ...registers },
        memory: { ...memory },
        lastModifiedVar: null,
        caption: 'Initial state before execution.'
      }
    });

    let curT = 1.0;

    for (let i = 0; i < input.interleaving.length; i++) {
      const thIdx = input.interleaving[i];
      const thread = input.threads[thIdx];
      if (!thread) continue;

      const pc = threadPointers[thIdx];
      if (pc >= thread.instructions.length) continue;

      const inst = thread.instructions[pc].trim();
      threadPointers[thIdx]++;

      const regKey = `R${thIdx + 1}`;
      let lastMod: string | null = null;
      let stepCaption = `${thread.name}: executes "${inst}".`;

      // Simple pure simulation of typical concurrency instructions:
      // reg = var
      const loadMatch = inst.match(/^([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)$/);
      // reg = reg + 1 / - 1
      const opMatch = inst.match(/^([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*([+\-])\s*([0-9]+)$/);

      if (opMatch) {
        const [, target, src, op, valStr] = opMatch;
        const val = parseInt(valStr, 10);
        const currentVal = registers[regKey] ?? memory[src] ?? 0;
        const result = op === '+' ? currentVal + val : currentVal - val;
        registers[regKey] = result;
        lastMod = regKey;
        stepCaption = `${thread.name}: computes ${target} = ${result}.`;
      } else if (loadMatch) {
        const [, target, src] = loadMatch;
        if (target.toLowerCase().startsWith('reg') || target.startsWith('R')) {
          const val = memory[src] !== undefined ? memory[src] : (registers[src] ?? 0);
          registers[regKey] = val;
          lastMod = regKey;
          stepCaption = `${thread.name}: loads ${src} (${val}) into ${regKey}.`;
        } else {
          // store into memory
          const val = registers[regKey] !== null ? (registers[regKey] as number) : (parseInt(src, 10) || 0);
          memory[target] = val;
          lastMod = target;
          stepCaption = `${thread.name}: writes ${target} = ${val} to memory.`;
        }
      }

      steps.push({
        t: curT++,
        caption: stepCaption,
        highlight: [thread.id],
        state: {
          stepIndex: i + 1,
          activeThreadIndex: thIdx,
          threadPointers: [...threadPointers],
          registers: { ...registers },
          memory: { ...memory },
          lastModifiedVar: lastMod,
          caption: stepCaption
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

    this.columnsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.columnsGroup.setAttribute('id', 'trace-columns');

    this.cursorsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.cursorsGroup.setAttribute('id', 'trace-cursors');

    this.memoryGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.memoryGroup.setAttribute('id', 'trace-memory');

    this.svg.append(this.columnsGroup, this.cursorsGroup, this.memoryGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: TraceState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.columnsGroup.innerHTML = '';
    this.cursorsGroup.innerHTML = '';
    this.memoryGroup.innerHTML = '';

    const numThreads = this.input.threads.length;
    const colWidth = Math.min(220, Math.floor(460 / numThreads));
    const startX = 20;
    const startY = 24;

    // 1. Render Instruction Columns for each thread with isomorphic [id^="bar-${thread.id}"]
    this.input.threads.forEach((th, tIdx) => {
      // Analogy Geometry: equal width card or customer token
      const aW = 160;
      const aX = startX + tIdx * (aW + 20);
      const aY = startY;

      // Mechanism Geometry: code column
      const mW = colWidth;
      const mX = startX + tIdx * (colWidth + 16);
      const mY = startY;

      const curX = aX + (mX - aX) * v;
      const curY = aY + (mY - aY) * v;
      const curW = aW + (mW - aW) * v;
      const curH = 150;

      const thGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      thGroup.setAttribute('id', `bar-${th.id}`);

      const colBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      colBg.setAttribute('x', String(curX));
      colBg.setAttribute('y', String(curY));
      colBg.setAttribute('width', String(curW));
      colBg.setAttribute('height', String(curH));
      colBg.setAttribute('rx', v < 0.5 ? '14' : '8');
      colBg.setAttribute('fill', 'var(--surface, #ffffff)');
      colBg.setAttribute('stroke', state.activeThreadIndex === tIdx ? 'var(--accent)' : 'var(--hairline)');
      colBg.setAttribute('stroke-width', state.activeThreadIndex === tIdx ? '2' : '1');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', String(curX + curW / 2));
      title.setAttribute('y', String(curY + 20));
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('font-size', '12');
      title.setAttribute('font-weight', '700');
      title.setAttribute('fill', th.color || 'var(--accent)');
      title.textContent = v < 0.5 && th.analogyName ? th.analogyName : th.name;

      thGroup.append(colBg, title);

      // Render instruction lines
      th.instructions.forEach((inst, iIdx) => {
        const lineY = curY + 45 + iIdx * 28;
        const isExecuted = state.threadPointers[tIdx] > iIdx;
        const isCurrent = state.threadPointers[tIdx] === iIdx + 1 && state.activeThreadIndex === tIdx;

        const lineBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        lineBg.setAttribute('x', String(curX + 8));
        lineBg.setAttribute('y', String(lineY - 14));
        lineBg.setAttribute('width', String(curW - 16));
        lineBg.setAttribute('height', '22');
        lineBg.setAttribute('rx', '4');
        lineBg.setAttribute('fill', isCurrent ? 'rgba(0, 102, 204, 0.12)' : isExecuted ? 'var(--surface-alt)' : 'transparent');

        const lineText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lineText.setAttribute('x', String(curX + 14));
        lineText.setAttribute('y', String(lineY + 1));
        lineText.setAttribute('font-family', 'var(--font-mono)');
        lineText.setAttribute('font-size', '10');
        lineText.setAttribute('fill', isCurrent ? 'var(--accent)' : isExecuted ? 'var(--ink)' : 'var(--muted)');
        lineText.textContent = inst;

        thGroup.append(lineBg, lineText);
      });

      this.columnsGroup.appendChild(thGroup);
    });

    // 2. Render Shared Memory & Register Board on the right
    const memStartX = 510;
    const memStartY = 24;
    const memWidth = 190;
    const memHeight = 150;

    const memBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    memBg.setAttribute('x', String(memStartX));
    memBg.setAttribute('y', String(memStartY));
    memBg.setAttribute('width', String(memWidth));
    memBg.setAttribute('height', String(memHeight));
    memBg.setAttribute('rx', '10');
    memBg.setAttribute('fill', 'var(--surface, #ffffff)');
    memBg.setAttribute('stroke', 'var(--hairline)');
    memBg.setAttribute('stroke-width', '1');

    const memTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    memTitle.setAttribute('x', String(memStartX + 14));
    memTitle.setAttribute('y', String(memStartY + 20));
    memTitle.setAttribute('font-size', '11');
    memTitle.setAttribute('font-weight', '700');
    memTitle.setAttribute('fill', 'var(--muted)');
    memTitle.textContent = v < 0.5 ? 'SHARED SLICES LEDGER' : 'SHARED MEMORY & REGISTERS';

    this.memoryGroup.append(memBg, memTitle);

    // Render Shared Memory Variables
    let varY = memStartY + 45;
    Object.entries(state.memory).forEach(([key, val]) => {
      const isMod = state.lastModifiedVar === key;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(memStartX + 14));
      t.setAttribute('y', String(varY));
      t.setAttribute('font-family', 'var(--font-mono)');
      t.setAttribute('font-size', '12');
      t.setAttribute('font-weight', '600');
      t.setAttribute('fill', isMod ? 'var(--accent)' : 'var(--ink)');
      t.textContent = `${key} = ${val}`;
      this.memoryGroup.appendChild(t);
      varY += 24;
    });

    // Render Registers
    Object.entries(state.registers).forEach(([rKey, rVal]) => {
      const isMod = state.lastModifiedVar === rKey;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(memStartX + 14));
      t.setAttribute('y', String(varY));
      t.setAttribute('font-family', 'var(--font-mono)');
      t.setAttribute('font-size', '11');
      t.setAttribute('fill', isMod ? 'var(--accent)' : 'var(--muted)');
      t.textContent = `${rKey} = ${rVal !== null ? rVal : '—'}`;
      this.memoryGroup.appendChild(t);
      varY += 22;
    });
  }

  public getThreads(): TraceThread[] {
    return this.input.threads;
  }
}
