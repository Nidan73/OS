import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import { AnimationEngine } from '../../core/engine.js';
import {
  simulatePeterson,
  simulateReorderingOutput,
  type PublicationStep,
  type PublicationResult
} from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// Layout (pure) — the carrying property of the morph is VERTICAL POSITION.
// In the kitchen, where father's two acts sit — the call high, the dish low —
// is furniture; nothing about order can be read off it, and
// the furniture does not move when the hardware reorders. In the machine,
// vertical position is execution order: toggling the reorder physically
// swaps the two rows, and the printed number flips with them.
// ─────────────────────────────────────────────────────────────────────────────

export const P12_CANVAS_W = 720;
export const P12_CANVAS_H = 260;

// DENSITY (Task A audit): correct at 6 — the print test is six discrete
// mechanism events (open frame, x = 100, flag = true, spin pass, print x,
// computed verdict). The doorway protocol's own interleaving (flag[0], turn,
// flag[1], entries, spins, exits) is a different mechanism — Peterson's proof,
// told next lesson's way — and folding it in would double-count one lesson as
// two. Inventing a seventh beat (e.g. splitting the open frame) would be
// padding: the given example of a legitimate "correct at this count" answer.
export interface PetersonInput {
  reordered: boolean;
}

interface Box { x: number; y: number; w: number; h: number }

const ANALOGY: Record<string, Box> = {
  T1: { x: 470, y: 92, w: 150, h: 56 },
  T2: { x: 80, y: 150, w: 150, h: 56 },
  door: { x: 290, y: 70, w: 140, h: 110 },
  msg: { x: 120, y: 36, w: 150, h: 30 },
  pack: { x: 60, y: 205, w: 160, h: 30 }
};

const MECH_COL: Record<'T1' | 'T2', number> = { T1: 60, T2: 310 };

const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

/** T2's two acts, in the order the machine executes them for this mode. */
export function actRows(reordered: boolean): { msg: number; pack: number; print: number } {
  return reordered ? { msg: 0, pack: 1, print: 1 } : { msg: 1, pack: 0, print: 2 };
}

/**
 * Geometry of every morphable entity at any view — pure, exported for tests.
 * The analogy positions are FIXED: the room's furniture never reorders.
 * The mechanism rows follow the toggle.
 */
export function petersonGeometry(view: number, reordered: boolean): Record<string, Box> {
  const v = Math.max(0, Math.min(1, view));
  const rows = actRows(reordered);
  const mech: Record<string, Box> = {
    T1: { x: MECH_COL.T1, y: 12, w: 200, h: 24 },
    T2: { x: MECH_COL.T2, y: 12, w: 200, h: 24 },
    door: { x: 560, y: 36, w: 130, h: 160 },
    msg: { x: MECH_COL.T2 + 5, y: 44 + rows.msg * 34, w: 190, h: 28 },
    pack: { x: MECH_COL.T2 + 5, y: 44 + rows.pack * 34, w: 190, h: 28 }
  };
  const out: Record<string, Box> = {};
  for (const key of Object.keys(ANALOGY)) {
    const a = ANALOGY[key];
    const m = mech[key];
    out[key] = {
      x: lerp(a.x, m.x, v),
      y: lerp(a.y, m.y, v),
      w: lerp(a.w, m.w, v),
      h: lerp(a.h, m.h, v)
    };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The computation (§2.1): buildSteps maps simulatePeterson() purely; the
// scoreboard's printed number comes from simulateReorderingOutput().
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicationState extends PublicationStep {
  bothInside: boolean;
}

/**
 * The timeline IS the print test: the toggled reorder re-orders the very
 * steps the learner scrubs through. The doorway protocol's verdict travels
 * alongside as bothInside, computed by simulatePeterson for this mode.
 */
export function publicationSteps(input: PetersonInput): Step<PublicationState>[] {
  const bothInside = simulatePeterson(input.reordered).mutualExclusionViolated;
  const pub = simulateReorderingOutput(input.reordered);
  const open: Step<PublicationState> = {
    t: 0,
    caption: 'Mother and father share one kitchen doorway: father calls while cooking, mother waits to serve.',
    highlight: ['T1', 'T2'],
    state: { ...pub.steps[0], step: 0, printed: null, caption: 'The room before the test.' , bothInside }
  };
  const verdictText = pub.flipped
    ? `Printed ${pub.output}, expected ${pub.expectedOutput} — the announcement overtook the act.`
    : `Printed ${pub.output} as announced — the fact landed before the flag.`;
  const verdict: Step<PublicationState> = {
    t: pub.steps.length + 1,
    caption: verdictText,
    highlight: ['T1', 'T2'],
    state: { ...pub.steps[pub.steps.length - 1], step: pub.steps.length + 1, caption: verdictText, bothInside }
  };
  return [
    open,
    ...pub.steps.map(s => ({
      t: s.step,
      caption: s.caption,
      highlight: [s.actorId],
      state: { ...s, bothInside }
    })),
    verdict
  ];
}

const t1WaitText = (reordered: boolean): string =>
  reordered
    ? 'flag[1] is up but turn says go — walks in'
    : 'wants in — sees flag[1] down or turn';
const t1ExitText = 'exits, flag down';

export class PetersonEngine extends AnimationEngine<PetersonInput, PublicationState> implements PlaygroundCapable {
  private publication: PublicationResult | null = null;
  private sceneGroup!: SVGGElement;
  private scoreboardHost: HTMLElement | null = null;

  protected override buildSteps(input: PetersonInput): Step<PublicationState>[] {
    return publicationSteps(input);
  }

  public getPublication(): PublicationResult {
    this.publication ??= simulateReorderingOutput(this.input.reordered);
    return this.publication;
  }

  public setReordered(reordered: boolean): void {
    this.input.reordered = reordered;
    this.publication = null;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.renderScoreboard();
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setReordered: (r: boolean) => this.setReordered(r),
      getReordered: () => this.input.reordered,
      getPublication: () => this.getPublication(),
      getResult: () => simulatePeterson(this.input.reordered)
    };
  }

  protected override mount(): void {
    this.container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${P12_CANVAS_W} ${P12_CANVAS_H}`);
    svg.setAttribute('width', '100%');
    svg.style.maxHeight = '300px';
    svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    svg.style.background = 'var(--surface-alt, #fafafc)';
    svg.style.border = '1px solid var(--hairline)';

    this.sceneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.sceneGroup.setAttribute('id', 'l12-scene');
    svg.appendChild(this.sceneGroup);
    this.container.appendChild(svg);
  }

  protected override render(state: PublicationState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.sceneGroup.innerHTML = '';
    const geometry = petersonGeometry(v, this.input.reordered);
    const scene = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // The room: floor and doorway (analogy) / thread columns and shared panel.
    if (v < 0.5) {
      scene.appendChild(this.rect(20, 60, 680, 150, 14, 'var(--surface, #fff)', 'var(--hairline)'));
    } else {
      scene.appendChild(this.rect(MECH_COL.T1 - 10, 36, 220, 150, 10, 'var(--surface, #fff)', 'var(--hairline)'));
      scene.appendChild(this.rect(MECH_COL.T2 - 10, 36, 220, 150, 10, 'var(--surface, #fff)', 'var(--hairline)'));
    }

    // Door → shared variables panel.
    const door = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    door.setAttribute('id', 'bar-door');
    door.appendChild(this.rectAt(geometry.door, 12, 'var(--surface)', state.bothInside ? 'var(--waiting)' : 'var(--accent)', state.bothInside ? 2 : 1));
    const doorLabel = state.bothInside
      ? 'BOTH INSIDE'
      : v < 0.5
        ? state.actorId === 'T1' && state.action === 'print x' ? 'occupied' : 'the door'
        : 'shared: flag · turn · x';
    door.appendChild(this.text(geometry.door.x + geometry.door.w / 2, geometry.door.y + geometry.door.h / 2 + 3, doorLabel, 10, state.bothInside ? 'var(--waiting)' : 'var(--ink)'));
    scene.appendChild(door);

    // The two parents → the two thread headers.
    (['T1', 'T2'] as const).forEach((tid, tIdx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', `bar-${tid}`);
      const box = geometry[tid];
      const active = state.actorId === tid;
      g.appendChild(this.rectAt(box, 10, active ? 'rgba(0, 102, 204, 0.12)' : 'var(--surface-alt)', active ? 'var(--accent)' : 'var(--hairline)', active ? 2 : 1));
      const label = v < 0.5
        ? (tIdx === 0 ? 'Mother · at the door' : 'Father · cooking')
        : tid === 'T1'
          ? 'T1 · spins, then prints'
          : 'T2 · stores, then raises flag';
      g.appendChild(this.text(box.x + box.w / 2, box.y + box.h / 2 + 3, label, 10, active ? 'var(--accent)' : 'var(--ink)'));
      scene.appendChild(g);
    });

    // Father's two acts → T2's two instruction rows. The toggle swaps them.
    const rows = actRows(this.input.reordered);
    const acts: Array<{ key: 'msg' | 'pack'; row: number; analogy: string; mech: string }> = [
      { key: 'msg', row: rows.msg, analogy: 'the call: "Food is ready!"', mech: 'flag = true' },
      { key: 'pack', row: rows.pack, analogy: 'the dish, still on the flame', mech: 'x = 100' }
    ];
    for (const act of acts) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', `bar-${act.key}`);
      const box = geometry[act.key];
      const current = state.action === act.mech;
      g.appendChild(this.rectAt(box, 8, current ? 'rgba(0, 102, 204, 0.12)' : 'var(--surface)', current ? 'var(--accent)' : 'var(--hairline)', current ? 2 : 1));
      g.appendChild(this.text(box.x + box.w / 2, box.y + box.h / 2 + 3, v < 0.5 ? act.analogy : act.mech, 10, current ? 'var(--accent)' : 'var(--ink)'));
      scene.appendChild(g);
    }

    // Mother's side (paint): the spin, the print, the exit.
    const t1RowY = 44 + rows.print * 34;
    if (v < 0.5) {
      scene.appendChild(this.text(geometry.T1.x + geometry.T1.w / 2, geometry.T1.y + geometry.T1.h + 14, 'waiting for the call', 9, 'var(--muted)'));
      scene.appendChild(this.text(geometry.T1.x + geometry.T1.w / 2, geometry.T1.y + geometry.T1.h + 28, 'serves what was announced', 9, 'var(--muted)'));
    } else {
      const printing = state.action === 'print x';
      scene.appendChild(this.text(MECH_COL.T1 + 100, 60, t1WaitText(this.input.reordered), 9, 'var(--muted)'));
      scene.appendChild(this.text(MECH_COL.T1 + 100, t1RowY + 9, `print x  (${state.printed ?? state.x})`, 10, printing ? 'var(--accent)' : 'var(--ink)'));
      scene.appendChild(this.text(MECH_COL.T1 + 100, 130, t1ExitText, 9, 'var(--muted)'));
    }

    this.sceneGroup.appendChild(scene);
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

  // ── Playground: the reorder toggle and the computed print test ──

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">The print test</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button type="button" class="l12-mode" data-reordered="false" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${!this.input.reordered ? 'var(--accent)' : 'var(--hairline)'}; color: ${!this.input.reordered ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">🟢 Called after cooking</button>
          <button type="button" class="l12-mode" data-reordered="true" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid ${this.input.reordered ? 'var(--accent)' : 'var(--hairline)'}; color: ${this.input.reordered ? 'var(--accent)' : 'var(--ink)'}; cursor: pointer;">⚠️ Hardware reorders the call</button>
        </div>
      </div>
    `;
    host.querySelectorAll('.l12-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setReordered((e.currentTarget as HTMLElement).dataset.reordered === 'true');
        this.renderPlayground(host, this.scoreboardHost ?? undefined);
      });
    });
    this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const pub = this.getPublication();
    const peterson = simulatePeterson(this.input.reordered);
    const flipped = pub.flipped;
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">What got printed</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${flipped ? 'rgba(217, 119, 6, 0.12)' : 'rgba(8, 127, 91, 0.12)'}; color: ${flipped ? 'var(--waiting)' : 'var(--running)'}; border: 1px solid ${flipped ? 'var(--waiting)' : 'var(--running)'};">${flipped ? '⚠️ Output flipped' : '🟢 Output as announced'}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
        <div style="padding: 5px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Printed this run</div>
          <div style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; color: ${flipped ? 'var(--waiting)' : 'var(--running)'}; margin: 0;">${pub.output}</div>
          <div style="font-size: 0.68rem; color: var(--muted); font-family: var(--font-mono);">expected ${pub.expectedOutput}</div>
        </div>
        <div style="padding: 5px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Announcement vs fact</div>
          <div style="font-family: var(--font-mono); font-size: 0.66rem; margin-top: 2px; display: flex; flex-direction: column; gap: 1px; line-height: 1.25;">
            ${pub.steps.map(s => `<div style="display: flex; justify-content: space-between; gap: 6px;"><span>${s.actorId}: ${s.action}</span><span style="font-weight: 700; white-space: nowrap;">x=${s.x}${s.printed !== null ? ` → ${s.printed}` : ''}</span></div>`).join('')}
          </div>
        </div>
        <div style="padding: 5px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">The doorway protocol</div>
          <div style="padding: 2px 0; font-size: 0.72rem; font-weight: 600; color: ${peterson.mutualExclusionViolated ? 'var(--waiting)' : 'var(--running)'};">${peterson.mutualExclusionViolated ? '⚠️ Both parents inside at once' : '🛡️ One parent at a time'}</div>
          <div style="font-size: 0.68rem; color: var(--muted); margin-top: 2px; line-height: 1.3;">Under sequential consistency the three promises hold — the slide traces every interleaving. Reordering is what breaks it.</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson12Input: PetersonInput = { reordered: false };

export const lesson12: Lesson<PetersonInput, PublicationState> = {
  id: 12,
  lecture: 8,
  slug: 'lesson-12',
  title: 'Peterson’s Solution, and Why Hardware Breaks It',
  absorbsUnits: [44, 45, 46],
  slides: 'slides 13–18',
  engine: 'standalone',
  engineClass: PetersonEngine,
  lensLabels: {
    analogy: '🚪 Mother and father at the door',
    mechanism: '⚙️ Flags, turn and the print test',
    analogyTitle: 'View as mother and father waving each other through',
    mechanismTitle: 'View as the flag and turn protocol over time'
  },
  analogy: {
    domain: 'friends',
    text: 'Mother and father meet at the narrow kitchen doorway, each waving the other through: a raised hand meaning "I want in," then "you first." Before dinner, father calls out "Food is ready!" while the dish is still on the flame — and mother acts on the announcement, not the fact.'
  },
  concept: 'Peterson\u2019s solution lets two processes share a doorway with one shared flag each and a single turn variable: announce "I want in" (flag[i] = true), then defer (turn = j), then wait while the other wants in and it is their turn. Walking every interleaving proves all three promises hold — mutual exclusion, progress and bounded waiting. The proof assumes stores land in the order written. Processors and compilers reorder independent operations: in a single thread the result is always the same, but across threads the announcement can overtake the act, and the door stands open for both. The print test shows it: the flag rises before the store lands, and what gets printed flips.',
  morphReveals: 'In the kitchen, where the two acts sit — the call high, the dish low — is furniture; no order can be read off it, and it does not move when the hardware reorders. In the machine, vertical position is execution order: flip to reordered and the two rows physically swap, the call now precedes the cooking, and the printed number flips with them.',
  morphMode: 'morph',
  analogyMapping: [
    'Mother waiting at the door ➔ thread 1 spinning on flag[1] and turn',
    'Father, and the two acts of cooking ➔ thread 2\u2019s two stores: x = 100, then flag = true',
    'The call "Food is ready!" ➔ flag = true (the announcement)',
    'The dish still on the flame ➔ x = 100 (the fact, still in flight when reordered)',
    'Waving the other through ➔ turn = j',
    'Both inside the doorway ➔ mutual exclusion violated by reordering'
  ],
  input: lesson12Input
};

export default lesson12;
