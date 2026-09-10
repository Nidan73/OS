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
    text: 'At a café, diners eat a course and then pause while the kitchen prepares the next. Eating is active CPU execution; waiting for dishes or the bill is an I/O wait. Because nobody eats continuously for hours, the counter would sit idle without a scheduler choosing who gets served next.'
  },
  concept: 'Process execution consists of an alternating cycle of CPU execution and I/O wait. Because processes frequently pause for I/O and short CPU bursts dominate real workloads, multiprogramming keeps the CPU productive. The CPU scheduler selects a runnable process from the ready queue whenever the CPU becomes idle, and the dispatcher performs the context switch to hand over execution.',
  morphReveals: 'In a café seating queue, every diner occupies an equal physical footprint. On a timeline, width becomes duration — showing alternating bursts of CPU work and waiting gaps where other processes can run.',
  morphMode: 'morph',
  analogyMapping: [
    'Diner eating a course ➔ Process executing a CPU burst',
    'Diner waiting for next dish ➔ Process waiting on an I/O burst',
    'Full tasting menu (P1) ➔ CPU-bound process with long burst (24 ms)',
    'Quick espressos (P2, P3) ➔ I/O-bound processes with short bursts (3 ms)',
    'Café host / cashier ➔ CPU Scheduler selecting from ready queue',
    'Table clearing & setup ➔ Dispatcher context switch overhead'
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
      type: 'cafe',
      serviceLabel: 'Café Service Counter',
      serviceSublabel: 'Single Barista (CPU Core)',
      queueLabel: 'Café Seating Queue',
      items: {
        P1: { customerName: 'Tasting Menu Diner', orderText: 'Full 5-Course Meal (24 min)', orderIcon: 'party-burger', avatarColor: '#E65100' },
        P2: { customerName: 'Espresso Drinker', orderText: 'Single Espresso (3 min)', orderIcon: 'coffee', avatarColor: '#1565C0' },
        P3: { customerName: 'Pastry Guest', orderText: 'Croissant & Tea (3 min)', orderIcon: 'coffee', avatarColor: '#2E7D32' }
      }
    }
  }
};

export default lesson01;
