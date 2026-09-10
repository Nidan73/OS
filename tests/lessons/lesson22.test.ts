import { describe, it, expect } from 'vitest';
import {
  CANDIDATES,
  Lesson22DiagramEngine,
  ROUNDS,
  SCENARIO_LABELS,
  ANALOGY_CARD_W,
  cardWidth,
  lesson22,
  nodesFor,
  runFor,
  scenarioInput,
  abortAllTotals,
  tallyAt,
  type Lesson22Scenario
} from '../../src/lessons/lecture-10/lesson-22.js';
import { recoveryRounds, selectVictim, victimCost } from '../../src/algorithms/deadlock.js';

const mount = (scenario: Lesson22Scenario, view = 0) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const engine = new Lesson22DiagramEngine(host, scenarioInput(scenario));
  engine.init(view);
  return { host, engine };
};

describe('Lesson 22 · starvation is demonstrated, not asserted', () => {
  it('without counting tows the same flat is chosen every single night', () => {
    const run = recoveryRounds(CANDIDATES, ROUNDS, false);
    expect(new Set(run.picks).size).toBe(1);
    expect(run.starved).toBe(true);
    expect(run.starvedId).toBe(run.picks[0]);
  });

  it('counting tows rotates the victim, nobody absorbs every one', () => {
    const run = recoveryRounds(CANDIDATES, ROUNDS, true);
    expect(new Set(run.picks).size).toBeGreaterThan(1);
    expect(run.starved).toBe(false);
    expect(run.starvedId).toBeNull();
  });

  it('the only difference between the two runs is the rollback term', () => {
    const off = recoveryRounds(CANDIDATES, ROUNDS, false);
    const on = recoveryRounds(CANDIDATES, ROUNDS, true);
    // Same candidates, same rounds, same first pick, they diverge only after
    // the first tow is priced in.
    expect(on.picks[0]).toBe(off.picks[0]);
    expect(on.picks.slice(1)).not.toEqual(off.picks.slice(1));
  });

  it('one round could never show starvation, repetition is the mechanism', () => {
    expect(recoveryRounds(CANDIDATES, 1, false).starved).toBe(false);
    expect(ROUNDS).toBeGreaterThan(1);
  });

  it('both fates are reachable through the playground', () => {
    const { engine } = mount('starve');
    const hooks = engine.debugHooks();
    (hooks.setScenario as (s: Lesson22Scenario) => void)('starve');
    expect((hooks.isStarved as () => boolean)()).toBe(true);
    (hooks.setScenario as (s: Lesson22Scenario) => void)('rollback');
    expect((hooks.isStarved as () => boolean)()).toBe(false);
    engine.destroy();
  });
});

describe('Lesson 22 · costs come from the deck criteria', () => {
  it('every slide-42 criterion contributes to the cost', () => {
    const parts = victimCost(CANDIDATES[0], true).parts;
    expect(Object.keys(parts).sort()).toEqual(
      ['computed', 'held', 'interactive', 'needed', 'priority', 'rollbacks'].sort()
    );
  });

  it('an interactive process costs more to abort than an identical batch one', () => {
    const base = CANDIDATES[1];
    const asBatch = victimCost({ ...base, interactive: false }, false).total;
    const asInteractive = victimCost({ ...base, interactive: true }, false).total;
    expect(asInteractive).toBeGreaterThan(asBatch);
  });

  it('the rollback term is inert until it is switched on', () => {
    const withTows = { ...CANDIDATES[0], rollbacks: 3 };
    expect(victimCost(withTows, false).parts.rollbacks).toBe(0);
    expect(victimCost(withTows, true).parts.rollbacks).toBeGreaterThan(0);
  });

  it('the chosen victim is the cheapest, computed not named', () => {
    const chosen = selectVictim(CANDIDATES, false);
    const costs = CANDIDATES.map((c) => victimCost(c, false).total);
    expect(chosen.total).toBe(Math.min(...costs));
  });

  it('the captions quote the computed picks and costs', () => {
    const run = runFor('starve');
    const captions = scenarioInput('starve').reveals.map((r) => r.caption).join(' ');
    expect(captions).toContain(run.picks[0]);
    expect(captions).toContain(String(run.costs[0]));
    expect(captions).toContain(String(ROUNDS));
  });
});

describe('Lesson 22 · the morph is geometric, not cosmetic (§3C.2c)', () => {
  const widthsAt = (view: number, scenario: Lesson22Scenario): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson22DiagramEngine(host, scenarioInput(scenario));
    engine.init(view);
    engine.seek(engine.getSteps().length - 1);
    engine.setView(view);
    const out: Record<string, number> = {};
    host.querySelectorAll('[id^="bar-"]').forEach((el) => {
      const rect = el.tagName.toLowerCase() === 'g' ? el.querySelector('rect') : el;
      const w = parseFloat(rect?.getAttribute('width') ?? 'NaN');
      if (Number.isFinite(w)) out[(el as Element).id] = w;
    });
    engine.destroy();
    host.remove();
    return out;
  };

  it('analogy layout is native: every card on the clipboard is the same width', () => {
    const nodes = nodesFor(false, { 'Flat 1': 0, 'Flat 2': 0, 'Flat 3': 0 });
    const ws = nodes.map((n) => n.analogyWidth ?? 0);
    expect(Math.max(...ws) - Math.min(...ws)).toBeLessThan(1);
    expect(ws[0]).toBe(ANALOGY_CARD_W);
  });

  it('the rendered DOM actually moves, width or x differs between views', () => {
    const a = widthsAt(0, 'one-at-a-time');
    const b = widthsAt(1, 'one-at-a-time');
    const moved = Object.keys(a).some((id) => Math.abs(a[id] - b[id]) > 1);
    expect(moved).toBe(true);
  });

  it('mechanism layout encodes the quantity: width is the cost of moving that car', () => {
    const nodes = nodesFor(false, { 'Flat 1': 0, 'Flat 2': 0, 'Flat 3': 0 });
    nodes.forEach((n) => {
      const c = CANDIDATES.find((x) => x.id === n.label)!;
      expect(n.width).toBeCloseTo(cardWidth(victimCost(c, false).total), 5);
    });
    const ws = nodes.map((n) => n.width);
    expect(new Set(ws.map((w) => Math.round(w))).size).toBeGreaterThan(1);
  });

  it('each tow makes that card wider, the reason starvation ends', () => {
    const clean = nodesFor(true, { 'Flat 1': 0, 'Flat 2': 0, 'Flat 3': 0 });
    const towed = nodesFor(true, { 'Flat 1': 0, 'Flat 2': 2, 'Flat 3': 0 });
    const before = clean.find((n) => n.label === 'Flat 2')!.width;
    const after = towed.find((n) => n.label === 'Flat 2')!.width;
    expect(after).toBeGreaterThan(before);
  });

  it('geometry interpolates, every card moves monotonically between views', () => {
    const a = widthsAt(0, 'one-at-a-time');
    const mid = widthsAt(0.5, 'one-at-a-time');
    const b = widthsAt(1, 'one-at-a-time');
    expect(Object.keys(a).length).toBeGreaterThan(0);
    for (const id of Object.keys(a)) {
      expect(mid[id]).toBeGreaterThan(Math.min(a[id], b[id]) - 0.5);
      expect(mid[id]).toBeLessThan(Math.max(a[id], b[id]) + 0.5);
    }
  });

  it('the same element set exists at both extremes', () => {
    expect(Object.keys(widthsAt(0, 'one-at-a-time')).sort()).toEqual(
      Object.keys(widthsAt(1, 'one-at-a-time')).sort()
    );
  });
});

describe('Lesson 22 · copy agrees with the mechanism', () => {
  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson22.analogy.text,
      lesson22.concept,
      lesson22.morphReveals,
      ...(lesson22.analogyMapping ?? []),
      ...(Object.keys(SCENARIO_LABELS) as Lesson22Scenario[]).flatMap((s) =>
        scenarioInput(s).reveals.map((r) => r.caption)
      )
    ].join(' ');
    expect(copy).not.toMatch(/§\s*\d|Atlas unit|isomorph|morphMode|SPEC\.md|ABSORBS/i);
  });

  it('every caption fits the caption rail', () => {
    for (const s of Object.keys(SCENARIO_LABELS) as Lesson22Scenario[]) {
      for (const r of scenarioInput(s).reveals) {
        // rail is 320 since captions became story beats; see the note above
        expect(r.caption.length).toBeLessThanOrEqual(320);
        expect((r.analogyCaption ?? '').length).toBeLessThanOrEqual(320);
      }
    }
  });

  it('every scenario is a complete, non-empty event set', () => {
    for (const s of Object.keys(SCENARIO_LABELS) as Lesson22Scenario[]) {
      const { engine } = mount(s);
      expect(engine.getSteps().length).toBeGreaterThan(4);
      engine.destroy();
    }
  });

  it('declares the diagram engine it really extends, and absorbs units 88–89', () => {
    expect(lesson22.engine).toBe('diagram');
    expect(lesson22.absorbsUnits).toEqual([88, 89]);
    expect(lesson22.morphMode).toBe('morph');
  });

  it('the analogy asserts no outcome the playground can falsify', () => {
    expect(lesson22.analogy.text).not.toMatch(/\bstarv/i);
    expect(lesson22.concept.toLowerCase()).toContain('number of rollbacks');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Added after an audit. Two defects it did not cover:
//   1. the abort-all scoreboard typed "abort cost 183 · 6 spots freed"
//   2. render() derived card widths from getCurrentIndex(), not from state
// ─────────────────────────────────────────────────────────────────────────────

describe('L22 · the abort-all figures are computed, not typed', () => {
  it('sums every victim cost and every held unit from CANDIDATES', () => {
    const t = abortAllTotals();
    expect(t.cost).toBe(CANDIDATES.reduce((s, c) => s + victimCost(c, false).total, 0));
    expect(t.unitsFreed).toBe(CANDIDATES.reduce((s, c) => s + c.heldUnits, 0));
    expect(t.flats).toBe(CANDIDATES.length);
  });

  it('tracks the data instead of holding the old literals', () => {
    // the values that were hardcoded, asserted here so the deck stays honest
    expect(abortAllTotals().cost).toBe(183);
    expect(abortAllTotals().unitsFreed).toBe(6);
    // and moves when the data moves, which the literal could not
    const heavier = CANDIDATES.map((c) => ({ ...c, heldUnits: c.heldUnits + 1 }));
    expect(abortAllTotals(heavier).unitsFreed).toBe(9);
    expect(abortAllTotals(heavier).cost).toBeGreaterThan(183);
  });

  it('costs at least as much as any single victim, aborting all is the blunt option', () => {
    const worst = Math.max(...CANDIDATES.map((c) => victimCost(c, false).total));
    expect(abortAllTotals().cost).toBeGreaterThan(worst);
  });
});

describe('L22 · rollback geometry is a pure function of the step', () => {
  it('prices in one more rollback per beat, and every pick by the verdict', () => {
    const run = recoveryRounds(CANDIDATES, ROUNDS, true);
    const counted = (i: number) => Object.values(tallyAt(i)).reduce((a, b) => a + b, 0);
    expect(counted(0)).toBe(0);
    expect(counted(1)).toBe(0);
    for (let i = 2; i <= run.picks.length + 1; i++) expect(counted(i)).toBe(i - 1);
    // the verdict beat prices in every pick and does not exceed them
    expect(counted(run.picks.length + 2)).toBe(run.picks.length);
    expect(counted(999)).toBe(run.picks.length);
  });

  it('is pure, same index in, same tally out, and no shared mutation', () => {
    const a = tallyAt(4);
    const b = tallyAt(4);
    expect(a).toEqual(b);
    a['Flat 1'] = 99;
    expect(tallyAt(4)['Flat 1']).not.toBe(99);
  });

  it('never charges a flat a rollback it did not take', () => {
    const run = recoveryRounds(CANDIDATES, ROUNDS, true);
    for (let i = 0; i < run.picks.length + 3; i++) {
      for (const [id, n] of Object.entries(tallyAt(i))) {
        expect(n).toBeLessThanOrEqual(run.picks.filter((p) => p === id).length);
      }
    }
  });
});
