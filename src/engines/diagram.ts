import { AnimationEngine } from '../core/engine.js';
import type { PlaygroundCapable } from '../core/types.js';
import type { Step } from '../core/types.js';

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  category?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Analogy-specific layout parameters
  analogyX?: number;
  analogyY?: number;
  analogyWidth?: number;
  analogyHeight?: number;
  analogyLabel?: string;
  analogySublabel?: string;
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface DiagramReveal {
  caption: string;
  highlightNodeIds: string[];
  activeNodeIds?: string[];
  connectionIds?: string[];
  badgeText?: string;
  metrics?: Record<string, string | number>;
}

export interface DiagramInput {
  title?: string;
  nodes: DiagramNode[];
  connections?: DiagramConnection[];
  reveals: DiagramReveal[];
  analogy?: {
    domain: 'travel' | 'food' | 'friends';
    title?: string;
    subtitle?: string;
  };
}

export interface DiagramState {
  stepIndex: number;
  activeNodeIds: string[];
  highlightNodeIds: string[];
  activeConnectionIds: string[];
  metrics: Record<string, string | number>;
  caption: string;
}

export class DiagramEngine extends AnimationEngine<DiagramInput, DiagramState> implements PlaygroundCapable {
  renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    if ((this.input as any).renderPlayground) {
      (this.input as any).renderPlayground(host, scoreboardHost, this);
    }
  }
  protected svg!: SVGSVGElement;
  private connectionsGroup!: SVGGElement;
  private nodesGroup!: SVGGElement;
  private overlayGroup!: SVGGElement;

  private readonly canvasWidth = 720;
  private readonly canvasHeight = 260;

  protected buildSteps(input: DiagramInput): Step<DiagramState>[] {
    if (!input.nodes || input.nodes.length === 0) {
      throw new Error('DiagramEngine: input.nodes must not be empty');
    }
    const reveals = input.reveals && input.reveals.length > 0 ? input.reveals : [
      { caption: 'System diagram overview.', highlightNodeIds: input.nodes.map(n => n.id) }
    ];

    const allNodeIds = input.nodes.map(n => n.id);
    const steps: Step<DiagramState>[] = [];

    for (let i = 0; i < reveals.length; i++) {
      const rev = reveals[i];
      const active = rev.activeNodeIds ?? allNodeIds;
      steps.push({
        t: i * 1.0,
        caption: rev.caption,
        highlight: rev.highlightNodeIds,
        state: {
          stepIndex: i,
          activeNodeIds: active,
          highlightNodeIds: rev.highlightNodeIds || [],
          activeConnectionIds: rev.connectionIds || [],
          metrics: rev.metrics || {},
          caption: rev.caption
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

    this.connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.connectionsGroup.setAttribute('id', 'diagram-connections');

    this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodesGroup.setAttribute('id', 'diagram-nodes');

    this.overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.overlayGroup.setAttribute('id', 'diagram-overlay');

    this.svg.append(this.connectionsGroup, this.nodesGroup, this.overlayGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: DiagramState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.connectionsGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';
    this.overlayGroup.innerHTML = '';

    const nodePositions: Record<string, { cx: number; cy: number; width: number; height: number }> = {};

    // 1. Render Isomorphic Nodes: [id^="bar-${node.id}"]
    for (const node of this.input.nodes) {
      // Analogy Geometry:
      const aX = node.analogyX ?? node.x;
      const aY = node.analogyY ?? node.y;
      const aW = node.analogyWidth ?? node.width;
      const aH = node.analogyHeight ?? node.height;

      // Mechanism Geometry:
      const mX = node.x;
      const mY = node.y;
      const mW = node.width;
      const mH = node.height;

      // Interpolated:
      const curX = aX + (mX - aX) * v;
      const curY = aY + (mY - aY) * v;
      const curW = aW + (mW - aW) * v;
      const curH = aH + (mH - aH) * v;

      nodePositions[node.id] = {
        cx: curX + curW / 2,
        cy: curY + curH / 2,
        width: curW,
        height: curH
      };

      const isHighlighted = state.highlightNodeIds.includes(node.id);
      const isActive = state.activeNodeIds.includes(node.id);

      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('id', `bar-${node.id}`);
      nodeGroup.style.opacity = isActive ? '1' : '0.35';
      nodeGroup.style.transition = 'opacity var(--dur-fast) var(--ease)';

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(curX));
      rect.setAttribute('y', String(curY));
      rect.setAttribute('width', String(curW));
      rect.setAttribute('height', String(curH));
      rect.setAttribute('rx', v < 0.5 ? '12' : '6');
      rect.setAttribute('fill', isHighlighted ? 'var(--surface, #ffffff)' : 'var(--canvas-parchment, #f5f5f7)');
      rect.setAttribute('stroke', isHighlighted ? 'var(--accent, #0066cc)' : 'var(--hairline, #e0e0e0)');
      rect.setAttribute('stroke-width', isHighlighted ? '2' : '1');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(curX + curW / 2));
      label.setAttribute('y', String(curY + curH / 2 - (node.sublabel ? 3 : -4)));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '11.5');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', isHighlighted ? 'var(--accent, #0066cc)' : 'var(--ink, #1d1d1f)');
      label.textContent = v < 0.5 && node.analogyLabel ? node.analogyLabel : node.label;

      nodeGroup.append(rect, label);

      if (node.sublabel || node.analogySublabel) {
        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub.setAttribute('x', String(curX + curW / 2));
        sub.setAttribute('y', String(curY + curH / 2 + 13));
        sub.setAttribute('text-anchor', 'middle');
        sub.setAttribute('font-size', '9.5');
        sub.setAttribute('font-family', 'var(--font-mono, monospace)');
        sub.setAttribute('fill', 'var(--muted, #7a7a7a)');
        sub.textContent = v < 0.5 && node.analogySublabel ? node.analogySublabel : (node.sublabel ?? '');
        nodeGroup.appendChild(sub);
      }

      this.nodesGroup.appendChild(nodeGroup);
    }

    // 2. Render Connections
    if (this.input.connections) {
      for (const conn of this.input.connections) {
        const fromPos = nodePositions[conn.from];
        const toPos = nodePositions[conn.to];
        if (!fromPos || !toPos) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(fromPos.cx));
        line.setAttribute('y1', String(fromPos.cy));
        line.setAttribute('x2', String(toPos.cx));
        line.setAttribute('y2', String(toPos.cy));
        line.setAttribute('stroke', 'var(--hairline, #e0e0e0)');
        line.setAttribute('stroke-width', '1.5');
        if (conn.dashed) {
          line.setAttribute('stroke-dasharray', '4,4');
        }
        this.connectionsGroup.appendChild(line);
      }
    }
  }

  public getNodes(): DiagramNode[] {
    return this.input.nodes;
  }
}
