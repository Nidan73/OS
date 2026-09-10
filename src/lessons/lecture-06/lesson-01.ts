import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

// DENSITY (Task A audit): correct at 8 — three dispatches, three completions,
// the arrival frame and the computed summary. A fourth (P4) process would add
// two honest beats, but the deck's slide-5 burst cycle needs exactly this
// trio: one long CPU-bound burst against two short ones, the contrast the
// convoy lesson reuses. A summary split (e.g. wait-then-turnaround) would be
// padding — one computed average pair, one beat.
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
    text: 'At home, dinner arrives dish by dish: the family eats one serving, then waits while mother brings the next from the kitchen. Eating is active CPU execution; waiting between servings is an I/O wait. Because nobody eats for hours without pause, the CPU would sit idle without a scheduler choosing who runs next.'
  },
  concept: 'Process execution consists of an alternating cycle of CPU execution and I/O wait. Because processes frequently pause for I/O and short CPU bursts dominate real workloads, multiprogramming keeps the CPU productive. The CPU scheduler selects a runnable process from the ready queue whenever the CPU becomes idle, and the dispatcher performs the context switch to hand over execution.',
  morphReveals: 'At the dinner table, every person seated around the dishes occupies an equal place. On a timeline, width becomes duration — showing alternating bursts of CPU work and waiting gaps where other processes can run.',
  morphMode: 'morph',
  analogyMapping: [
    'Family member eating a dish ➔ Process executing a CPU burst',
    'Waiting for mother to bring the next dish ➔ Process waiting on an I/O burst',
    'The full dinner spread (P1) ➔ CPU-bound process with long burst (24 ms)',
    'Quick bites before dinner (P2, P3) ➔ I/O-bound processes with short bursts (3 ms)',
    'Mother deciding whose plate comes next ➔ CPU Scheduler selecting from ready queue',
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
      serviceSublabel: 'Mother Serving (CPU Core)',
      queueLabel: 'Seating Around the Dishes',
      items: {
        P1: { customerName: 'Father', orderText: 'Full Dinner Plate (24 min)', orderIcon: 'party-burger', avatarColor: '#E65100' },
        P2: { customerName: 'Elder Sister', orderText: 'Quick Side Dish (3 min)', orderIcon: 'coffee', avatarColor: '#1565C0' },
        P3: { customerName: 'Younger Brother', orderText: 'Quick Side Dish (3 min)', orderIcon: 'coffee', avatarColor: '#2E7D32' }
      }
    }
  }
};

export default lesson01;
