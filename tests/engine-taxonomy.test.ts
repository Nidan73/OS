import { describe, it, expect } from 'vitest';
import type { Lesson, EngineId } from '../src/core/types.js';
import { GanttEngine } from '../src/engines/gantt.js';
import { QueueEngine } from '../src/engines/queue.js';
import { TraceEngine } from '../src/engines/trace.js';
import { CounterEngine } from '../src/engines/counter.js';
import { DiagramEngine } from '../src/engines/diagram.js';
import { lesson01 } from '../src/lessons/lecture-06/lesson-01.js';
import { lesson02 } from '../src/lessons/lecture-06/lesson-02.js';
import { lesson03 } from '../src/lessons/lecture-06/lesson-03.js';
import { lesson04 } from '../src/lessons/lecture-06/lesson-04.js';
import { lesson05 } from '../src/lessons/lecture-06/lesson-05.js';
import { lesson06 } from '../src/lessons/lecture-07/lesson-06.js';
import { lesson07 } from '../src/lessons/lecture-07/lesson-07.js';
import { lesson08 } from '../src/lessons/lecture-07/lesson-08.js';
import { lesson09 } from '../src/lessons/lecture-07/lesson-09.js';
import { lesson10 } from '../src/lessons/lecture-08/lesson-10.js';
import { lesson11 } from '../src/lessons/lecture-08/lesson-11.js';
import { lesson12 } from '../src/lessons/lecture-08/lesson-12.js';
import { lesson13 } from '../src/lessons/lecture-09/lesson-13.js';
import { lesson14 } from '../src/lessons/lecture-09/lesson-14.js';

const SHARED: Record<Exclude<EngineId, 'standalone' | 'graph' | 'matrix'>, unknown> = {
  gantt: GanttEngine,
  queue: QueueEngine,
  trace: TraceEngine,
  counter: CounterEngine,
  diagram: DiagramEngine
};

/**
 * The declared `engine` field must match what engineClass actually extends.
 * `standalone` (direct AnimationEngine subclass) is legitimate when no
 * shared engine's state shape fits — but it must be said, not the default.
 */
describe('engine taxonomy: declared engine id matches the real inheritance', () => {
  const lessons: Lesson<any, any>[] = [
    lesson01, lesson02, lesson03, lesson04, lesson05,
    lesson06, lesson07, lesson08, lesson09,
    lesson10, lesson11, lesson12, lesson13, lesson14
  ];

  it('covers every shipped lesson', () => {
    expect(lessons.map(l => l.slug).sort()).toEqual([
      'lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05',
      'lesson-06', 'lesson-07', 'lesson-08', 'lesson-09',
      'lesson-10', 'lesson-11', 'lesson-12', 'lesson-13', 'lesson-14'
    ]);
  });

  it('a shared engine id means engineClass extends that engine', () => {
    for (const lesson of lessons) {
      if (lesson.engine === 'standalone' || !lesson.engineClass) continue;
      const base = SHARED[lesson.engine as keyof typeof SHARED];
      expect(
        lesson.engineClass.prototype instanceof (base as new (...args: never[]) => unknown),
        `${lesson.slug} declares engine '${lesson.engine}' but its engineClass extends something else`
      ).toBe(true);
    }
  });

  it('standalone means engineClass bypasses every shared engine', () => {
    for (const lesson of lessons) {
      if (lesson.engine !== 'standalone') continue;
      expect(
        lesson.engineClass,
        `${lesson.slug} declares standalone but has no engineClass`
      ).toBeDefined();
      for (const base of Object.values(SHARED)) {
        expect(
          (lesson.engineClass as new (...args: never[]) => unknown).prototype instanceof
            (base as new (...args: never[]) => unknown),
          `${lesson.slug} declares standalone but actually extends a shared engine — declare the engine`
        ).toBe(false);
      }
    }
  });
});
