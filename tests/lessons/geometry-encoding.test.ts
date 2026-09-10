import { describe, it, expect } from 'vitest';
import { lesson01 } from '../../src/lessons/lecture-06/lesson-01.js';
import { lesson02 } from '../../src/lessons/lecture-06/lesson-02.js';
import { lesson03 } from '../../src/lessons/lecture-06/lesson-03.js';
import { lesson04, RoundRobinGanttEngine } from '../../src/lessons/lecture-06/lesson-04.js';
import { lesson05, AgingGanttEngine } from '../../src/lessons/lecture-06/lesson-05.js';
import { lesson06 } from '../../src/lessons/lecture-07/lesson-06.js';
import { lesson07, SMTQueueEngine } from '../../src/lessons/lecture-07/lesson-07.js';
import { lesson08, MigrationQueueEngine } from '../../src/lessons/lecture-07/lesson-08.js';
import { lesson09, RealtimeDiagramEngine } from '../../src/lessons/lecture-07/lesson-09.js';
import { lesson10, RaceTraceEngine } from '../../src/lessons/lecture-08/lesson-10.js';
import { lesson11, CriticalSectionEngine } from '../../src/lessons/lecture-08/lesson-11.js';
import { lesson12, PetersonEngine } from '../../src/lessons/lecture-08/lesson-12.js';
import { lesson13, AtomicCounterEngine } from '../../src/lessons/lecture-09/lesson-13.js';
import { lesson14, LockCounterEngine } from '../../src/lessons/lecture-09/lesson-14.js';
import { lesson15, SemaphoreCounterEngine } from '../../src/lessons/lecture-09/lesson-15.js';
import { lesson16, Lesson16GraphEngine } from '../../src/lessons/lecture-10/lesson-16.js';
import { lesson17, Lesson17GraphEngine } from '../../src/lessons/lecture-10/lesson-17.js';
import { lesson20, Lesson20MatrixEngine } from '../../src/lessons/lecture-10/lesson-20.js';
import { GanttEngine } from '../../src/engines/gantt.js';
import { QueueEngine } from '../../src/engines/queue.js';

/**
 * Part 4b gate: no lesson may render every element identically sized at every
 * step. A uniform resize across the morph is a reskin (§3C.2a), the mechanism
 * view must encode SOMETHING per entity, so across each lesson's timeline at
 * view 1 at least one step must show two [id^="bar-"] entities with widths
 * differing by more than 1px. Uniform-at-rest steps (all idle, step 0) are
 * fine; uniform-EVERYWHERE fails.
 *
 * Proved by re-injecting the old CounterEngine constants (every token 54px →
 * 84px): lessons 13/14/15 fail this check (see Part 4 report). A check that
 * has never been seen to fail is not yet a check.
 */
interface Mounted {
  engine: { getSteps(): Array<unknown>; seek(i: number): void; destroy(): void };
  host: HTMLElement;
}

const CASES: Array<{ slug: string; make: () => Mounted }> = [
  { slug: 'lesson-01', make: () => mount(GanttEngine, lesson01.input) },
  { slug: 'lesson-02', make: () => mount(GanttEngine, lesson02.input) },
  { slug: 'lesson-03', make: () => mount(GanttEngine, lesson03.input) },
  { slug: 'lesson-04', make: () => mount(RoundRobinGanttEngine, lesson04.input) },
  { slug: 'lesson-05', make: () => mount(AgingGanttEngine, lesson05.input) },
  { slug: 'lesson-06', make: () => mount(QueueEngine, lesson06.input) },
  { slug: 'lesson-07', make: () => mount(SMTQueueEngine, lesson07.input) },
  { slug: 'lesson-08', make: () => mount(MigrationQueueEngine, lesson08.input) },
  { slug: 'lesson-09', make: () => mount(RealtimeDiagramEngine, lesson09.input) },
  { slug: 'lesson-10', make: () => mount(RaceTraceEngine, lesson10.input) },
  { slug: 'lesson-11', make: () => mount(CriticalSectionEngine, lesson11.input) },
  { slug: 'lesson-12', make: () => mount(PetersonEngine, lesson12.input) },
  { slug: 'lesson-13', make: () => mount(AtomicCounterEngine, lesson13.input) },
  { slug: 'lesson-14', make: () => mount(LockCounterEngine, lesson14.input) },
  { slug: 'lesson-15', make: () => mount(SemaphoreCounterEngine, lesson15.input) },
  { slug: 'lesson-16', make: () => mount(Lesson16GraphEngine, lesson16.input) },
  { slug: 'lesson-17', make: () => mount(Lesson17GraphEngine, lesson17.input) },
  { slug: 'lesson-20', make: () => mount(Lesson20MatrixEngine, lesson20.input) }
];

function mount(Cls: new (host: HTMLElement, input: never) => {
  getSteps(): Array<unknown>;
  seek(i: number): void;
  init(view?: number): void;
  destroy(): void;
}, input: unknown): Mounted {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const engine = new Cls(host, JSON.parse(JSON.stringify(input)) as never);
  engine.init(1);
  return { engine, host };
}

/** Width of one morphable entity: its own width attr (gantt rects carry the id
 *  themselves) else its first shaped child's (queue/counter/diagram groups). */
function entityWidth(g: Element): number {
  const own = g.getAttribute('width');
  if (own !== null) return parseFloat(own);
  const child = g.querySelector('rect,circle,ellipse,line');
  const w = child?.getAttribute('width');
  return w !== null && w !== undefined ? parseFloat(w) : NaN;
}

function maxWidthSpread(entry: Mounted): { spread: number; step: number } {
  const n = entry.engine.getSteps().length;
  let best = { spread: 0, step: -1 };
  for (let i = 0; i < n; i++) {
    entry.engine.seek(i);
    const widths = [...entry.host.querySelectorAll('[id^="bar-"]')]
      .map(entityWidth)
      .filter((w) => Number.isFinite(w));
    if (widths.length >= 2) {
      const spread = Math.max(...widths) - Math.min(...widths);
      if (spread > best.spread) best = { spread, step: i };
    }
  }
  return best;
}

describe('gate · every lesson encodes something in geometry (§3C.2a)', () => {
  it('covers every shipped lesson', () => {
    expect(CASES.map((c) => c.slug).sort()).toEqual([
      'lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05',
      'lesson-06', 'lesson-07', 'lesson-08', 'lesson-09',
      'lesson-10', 'lesson-11', 'lesson-12', 'lesson-13', 'lesson-14', 'lesson-15',
      'lesson-16', 'lesson-17', 'lesson-20'
    ]);
  });

  for (const { slug, make } of CASES) {
    it(`${slug} differentiates at least two entities at view 1 on some step`, () => {
      const { engine, host } = make();
      try {
        const best = maxWidthSpread({ engine, host });
        expect(
          best.spread,
          `${slug}: every [id^="bar-"] entity is identically sized at every step (max spread ${best.spread.toFixed(2)}px), a uniform resize is a reskin, not a morph (§3C.2a)`
        ).toBeGreaterThan(1);
      } finally {
        engine.destroy();
        host.remove();
      }
    });
  }
});
