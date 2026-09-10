import { AnimationEngine } from '../core/engine.js';
import type { Step } from '../core/types.js';
import type { RagEdge, RagNode } from '../algorithms/deadlock.js';

// ── GraphEngine ─────────────────────────────────────────────────────────────
//
// Central engine for the Wave 3 resource-allocation graphs (L16, L17, L19,
// L21). Nodes, directed edges, request vs assignment vs claim types, cycle
// highlighting, edges appearing and disappearing across steps.
//
// Geometry contract (§3C.2a — the Wave 2 lesson): the engine computes
// mechanism widths from the graph itself, so no lesson can inherit a reskin.
// Analogy: every token the same width — bodies around a table, cars in a lot.
// Mechanism: width means holdings — a resource is as wide as its instances,
// a process as wide as what it currently holds. Both differ per entity, and
// process widths move with state as edges appear.

export interface GraphNodeInput {
  id: string;
  kind: 'process' | 'resource';
  /** Instance count for resources; ignored for processes. */
  instances?: number;
  label?: string;
  analogyLabel?: string;
  analogyX?: number;
  analogyY?: number;
}

export interface GraphEvent {
  caption: string;
  addEdge?: RagEdge;
  removeEdge?: { from: string; to: string };
  /** Ordered node ids of the highlighted cycle path. */
  setCycle?: string[];
  clearCycle?: boolean;
  activeNodes?: string[];
}

export interface GraphInput {
  nodes: GraphNodeInput[];
  initialEdges?: RagEdge[];
  events: GraphEvent[];
  analogy?: {
    domain: 'travel' | 'food' | 'friends';
    title?: string;
  };
}

export interface GraphState {
  edges: RagEdge[];
  /** Ordered node ids on the highlighted cycle; empty when none. */
  cycleIds: string[];
  activeNodeIds: string[];
}

const CANVAS_W = 720;
const CANVAS_H = 260;

// Analogy tokens: equal footprints, authored independently of the mechanism.
const ANALOGY_W = 64;
const ANALOGY_H = 40;

// Mechanism widths, computed from the graph — never typed per lesson.
const RES_BASE_W = 40;
const RES_PER_INSTANCE_W = 18;
const PROC_BASE_W = 56;
const PROC_PER_HOLD_W = 10;
const PROC_H = 34;
const RES_H = 44;

// Bipartite mechanism columns.
const PROC_CX = 140;
const RES_CX = 570;

export class GraphEngine extends AnimationEngine<GraphInput, GraphState> {
  protected svg!: SVGSVGElement;
  private edgesGroup!: SVGGElement;
  private nodesGroup!: SVGGElement;

  protected buildSteps(input: GraphInput): Step<GraphState>[] {
    if (!input.nodes || input.nodes.length === 0) {
      throw new Error('GraphEngine: input.nodes must not be empty');
    }
    const edges: RagEdge[] = (input.initialEdges ?? []).map((e) => ({ ...e }));
    let cycleIds: string[] = [];
    const steps: Step<GraphState>[] = [];
    let t = 0;

    const snapshot = (caption: string, highlight: string[]): Step<GraphState> => ({
      t: t++,
      caption: caption.slice(0, 120),
      highlight,
      state: {
        edges: edges.map((e) => ({ ...e })),
        cycleIds: [...cycleIds],
        activeNodeIds: highlight
      }
    });

    steps.push(snapshot('The system starts idle — nodes placed, no requests yet.', []));

    for (const ev of input.events ?? []) {
      if (ev.addEdge) edges.push({ ...ev.addEdge });
      if (ev.removeEdge) {
        const idx = edges.findIndex(
          (e) => e.from === ev.removeEdge?.from && e.to === ev.removeEdge?.to
        );
        if (idx >= 0) edges.splice(idx, 1);
      }
      if (ev.clearCycle) cycleIds = [];
      if (ev.setCycle) cycleIds = [...ev.setCycle];
      const hl = ev.setCycle ?? ev.activeNodes ?? [];
      steps.push(snapshot(ev.caption, hl));
    }

    return steps;
  }

  /** Playground seam: replace the event script and rebuild (cf. QueueEngine). */
  public setEvents(events: GraphEvent[]): void {
    this.input.events = events;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
  }

  public getNodes(): RagNode[] {
    return this.input.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    }));
  }

  /** Holdings per process in a state — the quantity process widths encode. */
  public holdingsOf(state: GraphState): Map<string, number> {
    const held = new Map<string, number>();
    for (const e of state.edges) {
      if (e.kind !== 'assignment') continue;
      held.set(e.to, (held.get(e.to) ?? 0) + 1);
    }
    return held;
  }

  protected mechanismBox(
    node: GraphNodeInput,
    index: number,
    count: number,
    held: number
  ): { x: number; y: number; w: number; h: number } {
    const colX = node.kind === 'process' ? PROC_CX : RES_CX;
    const gap = Math.min(64, 180 / Math.max(1, count));
    const y = 46 + index * gap;
    const w =
      node.kind === 'resource'
        ? RES_BASE_W + RES_PER_INSTANCE_W * (node.instances ?? 1)
        : PROC_BASE_W + PROC_PER_HOLD_W * held;
    const h = node.kind === 'resource' ? RES_H : PROC_H;
    return { x: colX - w / 2, y, w, h };
  }

  protected analogyBox(node: GraphNodeInput, index: number): { x: number; y: number; w: number; h: number } {
    const x = node.analogyX ?? (60 + (index % 4) * 155);
    const y = node.analogyY ?? (50 + Math.floor(index / 4) * 110);
    return { x, y, w: ANALOGY_W, h: ANALOGY_H };
  }

  protected mount(): void {
    this.container.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
    this.svg.setAttribute('width', '100%');
    this.svg.style.maxHeight = '300px';
    this.svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.svg.style.background = 'var(--surface-alt, #fafafc)';
    this.svg.style.border = '1px solid var(--hairline)';

    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `
      <marker id="g-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="context-stroke" stroke-width="1.5"/>
      </marker>`;
    this.svg.appendChild(defs);

    this.edgesGroup = document.createElementNS(svgNS, 'g');
    this.edgesGroup.setAttribute('id', 'graph-edges');
    this.nodesGroup = document.createElementNS(svgNS, 'g');
    this.nodesGroup.setAttribute('id', 'graph-nodes');
    this.svg.append(this.edgesGroup, this.nodesGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: GraphState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    const svgNS = 'http://www.w3.org/2000/svg';
    this.edgesGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';

    const held = this.holdingsOf(state);
    const procs = this.input.nodes.filter((n) => n.kind === 'process');
    const res = this.input.nodes.filter((n) => n.kind === 'resource');

    interface Placed { cx: number; cy: number; w: number; h: number }
    const placed = new Map<string, Placed>();
    const lerp = (a: number, b: number): number => a + (b - a) * v;

    this.input.nodes.forEach((node, idx) => {
      const siblings = node.kind === 'process' ? procs : res;
      const sibIdx = siblings.findIndex((s) => s.id === node.id);
      const m = this.mechanismBox(node, sibIdx, siblings.length, held.get(node.id) ?? 0);
      const a = this.analogyBox(node, idx);
      const w = lerp(a.w, m.w);
      const h = lerp(a.h, m.h);
      const cx = lerp(a.x + a.w / 2, m.x + m.w / 2);
      const cy = lerp(a.y + a.h / 2, m.y + m.h / 2);
      placed.set(node.id, { cx, cy, w, h });

      const inCycle = state.cycleIds.includes(node.id);
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('id', `bar-${node.id}`);

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(cx - w / 2));
      rect.setAttribute('y', String(cy - h / 2));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', node.kind === 'process' ? String(h / 2) : '8');
      rect.setAttribute('fill', inCycle ? 'rgba(0, 102, 204, 0.10)' : 'var(--surface, #ffffff)');
      rect.setAttribute('stroke', inCycle ? 'var(--accent)' : 'var(--hairline)');
      rect.setAttribute('stroke-width', inCycle ? '2' : '1');
      g.appendChild(rect);

      if (node.kind === 'resource') {
        const instances = node.instances ?? 1;
        const heldCount = state.edges.filter(
          (e) => e.kind === 'assignment' && e.from === node.id
        ).length;
        const dotR = 3.5;
        const span = Math.min(w - 12, instances * 14);
        for (let d = 0; d < instances; d++) {
          const dot = document.createElementNS(svgNS, 'circle');
          const dx =
            instances === 1 ? cx : cx - span / 2 + (span * d) / Math.max(1, instances - 1);
          dot.setAttribute('cx', String(dx));
          dot.setAttribute('cy', String(cy + h / 2 - 10));
          dot.setAttribute('r', String(dotR));
          dot.setAttribute('fill', d < heldCount ? 'var(--running)' : 'var(--surface)');
          dot.setAttribute('stroke', 'var(--ink-2)');
          dot.setAttribute('stroke-width', '1');
          g.appendChild(dot);
        }
      }

      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', String(cx));
      label.setAttribute('y', String(node.kind === 'resource' ? cy - 4 : cy + 4));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '11');
      label.setAttribute('font-weight', '700');
      label.setAttribute('fill', inCycle ? 'var(--accent)' : 'var(--ink)');
      label.textContent =
        v < 0.5 && node.analogyLabel ? node.analogyLabel : (node.label ?? node.id);
      g.appendChild(label);

      this.nodesGroup.appendChild(g);
    });

    const cycleEdges = new Set<string>();
    for (let i = 0; i < state.cycleIds.length; i++) {
      const a = state.cycleIds[i];
      const b = state.cycleIds[(i + 1) % state.cycleIds.length];
      cycleEdges.add(`${a}>${b}`);
      cycleEdges.add(`${b}>${a}`);
    }

    state.edges.forEach((e, i) => {
      const from = placed.get(e.from);
      const to = placed.get(e.to);
      if (!from || !to) return;
      const dx = to.cx - from.cx;
      const dy = to.cy - from.cy;
      const len = Math.max(1, Math.hypot(dx, dy));
      // Trim to the box boundaries so arrowheads land on edges, not centers.
      const trimFrom = Math.min(from.w, from.h) / 2;
      const trimTo = Math.min(to.w, to.h) / 2 + 4;
      const x1 = from.cx + (dx / len) * trimFrom;
      const y1 = from.cy + (dy / len) * trimFrom;
      const x2 = to.cx - (dx / len) * trimTo;
      const y2 = to.cy - (dy / len) * trimTo;

      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('id', `edge-${i}`);
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      const onCycle = cycleEdges.has(`${e.from}>${e.to}`);
      line.setAttribute('stroke', onCycle ? 'var(--accent)' : e.kind === 'assignment' ? 'var(--running)' : e.kind === 'request' ? 'var(--waiting)' : 'var(--muted)');
      line.setAttribute('stroke-width', onCycle ? '2.5' : '1.5');
      if (e.kind === 'claim') line.setAttribute('stroke-dasharray', '5,4');
      line.setAttribute('marker-end', 'url(#g-arrow)');
      this.edgesGroup.appendChild(line);
    });
  }
}
