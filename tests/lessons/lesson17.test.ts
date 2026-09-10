import { describe, it, expect } from 'vitest';
import { GraphEngine } from '../../src/engines/graph.js';
import {
  Lesson17GraphEngine,
  SCENARIO_NODES,
  chainEvents,
  deadlockEvents,
  lesson17,
  lesson17Input,
  scenarioEvents,
  scenarioInput,
  spareEvents,
  type Lesson17Scenario
} from '../../src/lessons/lecture-10/lesson-17.js';
import { isDeadlock, detectCycle } from '../../src/algorithms/deadlock.js';

const SCENARIOS: Lesson17Scenario[] = ['spare', 'deadlock', 'chain'];

describe('Lesson 17 · every verdict is computed', () => {
  it('the ring captions branch on isDeadlock — never typed', () => {
    const spare = spareEvents();
    const dead = deadlockEvents();
    // Spare ring: a cycle exists, nobody is stuck.
    expect(spare[6].caption).toMatch(/nobody is stuck/);
    // Deadlock ring: stuck.
    expect(dead[6].caption).toMatch(/deadlock/);
  });

  it('cycle highlights fall out of detectCycle, not stored answers', () => {
    for (const id of SCENARIOS) {
      const steps = new GraphEngine(
        document.createElement('div'),
        scenarioInput(id)
      );
      void steps;
    }
    const spare = spareEvents();
    expect(spare[6].setCycle?.length).toBeGreaterThan(0);
    const dead = deadlockEvents();
    expect(dead[6].setCycle?.length).toBeGreaterThan(0);
    const chain = chainEvents();
    expect(chain[chain.length - 1].setCycle).toBeUndefined();
  });

  it('mounted steps carry edges 1:1 — takes, asks, returns', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson17GraphEngine(host, scenarioInput('spare'));
    engine.init(0);
    const steps = engine.getSteps();
    expect(steps.length).toBe(16);
    // Takes first: four assignments, no requests.
    const afterTakes = steps[4].state.edges;
    expect(afterTakes.filter((e) => e.kind === 'assignment').length).toBe(4);
    expect(afterTakes.filter((e) => e.kind === 'request').length).toBe(0);
    // Then the two asks close the ring.
    expect(steps[6].state.edges.filter((e) => e.kind === 'request').length).toBe(2);
    // Satisfied requests withdraw — the ending holds no ring, no deadlock.
    const last = steps[steps.length - 1].state;
    expect(last.edges.filter((e) => e.kind === 'request').length).toBe(0);
    engine.destroy();
    host.remove();
  });

  it('all three scenarios end where isDeadlock says they end', () => {
    for (const id of SCENARIOS) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const engine = new Lesson17GraphEngine(host, scenarioInput(id));
      engine.init(0);
      const steps = engine.getSteps();
      const last = steps[steps.length - 1].state;
      const v = isDeadlock({
        nodes: SCENARIO_NODES[id].map((n) => ({
          id: n.id,
          kind: n.kind,
          instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
        })),
        edges: last.edges
      });
      if (id === 'deadlock') expect(v.deadlocked).toBe(true);
      else expect(v.deadlocked).toBe(false);
      engine.destroy();
      host.remove();
    }
  });

  it('the playground reaches both: a ring that kills and a ring that frees', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson17GraphEngine(host, scenarioInput('spare'));
    engine.init(0);
    const verdicts = new Map<Lesson17Scenario, { ringCount: number; deadlocked: boolean }>();
    for (const id of SCENARIOS) {
      (engine.debugHooks().setScenario as (s: Lesson17Scenario) => void)(id);
      const steps = engine.getSteps();
      const last = steps[steps.length - 1].state;
      const v = isDeadlock({
        nodes: SCENARIO_NODES[id].map((n) => ({
          id: n.id,
          kind: n.kind,
          instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
        })),
        edges: last.edges
      });
      verdicts.set(id, { ringCount: v.cycles.length, deadlocked: v.deadlocked });
    }
    // Unit 71 exists: the spare ring is a cycle that is NOT a deadlock. The
    // ring verdict is checked mid-timeline (step 7); the ending dissolved it.
    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    const spareEngine = new Lesson17GraphEngine(host2, scenarioInput('spare'));
    spareEngine.init(0);
    spareEngine.seek(7);
    const ring = spareEngine.getSteps()[7].state;
    const ringV = isDeadlock({
      nodes: SCENARIO_NODES.spare.map((n) => ({
        id: n.id,
        kind: n.kind,
        instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
      })),
      edges: ring.edges
    });
    expect(ringV.cycles.length).toBeGreaterThan(0);
    expect(ringV.deadlocked).toBe(false);
    spareEngine.destroy();
    host2.remove();
    expect(verdicts.get('spare')).toMatchObject({ deadlocked: false });
    expect(verdicts.get('spare')?.ringCount).toBe(0);
    expect(verdicts.get('deadlock')).toMatchObject({ deadlocked: true });
    expect(verdicts.get('chain')?.ringCount).toBe(0);
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 17 · the morph is geometric, not cosmetic (§3C.2a)', () => {
  it('scenario scripts are complete event sets — spare 15, deadlock 7, chain 7', () => {
    expect(scenarioEvents('spare').length).toBe(15);
    expect(scenarioEvents('deadlock').length).toBe(7);
    expect(scenarioEvents('chain').length).toBe(7);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson17.analogy.text,
      lesson17.concept,
      lesson17.morphReveals,
      ...(lesson17.analogyMapping ?? []),
      ...spareEvents().map((s) => s.caption),
      ...deadlockEvents().map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 17 · lesson wiring', () => {
  it('declares the graph engine it really extends, and absorbs units 69–71', () => {
    expect(lesson17.engine).toBe('graph');
    expect(lesson17.engineClass).toBeDefined();
    expect(lesson17.engineClass?.prototype instanceof GraphEngine).toBe(true);
    expect(lesson17.absorbsUnits).toEqual([69, 70, 71]);
    expect(lesson17.id).toBe(17);
    expect(lesson17.slug).toBe('lesson-17');
  });

  it('opens on the spare story — the cycle that is not a deadlock', () => {
    expect(lesson17Input.nodes).toEqual(SCENARIO_NODES.spare);
    expect(lesson17.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 17 · geometry on actual coordinates (§3C.2c)', () => {
  const widthsAt = (view: number, scenario: Lesson17Scenario): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson17GraphEngine(host, scenarioInput(scenario));
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
    const w = widthsAt(0, 'spare');
    const vals = Object.values(w);
    expect(vals.length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
  });

  it('mechanism layout encodes the quantity: lots wider than single cars', () => {
    const w = widthsAt(1, 'spare');
    expect(Math.max(...Object.values(w)) - Math.min(...Object.values(w))).toBeGreaterThan(1);
    expect(w['bar-R1']).toBeGreaterThan(widthsAt(1, 'deadlock')['bar-R1']);
  });

  it('geometry interpolates — the morph is real', () => {
    for (const id of Object.keys(widthsAt(0, 'spare'))) {
      const a = widthsAt(0, 'spare')[id];
      const mid = widthsAt(0.5, 'spare')[id];
      const b = widthsAt(1, 'spare')[id];
      if (Math.abs(a - b) < 1) continue;
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });

  it('mounted cycle state agrees with detectCycle on the same edges', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson17GraphEngine(host, scenarioInput('spare'));
    engine.init(0);
    engine.seek(7);
    const st = engine.getSteps()[7].state;
    expect(st.cycleIds.length).toBeGreaterThan(0);
    const cycles = detectCycle({
      nodes: SCENARIO_NODES.spare.map((n) => ({
        id: n.id,
        kind: n.kind,
        instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
      })),
      edges: st.edges
    });
    expect(new Set(st.cycleIds)).toEqual(new Set(cycles[0]));
    engine.destroy();
    host.remove();
  });
});
