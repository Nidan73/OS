import { describe, it, expect } from 'vitest';
import { evaluateRealtimeDeadline } from '../../src/algorithms/synchronization.js';
import { DiagramEngine } from '../../src/engines/diagram.js';
import {
  BAR_X0,
  DEFAULT_PARAMS,
  GATE_W,
  MAX_TOTAL,
  PARAM_RANGES,
  PX_PER_MS,
  TRACK_W,
  lesson09,
  lesson09Input,
  realtimeBreakdown,
  realtimeGeometry,
  realtimeLessonInput,
  realtimeNodes,
  realtimeReveals,
  type LatencyParams,
  type NodeId
} from '../../src/lessons/lecture-07/lesson-09.js';

const IDS: NodeId[] = ['alarm', 'aisle', 'switch', 'run', 'slack', 'gate'];

const PARAM_CASES: LatencyParams[] = [
  { ...DEFAULT_PARAMS },
  { interruptLatency: 1, conflictPhase: 1, dispatchPhase: 1, executionTime: 2, deadline: 30 },
  { interruptLatency: 10, conflictPhase: 10, dispatchPhase: 10, executionTime: 20, deadline: 5 },
  { interruptLatency: 4, conflictPhase: 2, dispatchPhase: 6, executionTime: 11, deadline: 23 }
];

describe('Lesson 09 · every displayed number is computed', () => {
  it('the breakdown IS evaluateRealtimeDeadline, never re-derived', () => {
    for (const p of PARAM_CASES) {
      expect(realtimeBreakdown(p)).toStrictEqual(
        evaluateRealtimeDeadline(p.interruptLatency, p.conflictPhase, p.dispatchPhase, p.executionTime, p.deadline)
      );
    }
  });

  it('reveal metrics carry the computed totals, and captions quote them', () => {
    for (const p of PARAM_CASES) {
      const b = evaluateRealtimeDeadline(
        p.interruptLatency, p.conflictPhase, p.dispatchPhase, p.executionTime, p.deadline
      );
      const reveals = realtimeReveals(p);
      expect(reveals.length).toBe(12);
      for (const r of reveals) {
        expect(r.metrics?.totalResponseTime).toBe(b.totalResponseTime);
        expect(r.metrics?.slackTime).toBe(b.slackTime);
        expect(r.metrics?.deadline).toBe(b.deadline);
        expect(r.caption.length).toBeLessThanOrEqual(120);
      }
      const last = reveals[reveals.length - 1];
      expect(last.caption).toContain(`${b.totalResponseTime}ms`);
      expect(last.caption).toContain(`${b.deadline}ms`);
      expect(last.metrics?.verdict).toBe(b.met ? 'met' : 'missed');
      expect(last.badgeText).toContain(`${Math.abs(b.slackTime)}ms`);
    }
  });

  it('bar width is proportional to its latency on one computed scale', () => {
    expect(PX_PER_MS * MAX_TOTAL).toBe(TRACK_W);
    for (const p of PARAM_CASES) {
      const nodes = Object.fromEntries(realtimeNodes(p).map((n) => [n.id, n]));
      expect(nodes.alarm.width / p.interruptLatency).toBeCloseTo(PX_PER_MS, 9);
      expect(nodes.aisle.width / p.conflictPhase).toBeCloseTo(PX_PER_MS, 9);
      expect(nodes.switch.width / p.dispatchPhase).toBeCloseTo(PX_PER_MS, 9);
      expect(nodes.run.width / p.executionTime).toBeCloseTo(PX_PER_MS, 9);
      const b = realtimeBreakdown(p);
      expect(nodes.slack.width).toBeCloseTo(Math.max(0, b.slackTime) * PX_PER_MS, 9);
    }
  });

  it('the bar stacks in running order and the gate sits at the deadline', () => {
    for (const p of PARAM_CASES) {
      const nodes = Object.fromEntries(realtimeNodes(p).map((n) => [n.id, n]));
      expect(nodes.aisle.x).toBeCloseTo(nodes.alarm.x + nodes.alarm.width, 9);
      expect(nodes.switch.x).toBeCloseTo(nodes.aisle.x + nodes.aisle.width, 9);
      expect(nodes.run.x).toBeCloseTo(nodes.switch.x + nodes.switch.width, 9);
      expect(nodes.slack.x).toBeCloseTo(nodes.run.x + nodes.run.width, 9);
      expect(nodes.gate.x).toBeCloseTo(BAR_X0 + p.deadline * PX_PER_MS - GATE_W / 2, 9);
      expect(nodes.alarm.sublabel).toBe(`${p.interruptLatency} ms`);
      expect(nodes.gate.sublabel).toBe(`${p.deadline} ms`);
    }
  });

  it('slider ranges reach both sides of the boundary, and the burst breaks it', () => {
    const lo: LatencyParams = {
      interruptLatency: PARAM_RANGES.interruptLatency.min,
      conflictPhase: PARAM_RANGES.conflictPhase.min,
      dispatchPhase: PARAM_RANGES.dispatchPhase.min,
      executionTime: PARAM_RANGES.executionTime.min,
      deadline: PARAM_RANGES.deadline.max
    };
    const hi: LatencyParams = {
      interruptLatency: PARAM_RANGES.interruptLatency.max,
      conflictPhase: PARAM_RANGES.conflictPhase.max,
      dispatchPhase: PARAM_RANGES.dispatchPhase.max,
      executionTime: PARAM_RANGES.executionTime.max,
      deadline: PARAM_RANGES.deadline.min
    };
    expect(realtimeBreakdown(lo).met).toBe(true);
    expect(realtimeBreakdown(hi).met).toBe(false);
    expect(realtimeBreakdown(DEFAULT_PARAMS).met).toBe(true);
    const burst = realtimeBreakdown({ ...DEFAULT_PARAMS, interruptLatency: PARAM_RANGES.interruptLatency.max });
    expect(burst.met).toBe(false);
  });
});

describe('Lesson 09 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('analogy layout is native: the scene is placed, not timed — latencies cannot move it', () => {
    const a = realtimeGeometry(0, PARAM_CASES[0]);
    for (const p of PARAM_CASES.slice(1)) {
      expect(realtimeGeometry(0, p)).toStrictEqual(a);
    }
    // native = sized like the pictured thing: the door stands tallest, the run spreads widest
    const heights = IDS.map((id) => a[id].h);
    expect(a.gate.h).toBe(Math.max(...heights));
    const widths = IDS.map((id) => a[id].w);
    expect(a.run.w).toBe(Math.max(...widths));
    // and sized by looks, not by latency: ms-per-pixel differs box to box
    const p = DEFAULT_PARAMS;
    const ratio = (id: NodeId, ms: number): number => a[id].w / ms;
    const ratios = [
      ratio('alarm', p.interruptLatency),
      ratio('aisle', p.conflictPhase),
      ratio('switch', p.dispatchPhase),
      ratio('run', p.executionTime)
    ];
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(1);
  });

  it('mechanism layout encodes the quantity: latencies move the bar, looks do not', () => {
    const m1 = realtimeGeometry(1, PARAM_CASES[0]);
    const m2 = realtimeGeometry(1, { ...PARAM_CASES[0], executionTime: PARAM_CASES[0].executionTime + 1 });
    expect(m2.run.w - m1.run.w).toBeCloseTo(PX_PER_MS, 9);
    expect(m2.run.x - m1.run.x).toBeCloseTo(0, 9);
    expect(m2.slack.x - m1.slack.x).toBeCloseTo(PX_PER_MS, 9);
    expect(m2.gate.x).toBe(m1.gate.x); // the gate only answers to the deadline
    const m3 = realtimeGeometry(1, { ...PARAM_CASES[0], deadline: PARAM_CASES[0].deadline + 1 });
    expect(m3.gate.x - m1.gate.x).toBeCloseTo(PX_PER_MS, 9);
  });

  it('geometry interpolates — every entity moves monotonically between views', () => {
    for (const p of PARAM_CASES) {
      for (const id of IDS) {
        const a = realtimeGeometry(0, p)[id];
        const mid = realtimeGeometry(0.5, p)[id];
        const b = realtimeGeometry(1, p)[id];
        let moved = false;
        for (const k of ['x', 'y', 'w', 'h'] as const) {
          if (Math.abs(a[k] - b[k]) < 1e-9) {
            expect(mid[k]).toBeCloseTo(a[k], 9);
          } else {
            moved = true;
            expect(mid[k]).toBeGreaterThan(Math.min(a[k], b[k]));
            expect(mid[k]).toBeLessThan(Math.max(a[k], b[k]));
          }
        }
        expect(moved).toBe(true); // §3C.2a rule 3: no paint-only entities
      }
    }
  });

  it('the same element set exists at both extremes', () => {
    for (const p of PARAM_CASES) {
      expect(Object.keys(realtimeGeometry(0, p)).sort()).toEqual([...IDS].sort());
      expect(Object.keys(realtimeGeometry(1, p)).sort()).toEqual([...IDS].sort());
    }
  });
});

describe('Lesson 09 · copy agrees with the mechanism', () => {
  it('analogy, concept and morph copy contain no bare outcome number', () => {
    const digits = (s: string): string[] => [...s.matchAll(/\d+/g)].map((m) => m[0]);
    expect(digits(lesson09.analogy.text)).toEqual([]);
    expect(digits(lesson09.concept)).toEqual([]);
    expect(digits(lesson09.morphReveals)).toEqual([]);
  });

  it('soft-vs-hard wording holds in every reachable state — no outcome is asserted', () => {
    expect(lesson09.concept.toLowerCase()).toContain('soft');
    expect(lesson09.concept.toLowerCase()).toContain('hard');
    const fixed = `${lesson09.analogy.text} ${lesson09.concept} ${lesson09.morphReveals}`;
    expect(fixed).not.toMatch(/misses by|inside by|lands inside|overshoots/i);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson09.analogy.text,
      lesson09.concept,
      lesson09.morphReveals,
      ...(lesson09.analogyMapping ?? []),
      ...realtimeReveals(DEFAULT_PARAMS).map((r) => r.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 09 · lesson wiring', () => {
  it('declares the diagram engine it really extends, and absorbs units 27–30', () => {
    expect(lesson09.engine).toBe('diagram');
    expect(lesson09.engineClass).toBeDefined();
    expect(lesson09.engineClass?.prototype instanceof DiagramEngine).toBe(true);
    expect(lesson09.absorbsUnits).toEqual([27, 28, 29, 30]);
    expect(lesson09.id).toBe(9);
    expect(lesson09.slug).toBe('lesson-09');
  });

  it('opens in a sane default state: inside the deadline, with room to break it', () => {
    expect(lesson09Input.params).toStrictEqual(DEFAULT_PARAMS);
    expect(realtimeBreakdown(lesson09Input.params).met).toBe(true);
    expect(lesson09.input.nodes.length).toBe(6);
    expect(lesson09.input.reveals.length).toBe(12);
    expect(new Set(lesson09.input.nodes.map((n) => n.id)).size).toBe(6);
    expect(realtimeLessonInput(DEFAULT_PARAMS).analogy?.domain).toBe('travel');
  });
});
