import { describe, it, expect } from 'vitest';
import { GraphEngine } from '../../src/engines/graph.js';
import {
  Lesson16GraphEngine,
  MODE_NODES,
  atomicEvents,
  lesson16,
  lesson16Input,
  modeEvents,
  modeInput,
  orderedEvents,
  preemptEvents,
  shareEvents,
  storyEvents,
  type Lesson16Mode
} from '../../src/lessons/lecture-10/lesson-16.js';
import { isDeadlock, detectCycle } from '../../src/algorithms/deadlock.js';

const MODES: Lesson16Mode[] = ['story', 'share', 'atomic', 'preempt', 'ordered'];

function ragOfMode(mode: Lesson16Mode, edges: { from: string; to: string; kind: 'request' | 'assignment' | 'claim' }[]) {
  return {
    nodes: MODE_NODES[mode].map((n) => ({
      id: n.id,
      kind: n.kind,
      instances: n.kind === 'resource' ? (n.instances ?? 1) : 1
    })),
    edges: edges.map((e) => ({ ...e }))
  };
}

describe('Lesson 16 · every verdict is computed', () => {
  it('the story ring is a deadlock, isDeadlock on the final edges says so', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput('story'));
    engine.init(0);
    const steps = engine.getSteps();
    const ring = steps[8].state;
    const v = isDeadlock(ragOfMode('story', ring.edges));
    expect(v.cycles.length).toBeGreaterThan(0);
    expect(v.deadlocked).toBe(true);
    const last = steps[steps.length - 1].state;
    expect(isDeadlock(ragOfMode('story', last.edges)).deadlocked).toBe(true);
    engine.destroy();
    host.remove();
  });

  it('the ring caption branches on isDeadlock, never typed', () => {
    const story = storyEvents();
    expect(story[7].caption).toMatch(/deadlock|Neither will ever eat/);
    expect(shareEvents().at(-1)?.caption).toMatch(/impossible/);
  });

  it('cycle highlights fall out of detectCycle, not stored answers', () => {
    const story = storyEvents();
    expect(story[7].setCycle?.length).toBeGreaterThan(0);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput('story'));
    engine.init(0);
    engine.seek(8);
    const st = engine.getSteps()[8].state;
    const cycles = detectCycle(ragOfMode('story', st.edges));
    expect(new Set(st.cycleIds)).toEqual(new Set(cycles[0]));
    engine.destroy();
    host.remove();
  });

  it('request, use, release is an edge lifecycle, ask, take up, give back', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput('story'));
    engine.init(0);
    const steps = engine.getSteps();
    // Step 1: the ask, a pending request edge.
    expect(steps[1].state.edges).toEqual([{ from: 'T1', to: 'M1', kind: 'request' }]);
    // Step 2: taken up, the request is gone, the hold is there.
    expect(steps[2].state.edges).toEqual([{ from: 'M1', to: 'T1', kind: 'assignment' }]);
    // Step 3: released, nothing held, nothing asked.
    expect(steps[3].state.edges).toEqual([]);
    engine.destroy();
    host.remove();
  });

  it('every removal ends fed, computed, not staged', () => {
    for (const mode of MODES) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const engine = new Lesson16GraphEngine(host, modeInput(mode));
      engine.init(0);
      const steps = engine.getSteps();
      const last = steps[steps.length - 1].state;
      const v = isDeadlock(ragOfMode(mode, last.edges));
      if (mode === 'story') expect(v.deadlocked).toBe(true);
      else {
        expect(v.cycles.length).toBe(0);
        expect(v.deadlocked).toBe(false);
      }
      engine.destroy();
      host.remove();
    }
  });

  it('no removal ever holds one while asking for another, except preempt mid-beat', () => {
    // Hold-and-wait is the property that turns waiting into deadlock: in
    // every removal ending, no process both holds and waits. (Preempt passes
    // through it mid-timeline, that is the condition being removed.)
    for (const mode of ['share', 'atomic', 'ordered'] as Lesson16Mode[]) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const engine = new Lesson16GraphEngine(host, modeInput(mode));
      engine.init(0);
      for (const s of engine.getSteps()) {
        const held = new Set(
          s.state.edges.filter((e) => e.kind === 'assignment').map((e) => e.to)
        );
        const waiting = new Set(
          s.state.edges.filter((e) => e.kind === 'request').map((e) => e.from)
        );
        for (const p of held) expect(waiting.has(p)).toBe(false);
      }
      engine.destroy();
      host.remove();
    }
  });
});

describe('Lesson 16 · the conditions are highlights, not bullets', () => {
  it('four condition beats, each naming its condition on the same picture', () => {
    const story = storyEvents();
    const conds = story.slice(8, 12);
    expect(conds[0].caption).toMatch(/Mutual exclusion/);
    expect(conds[1].caption).toMatch(/Hold and wait/);
    expect(conds[2].caption).toMatch(/No preemption/);
    expect(conds[3].caption).toMatch(/Circular wait/);
    // Same picture: no edge moves during the four beats.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput('story'));
    engine.init(0);
    const steps = engine.getSteps();
    const edgeSets = [9, 10, 11, 12].map((i) => JSON.stringify(steps[i].state.edges));
    expect(new Set(edgeSets).size).toBe(1);
    engine.destroy();
    host.remove();
  });

  it('mode scripts are complete event sets, story 12, share 9, atomic 11, preempt 13, ordered 11', () => {
    expect(storyEvents().length).toBe(12);
    expect(shareEvents().length).toBe(9);
    expect(atomicEvents().length).toBe(11);
    expect(preemptEvents().length).toBe(13);
    expect(orderedEvents().length).toBe(11);
  });
});

describe('Lesson 16 · the playground removes each condition', () => {
  it('all five modes rebuild steps and verdicts through debugHooks', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput('story'));
    engine.init(0);
    const setMode = engine.debugHooks().setMode as (m: Lesson16Mode) => void;
    for (const mode of MODES) {
      setMode(mode);
      expect((engine.debugHooks().getMode as () => Lesson16Mode)()).toBe(mode);
      const steps = engine.getSteps();
      expect(steps.length).toBe(modeEvents(mode).length + 1);
      const last = steps[steps.length - 1].state;
      const v = isDeadlock(ragOfMode(mode, last.edges));
      if (mode === 'story') expect(v.deadlocked).toBe(true);
      else expect(v.deadlocked).toBe(false);
    }
    engine.destroy();
    host.remove();
  });
});

describe('Lesson 16 · copy agrees with the mechanism', () => {
  it('each removal is staged as computed, the concept says so', () => {
    expect(lesson16.concept).toMatch(/computed, not staged/);
  });

  it('no internal vocabulary reaches the student', () => {
    const copy = [
      lesson16.analogy.text,
      lesson16.concept,
      lesson16.morphReveals,
      ...(lesson16.analogyMapping ?? []),
      ...storyEvents().map((s) => s.caption),
      ...shareEvents().map((s) => s.caption),
      ...atomicEvents().map((s) => s.caption),
      ...preemptEvents().map((s) => s.caption),
      ...orderedEvents().map((s) => s.caption)
    ].join('\n');
    for (const rx of [/\bAtlas unit/i, /\bisomorph/i, /\bSPEC\.md\b/i, /\bview\s*=\s*[01]\b/i, /\bmorphMode\b/, /\bengine\b(?!ering)/i, /§\s*\d/]) {
      expect(copy).not.toMatch(rx);
    }
  });
});

describe('Lesson 16 · lesson wiring', () => {
  it('declares the graph engine it really extends, and absorbs units 63–68', () => {
    expect(lesson16.engine).toBe('graph');
    expect(lesson16.engineClass).toBeDefined();
    expect(lesson16.engineClass?.prototype instanceof GraphEngine).toBe(true);
    expect(lesson16.absorbsUnits).toEqual([63, 64, 65, 66, 67, 68]);
    expect(lesson16.id).toBe(16);
    expect(lesson16.slug).toBe('lesson-16');
  });

  it('opens on the founding scene, both reach across', () => {
    expect(lesson16Input.nodes.map((n) => n.id)).toEqual(['T1', 'T2', 'M1', 'M2']);
    expect(lesson16.input.events.length).toBeGreaterThan(0);
  });
});

describe('Lesson 16 · geometry on actual coordinates (§3C.2c)', () => {
  const widthsAt = (view: number, mode: Lesson16Mode): Record<string, number> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = new Lesson16GraphEngine(host, modeInput(mode));
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
    const w = widthsAt(0, 'story');
    const vals = Object.values(w);
    expect(vals.length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1);
  });

  it('mechanism layout encodes the quantity: holders wider than the empty', () => {
    const w = widthsAt(1, 'story');
    expect(Math.max(...Object.values(w)) - Math.min(...Object.values(w))).toBeGreaterThan(1);
    // Split chopsticks are wider than single ones, instances are geometry.
    expect(widthsAt(1, 'share')['bar-M1']).toBeGreaterThan(w['bar-M1']);
  });

  it('geometry interpolates, the morph is real', () => {
    for (const id of Object.keys(widthsAt(0, 'story'))) {
      const a = widthsAt(0, 'story')[id];
      const mid = widthsAt(0.5, 'story')[id];
      const b = widthsAt(1, 'story')[id];
      if (Math.abs(a - b) < 1) continue;
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });
});
