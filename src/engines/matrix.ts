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
        caption: ev.caption.slice(0, 120),
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
    const tableW = CANVAS_W / tables.length;

    tables.forEach((table, ti) => {
      const isNeed = table.id === 'need';
      table.rows.forEach((rowLabel, ri) => {
        for (let c = 0; c < m; c++) {
          const { text, amount, dimmed } = table.cell(ri, c);
          const mechW = MECH_BASE_W + MECH_PER_UNIT_W * amount;
          const w = lerp(ANALOGY_CELL_W, mechW);
          const h = lerp(ANALOGY_CELL_H, MECH_CELL_H);
          // Analogy: identical slips in a row. Mechanism: Need/Max/Allocation
          // tables side by side, Available beneath. Interpolate both axes.
          const ax = 30 + c * (ANALOGY_CELL_W + 8);
          const ay = 40 + (ti * (table.rows.length + 1) + ri) * (ANALOGY_CELL_H + 8);
          const mx = ti * tableW + 62 + c * (MECH_BASE_W + MECH_PER_UNIT_W * 4 + 8);
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
      const title = document.createElementNS(svgNS, 'text');
      title.setAttribute('x', String(lerp(30, tables.indexOf(table) * tableW + 62)));
      title.setAttribute('y', String(lerp(30, 30)));
      title.setAttribute('font-size', '11');
      title.setAttribute('font-weight', '700');
      title.setAttribute('fill', 'var(--muted)');
      title.textContent = table.title;
      this.tablesGroup.appendChild(title);
    });
  }
}
