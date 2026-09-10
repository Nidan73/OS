import type { Lesson, PlaygroundCapable } from '../../core/types.js';
import type { Step } from '../../core/types.js';
import { TraceEngine, type TraceInput, type TraceState } from '../../engines/trace.js';
import { simulateRaceCondition, RACE_INSTRUCTIONS, type RaceSimulationResult } from '../../algorithms/synchronization.js';

// ─────────────────────────────────────────────────────────────────────────────
// Layout (pure) — the carrying property of the morph is VERTICAL POSITION.
//
// View 0 (analogy): two friends act around a plate at the same moment. Each
// card's position is place, not order — deliberately, the three acts of each
// friend are laid out top-to-bottom in REVERSE story order, so vertical
// position provably carries no time information in the analogy.
//
// View 1 (mechanism): vertical position becomes WHEN. The same six acts are
// sorted into the one order they actually executed in; the horizontal split
// becomes whose register holds the value. The plate becomes shared memory.
// ─────────────────────────────────────────────────────────────────────────────

// DENSITY (Task A audit): correct at 7 — the initial frame plus one beat per
// register-level instruction (read, modify, write × two threads = six). The
// slide's S0–S5 trace is the complete mechanism; a serial order or a different
// scenario changes the outcome, not the event count — told by the playground,
// not by extra beats. Declaring is the brief's own legitimate answer here:
// inventing a seventh instruction would falsify the trace.
export const CANVAS_W = 720;
export const CANVAS_H = 260;
export const ROW_BASE = 44;
export const ROW_H = 34;
export const CARD_W = 170;
export const CARD_H = 28;
export const COL_X: Record<'T1' | 'T2', number> = { T1: 70, T2: 320 };

interface Box { x: number; y: number; w: number; h: number }

/**
 * Analogy layout, authored independently of the mechanism (§3C.2a rule 1):
 * friends stand at arbitrary spots, act cards are scattered around the plate
 * with equal footprints. Position here is PLACE, and carries no order.
 */
const ANALOGY_LAYOUT: Record<string, Box> = {
  'friend-T1': { x: 150, y: 16, w: 130, h: 26 },
  'friend-T2': { x: 430, y: 150, w: 130, h: 26 },
  'plate': { x: 300, y: 88, w: 120, h: 84 },
  // Story order runs act0 -> act2, but y runs 190 -> 120 -> 40: place, not time.
  'act-T1-0': { x: 40, y: 190, w: CARD_W, h: CARD_H },
  'act-T1-1': { x: 110, y: 120, w: CARD_W, h: CARD_H },
  'act-T1-2': { x: 50, y: 40, w: CARD_W, h: CARD_H },
  'act-T2-0': { x: 520, y: 180, w: CARD_W, h: CARD_H },
  'act-T2-1': { x: 540, y: 100, w: CARD_W, h: CARD_H },
  'act-T2-2': { x: 470, y: 30, w: CARD_W, h: CARD_H }
};

/**
 * actOrder maps each act (threadIndex, instructionIndex) to its slot in the
 * execution sequence — computed from the interleaving, never stored.
 */
export function actOrder(interleaving: number[]): number[][] {
  const order = [[-1, -1, -1], [-1, -1, -1]];
  const seen = [0, 0];
  for (const tIdx of interleaving) {
    if (tIdx !== 0 && tIdx !== 1) continue;
    const instr = seen[tIdx]++;
    if (instr < 3) order[tIdx][instr] = seen[0] + seen[1] - 1;
  }
  return order;
}

/** Mechanism layout: x = whose register, y = when (slot in the sequence). */
function mechanismBox(key: string, order: number[][]): Box {
  if (key === 'plate') return { x: 540, y: 20, w: 160, h: 190 };
  if (key === 'friend-T1') return { x: 60, y: 12, w: 200, h: 26 };
  if (key === 'friend-T2') return { x: 310, y: 12, w: 200, h: 26 };
  const [, t, i] = key.match(/^act-(T1|T2)-(\d)$/) ?? [];
  const threadIdx = t === 'T1' ? 0 : 1;
  const slot = order[threadIdx]?.[Number(i)] ?? 0;
  return { x: COL_X[t as 'T1' | 'T2'], y: ROW_BASE + slot * ROW_H, w: 190, h: CARD_H };
}

const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

/**
 * Geometry of every morphable entity at any view — pure, exported for tests.
 * Every coordinate interpolates linearly and monotonically between extremes.
 */
export function actGeometry(view: number, interleaving: number[]): Record<string, Box> {
  const v = Math.max(0, Math.min(1, view));
  const order = actOrder(interleaving);
  const out: Record<string, Box> = {};
  for (const key of Object.keys(ANALOGY_LAYOUT)) {
    const a = ANALOGY_LAYOUT[key];
    const m = mechanismBox(key, order);
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
// The computation (§2.1): every number the learner sees comes from
// simulateRaceCondition(). buildSteps() is a pure mapping over its output —
// the base regex interpreter never runs for this lesson.
// ─────────────────────────────────────────────────────────────────────────────

export function toThreadIds(interleaving: number[]): Array<'T1' | 'T2'> {
  return interleaving.map(t => (t === 0 ? 'T1' : 'T2'));
}

/** Pure mapping: simulateRaceCondition output -> Step<TraceState>[]. */
export function raceSteps(input: TraceInput): Step<TraceState>[] {
  const result = simulateRaceCondition(input.initial.counter, toThreadIds(input.interleaving));
  const threadIds = input.threads.map(t => t.id);
  const steps: Step<TraceState>[] = [];

  steps.push({
    t: 0,
    caption: `Ammu and Abbu look at the same moment: the shared count reads ${input.initial.counter}. Nothing has happened yet.`,
    highlight: [...threadIds],
    state: {
      stepIndex: 0,
      activeThreadIndex: null,
      threadPointers: [0, 0],
      registers: { R1: null, R2: null },
      memory: { counter: input.initial.counter },
      lastModifiedVar: null,
      caption: 'Initial state before execution.'
    }
  });

  const pointers = [0, 0];
  result.steps.forEach((rs, i) => {
    const tIdx = rs.threadId === 'T1' ? 0 : 1;
    pointers[tIdx]++;
    const isLast = i === result.steps.length - 1;
    let caption = rs.description;
    if (isLast) {
      const diff = result.expectedCounter - result.finalCounter;
      const verdict =
        diff > 0 ? 'one update was lost'
        : diff < 0 ? 'one update was applied twice'
        : 'every update landed';
      caption = `${rs.description}. The shared count ends at ${result.finalCounter}, expected ${result.expectedCounter} — ${verdict}.`;
    }
    steps.push({
      t: i + 1,
      caption,
      highlight: [threadIds[tIdx]],
      state: {
        stepIndex: i + 1,
        activeThreadIndex: tIdx,
        threadPointers: [...pointers],
        registers: { R1: rs.register1, R2: rs.register2 },
        memory: { counter: rs.counter },
        lastModifiedVar: rs.instruction.startsWith('counter') ? 'counter' : `R${tIdx + 1}`,
        caption: rs.description
      }
    });
  });

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios (ATLAS units 34, 36, 37): the same read-modify-write mechanism,
// three skins. Initial values are input data; every displayed result is computed.
// ─────────────────────────────────────────────────────────────────────────────

type ScenarioId = 'slices' | 'budget' | 'seat' | 'buffer';

const SCENARIOS: Record<ScenarioId, { label: string; initial: number; plate: (n: number) => string }> = {
  slices: { label: '🍰 Last piece of cake', initial: 3, plate: n => `${n} pieces of cake left` },
  budget: { label: '🧾 Household ledger', initial: 800, plate: n => `Ledger: €${n}` },
  seat: { label: '🚗 Seats in the car', initial: 14, plate: n => `${n} seats free in the car` },
  buffer: { label: '📦 Buffer count (the slide)', initial: 5, plate: n => `${n} full buffers` }
};

/**
 * The analogy acts are family around one cake, matching the mechanism exactly:
 * T1's +1 is putting a slice back, T2's −1 is taking one off. The test suite
 * asserts these labels agree with the sign in RACE_INSTRUCTIONS.
 */
export const ACT_TEXT: Record<'T1' | 'T2', string[]> = {
  T1: ['Ammu looks at the cake', 'Ammu puts one back', 'Ammu writes the count'],
  T2: ['Abbu looks at the cake', 'Abbu takes one off', 'Abbu writes the count']
};

// ─────────────────────────────────────────────────────────────────────────────

export class RaceTraceEngine extends TraceEngine implements PlaygroundCapable {
  private scenario: ScenarioId = 'slices';
  private chipsHost: HTMLElement | null = null;
  private scoreboardHost: HTMLElement | null = null;
  private plateGroup!: SVGGElement;
  private actsGroup!: SVGGElement;

  protected override buildSteps(input: TraceInput): Step<TraceState>[] {
    return raceSteps(input);
  }

  /** The live result, computed on every call (§2.1) — never cached, never typed. */
  public getRaceResult(): RaceSimulationResult {
    return simulateRaceCondition(this.input.initial.counter, toThreadIds(this.input.interleaving));
  }

  public debugHooks(): Record<string, unknown> {
    return {
      setInterleaving: (order: number[]) => this.applyOrder(order),
      setScenario: (id: ScenarioId) => this.applyScenario(id),
      getOrder: () => [...this.input.interleaving],
      getRaceResult: () => this.getRaceResult()
    };
  }

  protected override mount(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
    svg.setAttribute('width', '100%');
    svg.style.maxHeight = '300px';
    svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    svg.style.background = 'var(--surface-alt, #fafafc)';
    svg.style.border = '1px solid var(--hairline)';

    this.actsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.actsGroup.setAttribute('id', 'l10-acts');
    this.plateGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.plateGroup.setAttribute('id', 'l10-plate');

    svg.append(this.plateGroup, this.actsGroup);
    this.container.appendChild(svg);
    (this as unknown as { svg: SVGSVGElement }).svg = svg;
  }

  protected override render(state: TraceState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    this.actsGroup.innerHTML = '';
    this.plateGroup.innerHTML = '';

    const geometry = actGeometry(v, this.input.interleaving);
    const order = actOrder(this.input.interleaving);

    // Plate / shared memory — same entity, both views.
    this.renderPlate(state, v, geometry['plate']);

    // Friends — column headers in the mechanism, arbitrary standing spots in the analogy.
    (['T1', 'T2'] as const).forEach((tid, tIdx) => {
      const g = this.box(geometry[`friend-${tid}`], 'var(--surface)', 'var(--hairline)', 999);
      g.setAttribute('id', `bar-friend-${tid}`);
      const label = this.label(
        geometry[`friend-${tid}`],
        v < 0.5 ? (tIdx === 0 ? 'Ammu' : 'Abbu') : `${tIdx === 0 ? 'Ammu' : 'Abbu'} · ${tid} · R${tIdx + 1}`,
        tIdx === 0 ? '#8a4b08' : '#0b5c8a'
      );
      g.appendChild(label);
      this.actsGroup.appendChild(g);
    });

    // The six acts — the morph's carrying property moves these.
    (['T1', 'T2'] as const).forEach((tid, tIdx) => {
      for (let i = 0; i < 3; i++) {
        const key = `act-${tid}-${i}`;
        const box = geometry[key];
        const executed = state.threadPointers[tIdx] > i;
        const isCurrent = state.activeThreadIndex === tIdx && state.threadPointers[tIdx] === i + 1;
        const slot = order[tIdx][i];

        const g = this.box(
          box,
          isCurrent ? 'rgba(0, 102, 204, 0.12)' : executed ? 'var(--surface)' : 'var(--surface)',
          isCurrent ? 'var(--accent)' : executed ? 'var(--hairline)' : 'var(--hairline)',
          8,
          isCurrent ? 2 : 1
        );
        g.setAttribute('id', `bar-${key}`);

        const text = v < 0.5
          ? ACT_TEXT[tid][i]
          : `${slot + 1}. ${this.input.threads[tIdx].instructions[i]}`;
        g.appendChild(this.label(box, text, isCurrent ? 'var(--accent)' : executed ? 'var(--ink)' : 'var(--muted)', v >= 0.5 ? 9 : 10.5));

        if (isCurrent) {
          const playhead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          playhead.setAttribute('cx', String(box.x - 8));
          playhead.setAttribute('cy', String(box.y + box.h / 2));
          playhead.setAttribute('r', '4');
          playhead.setAttribute('fill', 'var(--accent)');
          this.actsGroup.appendChild(playhead);
        }

        this.actsGroup.appendChild(g);
      }
    });
  }

  private renderPlate(state: TraceState, v: number, box: Box): void {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'bar-plate');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(box.x));
    rect.setAttribute('y', String(box.y));
    rect.setAttribute('width', String(box.w));
    rect.setAttribute('height', String(box.h));
    rect.setAttribute('rx', String(v < 0.5 ? box.h / 2 : 10));
    rect.setAttribute('fill', 'var(--surface, #ffffff)');
    rect.setAttribute('stroke', state.lastModifiedVar === 'counter' ? 'var(--accent)' : 'var(--hairline)');
    rect.setAttribute('stroke-width', state.lastModifiedVar === 'counter' ? '2' : '1');
    g.appendChild(rect);

    // Analogy face: just the count. Mechanism face: memory + registers.
    const plateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    plateText.setAttribute('x', String(box.x + box.w / 2));
    plateText.setAttribute('y', String(box.y + box.h / 2 + 4));
    plateText.setAttribute('text-anchor', 'middle');
    plateText.setAttribute('font-size', '11');
    plateText.setAttribute('font-weight', '700');
    plateText.setAttribute('fill', 'var(--ink)');
    plateText.style.opacity = v < 0.5 ? '1' : '0';
    plateText.textContent = SCENARIOS[this.scenario].plate(state.memory.counter);
    g.appendChild(plateText);

    const face = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    face.style.opacity = v < 0.5 ? '0' : '1';
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', String(box.x + 12));
    title.setAttribute('y', String(box.y + 18));
    title.setAttribute('font-size', '9');
    title.setAttribute('font-weight', '700');
    title.setAttribute('fill', 'var(--muted)');
    title.textContent = 'SHARED MEMORY';
    face.appendChild(title);

    const rows: [string, string][] = [
      ['counter', String(state.memory.counter)],
      ['R1', state.registers.R1 === null ? '—' : String(state.registers.R1)],
      ['R2', state.registers.R2 === null ? '—' : String(state.registers.R2)]
    ];
    rows.forEach(([k, val], i) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(box.x + 12));
      t.setAttribute('y', String(box.y + 44 + i * 24));
      t.setAttribute('font-family', 'var(--font-mono)');
      t.setAttribute('font-size', '11');
      t.setAttribute('font-weight', state.lastModifiedVar === (k === 'counter' ? 'counter' : k) ? '700' : '400');
      t.setAttribute('fill', state.lastModifiedVar === (k === 'counter' ? 'counter' : k) ? 'var(--accent)' : 'var(--ink)');
      t.textContent = `${k} = ${val}`;
      face.appendChild(t);
    });
    g.appendChild(face);

    this.plateGroup.appendChild(g);
  }

  private box(b: Box, fill: string, stroke: string, rx: number, strokeWidth = 1): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(b.x));
    rect.setAttribute('y', String(b.y));
    rect.setAttribute('width', String(b.w));
    rect.setAttribute('height', String(b.h));
    rect.setAttribute('rx', String(rx));
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', String(strokeWidth));
    g.appendChild(rect);
    return g;
  }

  private label(b: Box, text: string, fill: string, fontSize = 11): SVGTextElement {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(b.x + b.w / 2));
    t.setAttribute('y', String(b.y + b.h / 2 + 3.5));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', String(fontSize));
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', fill);
    t.textContent = text;
    return t;
  }

  // ── Playground: reorder the interleaving, find the corrupting orders ──

  public renderPlayground(host: HTMLElement, scoreboardHost?: HTMLElement): void {
    this.scoreboardHost = scoreboardHost ?? null;
    host.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Reorder the six actions</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="l10-preset-fair" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--running); color: var(--running); cursor: pointer;">🟢 One at a time</button>
          <button id="l10-preset-race" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--waiting); color: var(--waiting); cursor: pointer;">🔴 The slide order</button>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <label for="l10-scenario" style="font-size: 0.76rem; font-weight: 600; color: var(--ink);">Story:</label>
        <select id="l10-scenario" style="padding: 3px 6px; font-size: 0.76rem; border-radius: var(--rounded-md, 11px); border: 1px solid var(--hairline); background: var(--surface); color: var(--ink); cursor: pointer;">
          ${Object.entries(SCENARIOS).map(([id, s]) => `<option value="${id}" ${id === this.scenario ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <span style="font-size: 0.74rem; color: var(--muted);">Drag a chip, or nudge it with the arrows.</span>
      </div>
      <div id="l10-chips" style="display: flex; gap: 4px; flex-wrap: wrap;"></div>
    `;

    host.querySelector('#l10-preset-fair')?.addEventListener('click', () => this.applyOrder([0, 0, 0, 1, 1, 1]));
    host.querySelector('#l10-preset-race')?.addEventListener('click', () => this.applyOrder([0, 0, 1, 1, 0, 1]));
    host.querySelector('#l10-scenario')?.addEventListener('change', (e) => {
      this.applyScenario((e.target as HTMLSelectElement).value as ScenarioId);
    });

    this.chipsHost = host.querySelector('#l10-chips');
    this.renderChips();
    this.renderScoreboard();
  }

  private chipLabel(tIdx: number, instr: number): string {
    const acts = instr === 0 ? 'looks' : instr === 1 ? (tIdx === 0 ? 'puts one back' : 'takes one off') : 'writes';
    return `${tIdx === 0 ? 'M' : 'F'} · ${acts}`;
  }

  private renderChips(): void {
    if (!this.chipsHost) return;
    const seen = [0, 0];
    const chips = this.input.interleaving.map((tIdx, slot) => {
      const instr = seen[tIdx]++;
      return { tIdx, instr, slot };
    });
    this.chipsHost.innerHTML = chips.map(({ tIdx, instr, slot }) => `
      <div class="l10-chip" draggable="true" data-slot="${slot}" style="display: flex; align-items: center; gap: 2px; padding: 2px 4px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-pill, 9999px); cursor: grab; user-select: none;">
        <button type="button" class="l10-nudge" data-dir="-1" data-slot="${slot}" aria-label="Move earlier" style="border: none; background: none; cursor: pointer; color: var(--muted); font-size: 0.72rem; padding: 0 2px;">&larr;</button>
        <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; color: var(--ink);">${slot + 1}. ${this.chipLabel(tIdx, instr)}</span>
        <button type="button" class="l10-nudge" data-dir="1" data-slot="${slot}" aria-label="Move later" style="border: none; background: none; cursor: pointer; color: var(--muted); font-size: 0.72rem; padding: 0 2px;">&rarr;</button>
      </div>
    `).join('');

    this.chipsHost.querySelectorAll('.l10-nudge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        this.move(Number(el.dataset.slot), Number(el.dataset.slot) + Number(el.dataset.dir));
      });
    });

    let dragFrom: number | null = null;
    this.chipsHost.querySelectorAll('.l10-chip').forEach(chip => {
      chip.addEventListener('dragstart', (e) => {
        dragFrom = Number((chip as HTMLElement).dataset.slot);
        (e as DragEvent).dataTransfer?.setData('text/plain', String(dragFrom));
      });
      chip.addEventListener('dragover', (e) => e.preventDefault());
      chip.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = dragFrom ?? Number((e as DragEvent).dataTransfer?.getData('text/plain'));
        if (!Number.isNaN(from)) this.move(from, Number((chip as HTMLElement).dataset.slot));
        dragFrom = null;
      });
    });
  }

  private move(from: number, to: number): void {
    const order = [...this.input.interleaving];
    if (to < 0 || to >= order.length || from === to) return;
    const [picked] = order.splice(from, 1);
    order.splice(to, 0, picked);
    this.applyOrder(order);
  }

  private applyOrder(order: number[]): void {
    this.input.interleaving = order;
    this.rebuild();
  }

  private applyScenario(id: ScenarioId): void {
    this.scenario = id;
    this.input.initial = { counter: SCENARIOS[id].initial };
    this.rebuild();
  }

  private rebuild(): void {
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
    this.renderChips();
    this.renderScoreboard();
  }

  private renderScoreboard(): void {
    if (!this.scoreboardHost) return;
    const r = this.getRaceResult();
    const drift = r.expectedCounter - r.finalCounter;
    const verdictColor = r.isCorrupted ? 'var(--waiting)' : 'var(--running)';
    const verdictBg = r.isCorrupted ? 'rgba(217, 119, 6, 0.12)' : 'rgba(8, 127, 91, 0.12)';
    const verdictText = r.isCorrupted
      ? (drift > 0 ? '⚠️ Corrupted — one update vanished' : '⚠️ Corrupted — one update applied twice')
      : '🟢 The count survived';
    this.scoreboardHost.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Ledger check</h3>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; background: ${verdictBg}; color: ${verdictColor}; border: 1px solid ${verdictColor};">${verdictText}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Final count</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: ${r.isCorrupted ? 'var(--waiting)' : 'var(--running)'}; margin: 2px 0;">${r.finalCounter}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">after ${r.steps.length} actions</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">It should be</div>
          <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">${r.expectedCounter}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${drift === 0 ? 'no drift' : `drift ${drift > 0 ? '−' : '+'}${Math.abs(drift)}`}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">This order</div>
          <div style="font-family: var(--font-mono); font-size: 0.74rem; margin-top: 3px; color: ${r.isCorrupted ? 'var(--waiting)' : 'var(--running)'};">${toThreadIds(this.input.interleaving).join(' → ')}</div>
          <div style="font-size: 0.68rem; color: var(--muted); margin-top: 2px;">Some orders break it. Some don't.</div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const lesson10Input: TraceInput = {
  threads: [
    // Instruction strings are the algorithm's own RACE_INSTRUCTIONS — the
    // picture at view 1 is bound to what simulateRaceCondition executes.
    { id: 'T1', name: 'Ammu (T1)', analogyName: 'Ammu', color: '#8a4b08', instructions: [...RACE_INSTRUCTIONS.T1] },
    { id: 'T2', name: 'Abbu (T2)', analogyName: 'Abbu', color: '#0b5c8a', instructions: [...RACE_INSTRUCTIONS.T2] }
  ],
  interleaving: [0, 0, 1, 1, 0, 1], // the slide's verbatim S0–S5 trace
  initial: { counter: 3 },
  analogy: { domain: 'friends' }
};

export const lesson10: Lesson<TraceInput, TraceState> = {
  id: 10,
  lecture: 8,
  slug: 'lesson-10',
  title: 'The Last Slice',
  absorbsUnits: [34, 35, 36, 37],
  slides: 'slides 3–8',
  engine: 'trace',
  engineClass: RaceTraceEngine,
  lensLabels: {
    analogy: '🍰 Ammu, Abbu, one cake',
    mechanism: '⚙️ Register-level trace',
    analogyTitle: 'View as Ammu and Abbu sharing the last piece of cake',
    mechanismTitle: 'View as register-level interleaving'
  },
  analogy: {
    domain: 'friends',
    text: 'Ammu puts a plate into the fridge while Abbu takes one out. Each writes down the count they saw when they looked — so if both look before either has written, the second write erases the first, and one change never lands. Neither parent is wrong; the order is. The same lost update corrupts the household ledger, and gives the last seat in the car to two people at once.'
  },
  concept: 'When two threads read, modify and write the same shared variable, the final value depends on the order their steps interleave. Each thread loads the count into its own register, edits the register, and writes it back — and if both threads read before either has written, the second write silently erases the first update. The slide\'s counter is the bounded buffer\'s count of full buffers: a producer increments it, a consumer decrements it, and an interleaved execution loses an update. A lost update is not a bug in either parent\'s edit; it is a property of the order. The same lost update corrupts the household ledger the whole family edits, and hands the last seat in the car to two people. The fix — making read-modify-write indivisible — is the critical-section problem, next lesson.'  +
    '  The name for this is a RACE CONDITION: several threads read and write the same shared data, and the result depends on the order their steps happen to interleave. Nothing in the code says which order that will be, and neither instruction is wrong on its own. The specific damage here is a LOST UPDATE, where one thread\'s write is overwritten by another that read before it. What makes it possible is that counter++ is not one step. It is a read, a modify and a write, and any of the three can be interrupted.',
  morphReveals: 'Around the cake, where Ammu and Abbu stand means nothing — they act at the same moment, and the six actions have no order you can point to. In the register trace, vertical position becomes time: the same six actions sorted into the one order they really ran in. Height stops meaning place and starts meaning when — and read top to bottom, you can see exactly which count each action saw; a lost update shows up as two actions seeing the same count before either has written.',
  morphMode: 'morph',
  analogyMapping: [
    'Ammu ➔ T1 (register1)',
    'Abbu ➔ T2 (register2)',
    'Last piece of cake in the fridge ➔ shared counter in memory',
    '"Looks in the fridge" ➔ register = counter (read)',
    '"Puts one back" ➔ register = register + 1 (producer)',
    '"Takes one off" ➔ register = register − 1 (consumer)',
    '"Writes the count" ➔ counter = register (write)',
    'Whoever writes last ➔ the update that wins and the one that vanishes'
  ],
  input: lesson10Input
};

export default lesson10;
