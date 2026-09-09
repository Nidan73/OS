import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import { AnimationEngine } from '../../core/engine.js';
import {
  simulateCriticalSection,
  type CSGuarantee,
  type CSPhase,
  type CSResult,
  type CSStep
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// Layout (pure) — the carrying property of the morph is POSITION ITSELF:
// on the coach, horizontal position is geography (a cubicle barely wider than
// a person, a long aisle, a wide seat area) and vertical position is posture
// (standing in the aisle, sitting in a seat). In the protocol picture the
// four sections become equal-width lanes and vertical position becomes time.
// ─────────────────────────────────────────────────────────────────────────────

export const CS_CANVAS_W = 720;
export const CS_CANVAS_H = 320;
export const CS_LANE_W = 150;
export const CS_LANE_GAP = 20;
const CS_LANE_X0 = 30;

const CS_LANES: Array<{ phase: CSPhase; label: string }> = [
  { phase: 'entry', label: 'entry' },
  { phase: 'critical', label: 'critical' },
  { phase: 'exit', label: 'exit' },
  { phase: 'remainder', label: 'remainder' }
];

const CS_LANE_X: Record<CSPhase, number> = {
  entry: CS_LANE_X0,
  critical: CS_LANE_X0 + (CS_LANE_W + CS_LANE_GAP),
  exit: CS_LANE_X0 + 2 * (CS_LANE_W + CS_LANE_GAP),
  remainder: CS_LANE_X0 + 3 * (CS_LANE_W + CS_LANE_GAP)
};
export { CS_LANE_X };
export const CS_ROW_Y0 = 48;
export const CS_ROW_H = 10;

export const CS_PROCS = ['P1', 'P2', 'P3'] as const;

interface Box { x: number; y: number; w: number; h: number }

/**
 * Analogy layout, authored as a coach first (§3C.2a rule 1): a small cubicle,
 * a long aisle where the queue stands shoulder to shoulder, and a wide seat
 * area where remainder passengers sit lower down. Zone widths are UNEQUAL —
 * that is what a coach is like.
 */
const ANALOGY: Record<string, Box> = {
  cs: { x: 40, y: 70, w: 90, h: 56 },
  P1: { x: 485, y: 128, w: 36, h: 22 },
  P2: { x: 555, y: 128, w: 36, h: 22 },
  P3: { x: 625, y: 128, w: 36, h: 22 }
};

const ANALOGY_PHASE_POS: Record<CSPhase, { x: number; y: number; queue: boolean }> = {
  entry: { x: 150, y: 84, queue: true },
  critical: { x: 67, y: 86, queue: false },
  exit: { x: 137, y: 84, queue: false },
  remainder: { x: 485, y: 128, queue: false }
};

const CS_TOKEN_W = 44;
const CS_TOKEN_H = 12;

const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

/**
 * Geometry of every morphable entity at any view — pure, exported for tests.
 * state drives the analogy positions (queue order, seat index) and the
 * mechanism rows (which lane, which step).
 */
export function csGeometry(view: number, state: CSStep): Record<string, Box> {
  const v = Math.max(0, Math.min(1, view));
  const out: Record<string, Box> = {};

  out.cs = {
    x: lerp(ANALOGY.cs.x, CS_LANE_X.critical, v),
    y: lerp(ANALOGY.cs.y, CS_ROW_Y0 - 8, v),
    w: lerp(ANALOGY.cs.w, CS_LANE_W, v),
    h: lerp(ANALOGY.cs.h, state.history.length * CS_ROW_H + 16, v)
  };

  for (const p of CS_PROCS) {
    const phase = state.phases[p];
    const a = ANALOGY_PHASE_POS[phase];
    const ax = a.queue ? a.x + state.waiting.indexOf(p) * 34 : ANALOGY[p].x;
    const ay = a.y;
    const cellmates = CS_PROCS.filter(q => state.phases[q] === phase);
    const m: Box = {
      x: CS_LANE_X[phase] + 5 + cellmates.indexOf(p) * (CS_TOKEN_W + 4),
      y: CS_ROW_Y0 + state.step * CS_ROW_H,
      w: CS_TOKEN_W,
      h: CS_TOKEN_H
    };
    out[p] = {
      x: lerp(ax, m.x, v),
      y: lerp(ay, m.y, v),
      w: lerp(ANALOGY[p].w, m.w, v),
      h: lerp(ANALOGY[p].h, m.h, v)
    };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The computation (§2.1): buildSteps is a pure mapping over
// simulateCriticalSection(). Nothing on screen is typed.
// ─────────────────────────────────────────────────────────────────────────────

export interface CSInput {
  broken: CSGuarantee;
}

export function csSteps(input: CSInput): Step<CSStep>[] {
  return simulateCriticalSection(input.broken).steps.map(s => ({
    t: s.step,
    caption: s.caption,
    highlight: s.movedId ? [s.movedId] : [...CS_PROCS],
    state: s
  }));
}

export const CS_MODES: Array<{ id: CSGuarantee; label: string }> = [
  { id: 'none', label: '🟢 Protocol intact' },
  { id: 'mutex', label: '🔑 Ignore the lock' },
  { id: 'progress', label: '🚪 Leave the lock engaged' },
  { id: 'bounded', label: '✂️ Serve the regular first' }
];

// ─────────────────────────────────────────────────────────────────────────────

export class CriticalSectionEngine extends AnimationEngine<CSInput, CSStep> implements PlaygroundCapable {
  private result: CSResult | null = null;
  private sceneGroup!: SVGGElement;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: CSInput): Step<CSStep>[] {
    return csSteps(input);
  }

  public getResult(): CSResult {
    this.result ??= simulateCriticalSection(this.input.broken);
    return this.result;
  }

  private setBroken(broken: CSGuarantee): void {
    this.input.broken = broken;
    this.result = null;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.renderScoreboard();
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setBroken: (g: CSGuarantee) => this.setBroken(g),
      getBroken: () => this.input.broken,
      getResult: () => this.getResult()
    };
  }

  protected override mount(): void {
    this.container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${CS_CANVAS_W} ${CS_CANVAS_H}`);
    svg.setAttribute('width', '100%');
    svg.style.maxHeight = '300px';
    svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    svg.style.background = 'var(--surface-alt, #fafafc)';
    svg.style.border = '1px solid var(--hairline)';

    this.sceneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.sceneGroup.setAttribute('id', 'l11-scene');
    svg.appendChild(this.sceneGroup);
    this.container.appendChild(svg);
  }

  protected override render(state: CSStep, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.sceneGroup.innerHTML = '';
    const geometry = csGeometry(v, state);

    const scene = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (v < 0.5) {
      this.renderCoach(scene, state);
    } else {
      this.renderLanes(scene, state);
    }
    this.renderTokens(scene, state, v, geometry);
    this.sceneGroup.appendChild(scene);
  }

  private renderCoach(g: SVGGElement, state: CSStep): void {
    g.appendChild(this.rect(24, 54, 672, 120, 14, 'var(--surface, #fff)', 'var(--hairline)'));
    g.appendChild(this.rect(140, 66, 320, 96, 8, 'var(--surface-alt)', 'var(--hairline)'));
    g.appendChild(this.text(300, 170, 'the aisle', 9, 'var(--muted)'));

    for (let i = 0; i < 3; i++) {
      g.appendChild(this.rect(462 + i * 70, 122, 66, 30, 6, 'var(--surface-alt)', 'var(--hairline)'));
    }
    g.appendChild(this.text(600, 170, 'the seats', 9, 'var(--muted)'));
    g.appendChild(this.text(85, 140, 'occupied', 9, state.inside.length > 0 ? 'var(--accent)' : 'var(--muted)'));
  }

  private renderLanes(g: SVGGElement, state: CSStep): void {
    CS_LANES.forEach(({ phase, label }) => {
      const x = CS_LANE_X[phase];
      g.appendChild(this.rect(x, 40, CS_LANE_W, state.history.length * CS_ROW_H + 16, 8, 'var(--surface, #fff)', 'var(--hairline)'));
      g.appendChild(this.text(x + CS_LANE_W / 2, 32, label, 10, 'var(--muted)'));
    });

    state.history.forEach((phases, row) => {
      if (row === state.step) return;
      CS_PROCS.forEach(p => {
        const cellmates = CS_PROCS.filter(q => phases[q] === phases[p]);
        const ghost = this.rect(
          CS_LANE_X[phases[p]] + 5 + cellmates.indexOf(p) * (CS_TOKEN_W + 4),
          CS_ROW_Y0 + row * CS_ROW_H,
          CS_TOKEN_W, 9, 3, 'var(--ink)', 'transparent'
        );
        ghost.style.opacity = '0.12';
        g.appendChild(ghost);
      });
    });
  }

  private renderTokens(g: SVGGElement, state: CSStep, v: number, geometry: Record<string, Box>): void {
    const room = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    room.setAttribute('id', 'bar-cs');
    room.appendChild(this.rectAt(geometry.cs, 12, 'var(--surface)', state.inside.length > 1 ? 'var(--waiting)' : 'var(--accent)', state.inside.length > 0 ? 2 : 1));
    room.appendChild(this.text(geometry.cs.x + geometry.cs.w / 2, geometry.cs.y + geometry.cs.h / 2 + 3, v < 0.5 ? 'toilet' : 'critical', 9, 'var(--ink)'));
    g.appendChild(room);

    CS_PROCS.forEach(p => {
      const box = geometry[p];
      const moved = state.movedId === p;
      const starved = state.starved.includes(p);
      const token = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      token.setAttribute('id', `bar-${p}`);
      token.appendChild(this.rectAt(
        box, 6,
        moved ? 'rgba(0, 102, 204, 0.14)' : 'var(--surface)',
        moved ? 'var(--accent)' : starved ? 'var(--waiting)' : 'var(--hairline)',
        moved || starved ? 2 : 1
      ));
      token.appendChild(this.text(box.x + box.w / 2, box.y + box.h / 2 + 3, p, 9, moved ? 'var(--accent)' : 'var(--ink)'));
      g.appendChild(token);
    });
  }

  private rect(x: number, y: number, w: number, h: number, rx: number, fill: string, stroke: string): SVGRectElement {
    return this.rectAt({ x, y, w, h }, rx, fill, stroke, 1);
  }

  private rectAt(b: Box, rx: number, fill: string, stroke: string, strokeWidth: number): SVGRectElement {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', String(rx));
    r.setAttribute('fill', fill);
    r.setAttribute('stroke', stroke);
    r.setAttribute('stroke-width', String(strokeWidth));
    return r;
  }

  private text(x: number, y: number, content: string, size: number, fill: string): SVGTextElement {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', String(size));
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', fill);
    t.textContent = content;
    return t;
  }

  // ── Playground: break one promise, watch the computed failure ──

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Break one promise</h3>
      </div>
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        ${CS_MODES.map(m => `<button type="button" class="l11-mode" data-mode="${m.id}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${m.id === this.input.broken ? 'var(--accent)' : 'var(--hairline)'}; color: ${m.id === this.input.broken ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">${m.label}</button>`).join('')}
      </div>
    `;
    host.querySelectorAll('.l11-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setBroken((e.currentTarget as HTMLElement).dataset.mode as CSGuarantee);
        this.renderPlayground(host, this.scoreboardHost ?? undefined);
      });
    });
    this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const r = this.getResult();
    const badge = (ok: boolean, okText: string, badText: string) =>
      `<div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${ok ? 'rgba(8, 127, 91, 0.12)' : 'rgba(217, 119, 6, 0.12)'}; color: ${ok ? 'var(--running)' : 'var(--waiting)'}; border: 1px solid ${ok ? 'var(--running)' : 'var(--waiting)'};">${ok ? okText : badText}</div>`;

    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Guarantee check</h3>
        ${badge(!r.mutexViolated, '🛡️ One at a time', '⚠️ Two inside at once')}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Most inside at once</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; color: ${r.maxOccupancy > 1 ? 'var(--waiting)' : 'var(--running)'}; margin: 2px 0;">${r.maxOccupancy}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">over ${r.steps.length} steps</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Visits per neighbour</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
            ${CS_PROCS.map(p => `<div style="display: flex; justify-content: space-between;"><span style="font-weight: 600;">${p}</span><span>${r.entries[p]}</span></div>`).join('')}
          </div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The other promises</div>
          <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 3px;">
            ${badge(!r.progressViolated, 'Progress: the free room admits', 'Progress: empty room, queue stuck')}
            ${badge(r.starved.length === 0, 'Bounded waiting: FIFO kept', `Starved: ${r.starved.join(', ') || '—'} (${r.queueJumps} cuts)`)}
          </div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson11Input: CSInput = { broken: 'none' };

export const lesson11: Lesson<CSInput, CSStep> = {
  id: 11,
  lecture: 8,
  slug: 'lesson-11',
  title: 'What a Correct Solution Must Promise',
  absorbsUnits: [38, 39, 40, 41, 42, 43],
  slides: 'slides 9–12',
  engine: 'standalone',
  engineClass: CriticalSectionEngine,
  lensLabels: {
    analogy: '🚽 The coach toilet',
    mechanism: '⚙️ The four sections',
    analogyTitle: 'View as the single toilet on a long-haul coach',
    mechanismTitle: 'View as entry, critical, exit and remainder over time'
  },
  analogy: {
    domain: 'travel',
    text: 'The single toilet on a twelve-hour coach. Queue at the door, go in, slide the lock back on the way out, return to your seat. Everything about the problem follows from that room: it holds one person, the little lock is the only thing keeping it that way, and every promise is a promise about the queue at the door.'
  },
  concept: 'The critical-section problem asks for a protocol keeping three promises. Mutual exclusion: never two inside at once. Progress: if the section is free and processes are waiting, somebody gets in — a lock left engaged over an empty section breaks it. Bounded waiting: a limit on how many times others may go ahead of you — without it the system is technically making progress and someone still never gets in. Every failure here is computed from one simulation of the same doorway protocol with one promise disabled. A non-preemptive kernel sidesteps the problem by never stopping anyone mid-aisle — race-free by construction, at the cost of responsiveness.',
  morphReveals: 'On the coach, position is geography and posture: a cubicle barely wider than a person, a long aisle you stand in, seats you sit in lower down. In the protocol picture the four sections become equal lanes and height becomes time — size and posture stop mattering, and what is left is which section each process is in, and when.',
  morphMode: 'morph',
  analogyMapping: [
    'Toilet cubicle ➔ critical section',
    'Queue at the door ➔ entry section',
    'Sliding the lock back on the way out ➔ exit section',
    'Your seat ➔ remainder section',
    'The little lock ➔ the shared lock variable',
    'The three ways the coach fails ➔ the three computed guarantee violations'
  ],
  input: lesson11Input
};

export default lesson11;
