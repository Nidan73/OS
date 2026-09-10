import { AnimationEngine } from '../core/engine.js';
import type { Step } from '../core/types.js';

// ── MatrixEngine ────────────────────────────────────────────────────────────
//
// Central engine for the Wave 3 ledger tables (L20, L21). Available / Max /
// Allocation / Need with per-cell highlighting, because the lessons animate
// the safety sweep cell by cell. Row/column emphasis, and a pretend-grant
// overlay on the committed state.
//
// Geometry contract (§3C.2a, the Wave 2 lesson): the engine computes
// mechanism widths from the ledger itself, so no lesson can inherit a reskin.
// Analogy: every cell the same width, travellers' declared ceilings on
// identical slips. Mechanism: width means amount, a Need cell is as wide as
// the units it still claims. Both differ per entity, and Need widths move
// with state as the sweep reclaims.

export interface MatrixEvent {
  /** the same beat in the scene's words, shown on the analogy lens */
  analogyCaption?: string;
  caption: string;
  /** Cell-by-cell comparison to highlight: [pid, resourceIdx]. */
  probeCells?: Array<[number, number]>;
  /** Rows the sweep has finished (reclaimed, dimmed). */
  finishedRows?: number[];
  /** Current Work vector to show in the Available row. */
  work?: number[];
  activeRow?: number;
}

export interface MatrixInput {
  resources: string[];
  /** Process ids in row order. */
  processes: string[];
  available: number[];
  max: number[][];
  allocation: number[][];
  events: MatrixEvent[];
  /** Overlay: pretend-grant to show beside the committed state. */
  pretend?: { available: number[]; allocation: number[][] };
  analogy?: {
    domain: 'travel' | 'food' | 'friends';
    rowLabels?: Record<string, string>;
  };
}

export interface MatrixState {
  probeCells: Array<[number, number]>;
  finishedRows: number[];
  work: number[];
  activeRow: number | null;
}

const CANVAS_W = 720;
const CANVAS_H = 300;

// Analogy cells: identical slips, authored independently of the mechanism.
const ANALOGY_CELL_W = 44;
const ANALOGY_CELL_H = 26;

// Mechanism: base slot plus per-unit width, computed from the ledger.
const MECH_BASE_W = 26;
const MECH_PER_UNIT_W = 9;
const MECH_CELL_H = 26;

export function needRow(max: number[][], allocation: number[][], pid: number): number[] {
  return max[pid].map((v, j) => v - allocation[pid][j]);
}

export class MatrixEngine extends AnimationEngine<MatrixInput, MatrixState> {
  protected svg!: SVGSVGElement;
  private tablesGroup!: SVGGElement;

  protected buildSteps(input: MatrixInput): Step<MatrixState>[] {
    if (!input.processes || input.processes.length === 0) {
      throw new Error('MatrixEngine: input.processes must not be empty');
    }
    const steps: Step<MatrixState>[] = [];
    let t = 0;
    steps.push({
      t: t++,
      caption: 'The ledger opens, ceilings declared, holdings drawn, cash on hand.',
      highlight: [...input.processes],
      state: {
        probeCells: [],
        finishedRows: [],
        work: [...input.available],
        activeRow: null
      }
    });
    for (const ev of input.events ?? []) {
      steps.push({
        t: t++,
        caption: ev.caption.slice(0, 320),
        analogyCaption: ev.analogyCaption,
        highlight: ev.activeRow !== undefined ? [input.processes[ev.activeRow]] : [],
        state: {
          probeCells: (ev.probeCells ?? []).map(([p, r]) => [p, r] as [number, number]),
          finishedRows: [...(ev.finishedRows ?? [])],
          work: ev.work ? [...ev.work] : [...input.available],
          activeRow: ev.activeRow ?? null
        }
      });
    }
    return steps;
  }

  /** Playground seam: replace the sweep script and rebuild. */
  public setEvents(events: MatrixEvent[]): void {
    this.input.events = events;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
  }

  public getNeed(): number[][] {
    return this.input.processes.map((_, i) =>
      needRow(this.input.max, this.input.allocation, i)
    );
  }

  protected mount(): void {
    this.container.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
    this.svg.setAttribute('width', '100%');
    this.svg.style.maxHeight = '340px';
    this.svg.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.svg.style.background = 'var(--surface-alt, #fafafc)';
    this.svg.style.border = '1px solid var(--hairline)';
    this.tablesGroup = document.createElementNS(svgNS, 'g');
    this.tablesGroup.setAttribute('id', 'matrix-tables');
    this.svg.appendChild(this.tablesGroup);
    this.container.appendChild(this.svg);
  }

  protected render(state: MatrixState, view: number): void {
    const v = Math.max(0, Math.min(1, view));
    const svgNS = 'http://www.w3.org/2000/svg';
    this.tablesGroup.innerHTML = '';

    const { resources, processes } = this.input;
    const m = resources.length;
    const need = this.getNeed();
    const lerp = (a: number, b: number): number => a + (b - a) * v;

    const avail = this.input.pretend?.available ?? state.work;
    const allocShown = this.input.pretend?.allocation ?? this.input.allocation;

    interface TableDef {
      id: string;
      title: string;
      rows: string[];
      cell: (row: number, col: number) => { text: string; amount: number; dimmed: boolean };
      showAvailable: boolean;
    }

    const tables: TableDef[] = [
      {
        id: 'alloc',
        title: 'Allocation',
        rows: processes,
        cell: (row, col) => ({
          text: String(allocShown[row][col]),
          amount: allocShown[row][col],
          dimmed: state.finishedRows.includes(row)
        }),
        showAvailable: false
      },
      {
        id: 'max',
        title: 'Max',
        rows: processes,
        cell: (row, col) => ({
          text: String(this.input.max[row][col]),
          amount: this.input.max[row][col],
          dimmed: false
        }),
        showAvailable: false
      },
      {
        id: 'need',
        title: 'Need',
        rows: processes,
        cell: (row, col) => ({
          text: String(need[row][col]),
          amount: state.finishedRows.includes(row) ? 0 : need[row][col],
          dimmed: state.finishedRows.includes(row)
        }),
        showAvailable: false
      },
      {
        id: 'avail',
        title: this.input.pretend ? 'Available (pretended)' : 'Available',
        rows: ['Work'],
        cell: (_row, col) => ({ text: String(avail[col]), amount: avail[col], dimmed: false }),
        showAvailable: true
      }
    ];

    const probed = new Set(state.probeCells.map(([p, r]) => `${p}:${r}`));
    // ── Fit the mechanism layout inside the canvas ─────────────────────────
    // Cell width encodes the amount, which is this lesson's carrying property
    // and must stay. What was wrong is that the layout never checked whether
    // the result fits: a table was given CANVAS_W / tables.length = 180px of
    // slot while its own content came to about 291px, so tables overlapped
    // each other and the fourth ran off the right edge. Reported from a
    // screenshot showing Available clipped.
    //
    // The fix keeps width proportional to amount and solves for the per-unit
    // width that fits, rather than assuming 9px always does.
    // The row-label gutter and the gap between columns are the budget the
    // cells do not get. Keeping them at 62 and 8 left only about 6px of width
    // difference between the smallest and largest amount, which technically
    // still encodes the amount but is not something anyone could read.
    const GUTTER = 40;
    const COL_GAP = 5;
    let maxAmount = 1;
    for (const t of tables) {
      for (let ri = 0; ri < t.rows.length; ri++) {
        for (let c = 0; c < m; c++) maxAmount = Math.max(maxAmount, t.cell(ri, c).amount);
      }
    }
    const tableW = (CANVAS_W - 16) / tables.length;
    const colStride = (tableW - GUTTER) / m;
    const maxCellW = colStride - COL_GAP;
    // Derive the base slot and the per-unit width from the space that exists,
    // rather than clamping a fixed 9px per unit and overflowing when it does
    // not fit. Width still rises with the amount, which is the carrying
    // property; only the scale adapts.
    const baseW = Math.min(MECH_BASE_W, maxCellW * 0.45);
    const perUnitW = Math.max(0.5, Math.min(MECH_PER_UNIT_W, (maxCellW - baseW) / maxAmount));

    // ── Fit the analogy column too ─────────────────────────────────────────
    // The analogy view stacks every table's rows into one column of identical
    // slips. With four tables of five rows that column reached y=788 on a
    // 300px canvas, so most of it was simply not on screen, and all four table
    // titles were drawn at the same fixed point on top of each other.
    const totalAnalogyRows = tables.reduce((n, t) => n + t.rows.length + 1, 0);
    const analogyStride = Math.min(
      ANALOGY_CELL_H + 8,
      Math.max(12, (CANVAS_H - 56) / Math.max(1, totalAnalogyRows))
    );
    /** First row index of a table inside the single analogy column. */
    const analogyRowStart = (index: number): number =>
      tables.slice(0, index).reduce((n, t) => n + t.rows.length + 1, 0);

    tables.forEach((table, ti) => {
      const isNeed = table.id === 'need';
      table.rows.forEach((rowLabel, ri) => {
        for (let c = 0; c < m; c++) {
          const { text, amount, dimmed } = table.cell(ri, c);
          const mechW = baseW + perUnitW * amount;
          const w = lerp(ANALOGY_CELL_W, mechW);
          const h = lerp(Math.min(ANALOGY_CELL_H, analogyStride - 4), MECH_CELL_H);
          // Analogy: identical slips in a row. Mechanism: Need/Max/Allocation
          // tables side by side, Available beneath. Interpolate both axes.
          const ax = 30 + c * (ANALOGY_CELL_W + 8);
          const ay = 40 + (analogyRowStart(ti) + ri) * analogyStride;
          const mx = 8 + ti * tableW + GUTTER + c * colStride;
          const my = 44 + ri * (MECH_CELL_H + 6);
          const x = lerp(ax, mx);
          const y = lerp(ay, my);

          const pid = table.showAvailable ? -1 : ri;
          const isProbed = isNeed && pid >= 0 && probed.has(`${pid}:${c}`);
          const isActiveRow =
            table.id !== 'avail' && state.activeRow !== null && state.activeRow === ri;

          const g = document.createElementNS(svgNS, 'g');
          g.setAttribute(
            'id',
            table.showAvailable
              ? `bar-avail-${resources[c]}`
              : `bar-${table.id}-${processes[ri]}-${resources[c]}`
          );

          const rect = document.createElementNS(svgNS, 'rect');
          rect.setAttribute('x', String(x));
          rect.setAttribute('y', String(y));
          rect.setAttribute('width', String(w));
          rect.setAttribute('height', String(h));
          rect.setAttribute('rx', '5');
          rect.setAttribute(
            'fill',
            isProbed
              ? 'rgba(0, 102, 204, 0.14)'
              : dimmed
                ? 'var(--surface-alt)'
                : isActiveRow
                  ? 'var(--surface, #ffffff)'
                  : 'var(--surface, #ffffff)'
          );
          rect.setAttribute('stroke', isProbed ? 'var(--accent)' : isActiveRow ? 'var(--accent)' : 'var(--hairline)');
          rect.setAttribute('stroke-width', isProbed || isActiveRow ? '2' : '1');
          if (dimmed) rect.setAttribute('opacity', '0.55');
          g.appendChild(rect);

          const t = document.createElementNS(svgNS, 'text');
          t.setAttribute('x', String(x + w / 2));
          t.setAttribute('y', String(y + h / 2 + 4));
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('font-family', 'var(--font-mono)');
          t.setAttribute('font-size', '11');
          t.setAttribute('font-weight', isProbed ? '700' : '400');
          t.setAttribute('fill', dimmed ? 'var(--muted)' : 'var(--ink)');
          t.textContent = text;
          g.appendChild(t);

          this.tablesGroup.appendChild(g);
        }
      });

      // Table title.
      // Each title travels with its own table. Previously both coordinates
      // were fixed in the analogy view, so all four titles landed on the same
      // pixel and rendered as one unreadable smear.
      const title = document.createElementNS(svgNS, 'text');
      title.setAttribute('x', String(lerp(30, 8 + ti * tableW + GUTTER)));
      title.setAttribute(
        'y',
        String(lerp(40 + analogyRowStart(ti) * analogyStride - 6, 30))
      );
      title.setAttribute('font-size', '11');
      title.setAttribute('font-weight', '700');
      title.setAttribute('fill', 'var(--muted)');
      title.textContent = table.title;
      this.tablesGroup.appendChild(title);
    });
  }
}
