import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

// DENSITY (Task A audit): correct at 8, three dispatches, three completions,
// the arrival frame and the computed summary. A fourth (P4) process would add
// two honest beats, but the deck's slide-5 burst cycle needs exactly this
// trio: one long CPU-bound burst against two short ones, the contrast the
// convoy lesson reuses. A summary split (e.g. wait-then-turnaround) would be
// padding, one computed average pair, one beat.
export const lesson01: Lesson<GanttInput> = {
  id: 1,
  lecture: 6,
  slug: 'lesson-01',
  title: 'Why a scheduler exists at all',
  absorbsUnits: [1, 2, 3, 4, 5],
  slides: 'slides 3–5',
  engine: 'gantt',
  analogy: {
    domain: 'food',
    text: 
      'Dinner at home never arrives all at once. Ammu brings the rice, everyone eats, and then there is a gap while she goes back for the next dish. Nobody sits there chewing continuously for two hours. You eat, you wait, you eat again.\n\n' +
      'Watch what the family does during the gap. They talk. Afra gets up to find Pechu. Nothing about the table is idle just because nobody is eating.\n\n' +
      'A processor works the same way and this is the entire reason schedulers exist. A program is not one long stretch of computing. It is a short burst of work, then a wait for something outside the processor, then another burst. If the processor simply sat still through every one of those waits, most of its life would be spent doing nothing at all.'
  },
  concept: 'Process execution consists of an alternating cycle of CPU execution and I/O wait. Because processes frequently pause for I/O and short CPU bursts dominate real workloads, multiprogramming keeps the CPU productive. The CPU scheduler selects a runnable process from the ready queue whenever the CPU becomes idle, and the dispatcher performs the context switch to hand over execution.',
  morphReveals: 'At the dinner table, every person seated around the dishes occupies an equal place. On a timeline, width becomes duration, showing alternating bursts of CPU work and waiting gaps where other processes can run.',
  morphMode: 'morph',
  analogyMapping: [
    'Family member eating a dish ➔ Process executing a CPU burst',
    'Waiting for Ammu to bring the next dish ➔ Process waiting on an I/O burst',
    'The full dinner spread (P1) ➔ CPU-bound process with long burst (24 ms)',
    'Quick bites before dinner (P2, P3) ➔ I/O-bound processes with short bursts (3 ms)',
    'Ammu deciding whose plate comes next ➔ CPU Scheduler selecting from ready queue',
    'Clearing a plate and laying the next dish ➔ Dispatcher context switch overhead'
  ],
  input: {
    processes: [
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 }
    ],
    algorithm: 'fcfs',
    analogy: {
      domain: 'food',
      type: 'dinner',
      serviceLabel: 'Dinner Table',
      serviceSublabel: 'Ammu Serving (CPU Core)',
      queueLabel: 'Seating Around the Dishes',
      items: {
        P1: { customerName: 'Abbu', orderText: 'Full Dinner Plate (24 min)', orderIcon: 'party-burger', avatarColor: '#E65100' },
        P2: { customerName: 'Arijit', orderText: 'Quick Side Dish (3 min)', orderIcon: 'coffee', avatarColor: '#1565C0' },
        P3: { customerName: 'Younger Brother', orderText: 'Quick Side Dish (3 min)', orderIcon: 'coffee', avatarColor: '#2E7D32' }
      }
    }
  }
};

export default lesson01;
