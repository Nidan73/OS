import { describe, expect, it } from 'vitest';
import type { AnimationEngine } from '../../src/core/engine.js';
import type { Lesson } from '../../src/core/types.js';
import { GanttEngine } from '../../src/engines/gantt.js';
import { QueueEngine } from '../../src/engines/queue.js';
import { TraceEngine } from '../../src/engines/trace.js';
import { CounterEngine } from '../../src/engines/counter.js';
import { GraphEngine } from '../../src/engines/graph.js';
import { MatrixEngine } from '../../src/engines/matrix.js';
import { DiagramEngine } from '../../src/engines/diagram.js';

// Lessons that use a shared engine by id resolve it the same way
// mountLesson does; scoped engines carry engineClass directly.
const SHARED_ENGINES: Record<string, new (host: HTMLElement, input: unknown) => AnimationEngine<unknown, unknown>> = {
  gantt: GanttEngine as never,
  queue: QueueEngine as never,
  trace: TraceEngine as never,
  counter: CounterEngine as never,
  graph: GraphEngine as never,
  matrix: MatrixEngine as never,
  diagram: DiagramEngine as never
};

// The runtime guard the browser probe exposed the need for: unit tests can
// assert on source-level event arrays while the lesson's engine drops fields
// at step build, so nine lessons shipped with steps that had no analogy
// caption even though their sources looked covered. This mounts every
// lesson's real engine and asserts what the student actually receives: every
// step, both lenses, inside the rail.

const modules = import.meta.glob('../../src/lessons/**/*.ts', { eager: true }) as Record<
  string,
  { lesson?: Lesson<unknown, unknown>; default?: Lesson<unknown, unknown> }
>;

const lessons = Object.entries(modules)
  .map(([filePath, m]) => ({ filePath, lesson: m.lesson ?? m.default }))
  .filter((l): l is { filePath: string; lesson: Lesson<unknown, unknown> } => Boolean(l.lesson))
  .sort((a, b) => a.lesson.id - b.lesson.id);

expect(lessons.length).toBe(24);

const RAIL = 320;

describe('runtime caption coverage: every lesson speaks both lenses on every step', () => {
  it('all 24 lessons are registered with a resolvable engine and an input', () => {
    for (const { filePath, lesson } of lessons) {
      const engine = lesson.engineClass ?? SHARED_ENGINES[lesson.engine];
      expect(engine, filePath).toBeDefined();
      expect(lesson.input, filePath).toBeDefined();
    }
  });

  for (const { lesson } of lessons) {
    it(`${lesson.slug}: every step carries both captions within the rail`, () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const Ctor = (lesson.engineClass ?? SHARED_ENGINES[lesson.engine]) as new (
        host: HTMLElement,
        input: unknown
      ) => AnimationEngine<unknown, unknown>;
      const engine = new Ctor(host, structuredClone(lesson.input));
      engine.init(0);
      const steps = engine.getSteps();
      expect(steps.length, lesson.slug).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.caption.length, `${lesson.slug} #${step.t}: ${step.caption}`).toBeGreaterThan(0);
        expect(step.caption.length, `${lesson.slug} #${step.t}: ${step.caption}`).toBeLessThanOrEqual(RAIL);
        expect(
          step.analogyCaption,
          `${lesson.slug} #${step.t} missing the scene voice: ${step.caption}`
        ).toBeDefined();
        expect(
          (step.analogyCaption ?? '').length,
          `${lesson.slug} #${step.t}: ${step.analogyCaption}`
        ).toBeLessThanOrEqual(RAIL);
      }
      engine.destroy();
      host.remove();
    });
  }
});
