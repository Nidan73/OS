import { describe, it, expect } from 'vitest';
import { MatrixEngine } from '../../src/engines/matrix.js';
import {
  L20_ALLOCATION,
  L20_AVAILABLE,
  L20_MAX,
  Lesson20MatrixEngine,
  lesson20,
  lesson20Input,
  modeEvents,
  modeInput,
  refuseEvents,
  requestEvents,
  sweepEvents,
  type Lesson20Mode
} from '../../src/lessons/lecture-10/lesson-20.js';
import {
  needMatrix,
  requestAlgorithm,
  safetyAlgorithm
} from '../../src/algorithms/deadlock.js';

const MODES: Lesson20Mode[] = ['sweep', 'request', 'refuse'];

describe('Lesson 20 · every number is computed', () => {
  it('the T0 ledger transcribes the deck — Need derives cell by cell', () => {
    expect(needMatrix(L20_MAX, L20_ALLOCATION)).toEqual([
      [7, 4, 3],
      [1, 2, 2],
      [6, 0, 0],
      [0, 1, 1],
      [4, 3, 1]
    ]);
  });

  it('the sweep arc shows one beat per probe — 15 beats for 15 probes', () => {
    const sweep = safetyAlgorithm(L20_AVAILABLE, L20_MAX, L20_ALLOCATION);
    expect(sweep.sequence).toEqual([1, 3, 4, 0, 2]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson20MatrixEngine(host, modeInput('sweep'));
    engine.init(0);
    const steps = engine.getSteps();
    // One beat per Task B probe: a different Work vector is a different
    // event, so every examination gets its own caption quoting its own
    // Need-vs-Work comparison — see the DENSITY comment in lesson-20.ts.
    // Funded rows appear exactly when the probe satisfies, in deck order.
    const probeSteps = steps.filter(
      (s) => s.caption.includes('fits [') || s.caption.includes('waits —')
    );
    expect(sweep.steps.length).toBe(15);
    expect(probeSteps.length).toBe(15);
    // And the beat order replays the probe log: P0's two waits quote
    // different Work vectors before its funding beat.
    const p0waits = probeSteps.filter((s) => s.caption.startsWith('P0 waits'));
    expect(p0waits.length).toBe(2);
    expect(p0waits[0].caption).toContain('holds 3');
    expect(p0waits[1].caption).toContain('holds 5');
    const funded = probeSteps
      .filter((s) => s.caption.includes('fund, collect back'))
      .map((s) => s.caption.slice(0, 2));
    expect(funded).toEqual(['P1', 'P3', 'P4', 'P0', 'P2']);
    // And the wrap beat sits exactly where the scan passes P0 unfunded.
    const wrapIdx = steps.findIndex((s) => s.caption.startsWith('Scan wraps'));
    expect(steps[wrapIdx + 1].caption).toMatch(/P0 waits/);
    engine.destroy();
    host.remove();
  });

  it('the verdict names the computed sequence — never a stored answer', () => {
    const steps = sweepEvents();
    const last = steps[steps.length - 1];
    expect(last.caption).toContain('⟨P1, P3, P4, P0, P2⟩');
  });

  it('the request arc guards the deck answer — P1 (1,0,2) granted', () => {
    const req = requestAlgorithm(
      { available: L20_AVAILABLE, max: L20_MAX, allocation: L20_ALLOCATION },
      1,
      [1, 0, 2]
    );
    expect(req.granted).toBe(true);
    const events = requestEvents();
    expect(events[events.length - 1].caption).toMatch(/Granted/);
    expect(events[events.length - 1].caption).toContain('⟨P1, P3, P4, P0, P2⟩');
  });

  it('the refusal arc guards the Task B proof — P4 (3,3,0) refused, unsafe', () => {
    const req = requestAlgorithm(
      { available: L20_AVAILABLE, max: L20_MAX, allocation: L20_ALLOCATION },
      4,
      [3, 3, 0]
    );
    expect(req.granted).toBe(false);
    const events = refuseEvents();
    expect(events[events.length - 1].caption).toMatch(/Refused/);
    expect(events[events.length - 1].caption).toMatch(/working, not failing/);
  });

  it('loser beats name the selection discipline — P4 beats P0 in pass 3', () => {
    const steps = sweepEvents();
    const losers = steps.filter((s) => s.caption.includes('came first in this pass'));
    // Pass 1: P3 loses to P1. Pass 2: P4 loses to P3. Pass 3: P0 and P2
    // lose to P4 — the two examinations a restart-from-P0 scan would have
    // taken instead. Pass 4: P2 loses to P0.
    expect(losers.map((s) => s.caption.slice(0, 2))).toEqual(['P3', 'P4', 'P0', 'P2', 'P2']);
    expect(losers[2].caption).toMatch(/P4 came first/);
  });

  it('mode scripts are complete event sets — sweep 22, request 19, refuse 4', () => {
    expect(sweepEvents().length).toBe(22);
    expect(requestEvents().length).toBe(19);
    expect(refuseEvents().length).toBe(4);
  });
});

describe('Lesson 20 · the wrap beat earns its place', () => {
  it('exactly one wrap beat, on the pass where the order depends on it', () => {
    const wraps = sweepEvents().filter((e) => e.caption.startsWith('Scan wraps'));
    expect(wraps.length).toBe(1);
    expect(wraps[0].caption).toMatch(/after P4, not from the top/);
  });

  it('a restart-from-P0 scan would take P0 third — the wrap is the difference', () => {
    // The documented Task B divergence, re-asserted where the learner sees it:
    // circular order gives P4 third, restart gives P0 third.
    expect(safetyAlgorithm(L20_AVAILABLE, L20_MAX, L20_ALLOCATION).sequence[2]).toBe(4);
  });
});

describe('Lesson 20 · the playground reaches grant and refusal', () => {
  it('all three modes rebuild steps and verdicts through debugHooks', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson20MatrixEngine(host, modeInput('sweep'));
    engine.init(0);
    const setMode = engine.debugHooks().setMode as (m: Lesson20Mode) => void;
    for (const mode of MODES) {
      setMode(mode);
      expect((engine.debugHooks().getMode as () => Lesson20Mode)()).toBe(mode);
      const steps = engine.getSteps();
      expect(steps.length).toBe(modeEvents(mode).length + 1);
      const last = steps[steps.length - 1];
      if (mode === 'refuse') expect(last.caption).toMatch(/Refused/);
      else expect(last.caption).toMatch(/⟨P1, P3, P4, P0, P2⟩/);
    }
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 20 · copy agrees with the mechanism', () => {
  it('the refusal is staged as the algorithm working — never as failure', () => {
    expect(lesson20.concept).toMatch(/refusal is the algorithm working|working, not failing/i);
    expect(refuseEvents()[refuseEvents().length - 1].caption).toMatch(/working, not failing/);
    expect(lesson20.concept.toLowerCase()).not.toMatch(/error|fails|broken/);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson20.analogy.text,
      lesson20.concept,
      lesson20.morphReveals,
      ...(lesson20.analogyMapping ?? []),
      ...sweepEvents().map((s) => s.caption),
      ...requestEvents().map((s) => s.caption),
      ...refuseEvents().map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 20 · lesson wiring', () => {
  it('declares the matrix engine it really extends, and absorbs units 80–83', () => {
    expect(lesson20.engine).toBe('matrix');
    expect(lesson20.engineClass).toBeDefined();
    expect(lesson20.engineClass?.prototype instanceof MatrixEngine).toBe(true);
    expect(lesson20.absorbsUnits).toEqual([80, 81, 82, 83]);
    expect(lesson20.id).toBe(20);
    expect(lesson20.slug).toBe('lesson-20');
  });

  it('opens on the T0 sweep — the ledger before any loan', () => {
    expect(lesson20Input.available).toEqual(L20_AVAILABLE);
    expect(lesson20.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 20 · geometry on actual coordinates (§3C.2c)', () => {
  const widthsAt = (view: number, mode: Lesson20Mode): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson20MatrixEngine(host, modeInput(mode));
    engine.init(view);
    engine.seek(engine.getSteps().length - 1);
    engine.setView(view);
    const out: Record<string, number> = {};
    host.querySelectorAll('[id^="bar-"]').forEach((el) => {
      const rect = el.querySelector('rect');
      const w = parseFloat(rect?.getAttribute('width') ?? 'NaN');
      if (Number.isFinite(w)) out[(el as Element).id] = w;
    });
    engine.destroy();
    host.remove();
    return out;
  };

  it('analogy layout is native, not the mechanism restyled', () => {
    const w = widthsAt(0, 'sweep');
    const vals = Object.values(w);
    expect(vals.length).toBeGreaterThanOrEqual(12);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
  });

  it('mechanism layout encodes the quantity: live claims wider than settled rows', () => {
    // Seek mid-sweep — P1 funded, P4 still claiming — so settled and live
    // rows coexist. At the close every row is dimmed and widths equalize,
    // which is the sweep's own doing, not a reskin.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson20MatrixEngine(host, modeInput('sweep'));
    engine.init(1);
    engine.seek(7);
    engine.setView(1);
    const w: Record<string, number> = {};
    host.querySelectorAll('[id^="bar-"]').forEach((el) => {
      const rect = el.querySelector('rect');
      const width = parseFloat(rect?.getAttribute('width') ?? 'NaN');
      if (Number.isFinite(width)) w[(el as Element).id] = width;
    });
    expect(Math.max(...Object.values(w)) - Math.min(...Object.values(w))).toBeGreaterThan(1);
    expect(w['bar-need-P4-A']).toBeGreaterThan(w['bar-need-P1-A']);
    engine.destroy();
    host.remove();
  });

  it('geometry interpolates — the morph is real', () => {
    for (const id of Object.keys(widthsAt(0, 'sweep'))) {
      const a = widthsAt(0, 'sweep')[id];
      const mid = widthsAt(0.5, 'sweep')[id];
      const b = widthsAt(1, 'sweep')[id];
      if (Math.abs(a - b) < 1) continue;
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
