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

  it('counting tows rotates the victim — nobody absorbs every one', () => {
    const run = recoveryRounds(CANDIDATES, ROUNDS, true);
    expect(new Set(run.picks).size).toBeGreaterThan(1);
    expect(run.starved).toBe(false);
    expect(run.starvedId).toBeNull();
  });

  it('the only difference between the two runs is the rollback term', () => {
    const off = recoveryRounds(CANDIDATES, ROUNDS, false);
    const on = recoveryRounds(CANDIDATES, ROUNDS, true);
    // Same candidates, same rounds, same first pick — they diverge only after
    // the first tow is priced in.
    expect(on.picks[0]).toBe(off.picks[0]);
    expect(on.picks.slice(1)).not.toEqual(off.picks.slice(1));
  });

  it('one round could never show starvation — repetition is the mechanism', () => {
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

  it('the rendered DOM actually moves — width or x differs between views', () => {
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

  it('each tow makes that card wider — the reason starvation ends', () => {
    const clean = nodesFor(true, { 'Flat 1': 0, 'Flat 2': 0, 'Flat 3': 0 });
    const towed = nodesFor(true, { 'Flat 1': 0, 'Flat 2': 2, 'Flat 3': 0 });
    const before = clean.find((n) => n.label === 'Flat 2')!.width;
    const after = towed.find((n) => n.label === 'Flat 2')!.width;
    expect(after).toBeGreaterThan(before);
  });

  it('geometry interpolates — every card moves monotonically between views', () => {
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

  it('every caption fits the 120-char rail', () => {
    for (const s of Object.keys(SCENARIO_LABELS) as Lesson22Scenario[]) {
      for (const r of scenarioInput(s).reveals) {
        expect(r.caption.length).toBeLessThanOrEqual(120);
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
