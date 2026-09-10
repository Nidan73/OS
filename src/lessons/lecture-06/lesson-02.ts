import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

// DENSITY (Task A audit): correct at 8 — same FCFS trio as L01 (three
// dispatches, three completions, arrival frame, computed summary), because the
// convoy story IS L01's schedule re-read: the playground reversal to 3 ms is
// a recomputed schedule, not a new timeline beat. Splitting dispatch from
// completion is already done; further beats would narrate, not eventuate.
export const lesson02: Lesson<GanttInput> = {
  id: 2,
  lecture: 6,
  slug: 'lesson-02',
  title: 'First-Come, First-Served — and the Convoy',
  absorbsUnits: [7, 8],
  slides: 'slides 8–9',
  engine: 'gantt',
  analogy: {
    domain: 'food',
    text: 'A restaurant with one kitchen, where a party of forty ordered ahead of a couple who only wanted two coffees. Everyone behind the big order waits while the kitchen works through it, one dish at a time.'
  },
  concept: 'First-Come, First-Served (FCFS) allocates the CPU strictly in arrival order. When a CPU-bound process with a large burst runs ahead of short I/O-bound processes, all subsequent jobs queue up behind it — known as the Convoy Effect. Reordering the queue to run shorter jobs first drastically reduces average waiting time.',
  morphReveals: 'In a queue every person occupies equal space. On a timeline width becomes duration — so waiting depends on the time ahead of you, not the number of people ahead of you.',
  morphMode: 'morph',
  analogyMapping: [
    'Restaurant Kitchen ➔ CPU Core',
    'One Kitchen ➔ Uniprocessor Core',
    'Party Order for Forty (P1) ➔ CPU-bound job (burst 24)',
    'Two Coffees (P2, P3) ➔ I/O-bound jobs (burst 3)',
    'Order Sequence ➔ Ready Queue Arrival Sequence'
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
      type: 'restaurant',
      serviceLabel: 'Restaurant Kitchen',
      serviceSublabel: 'One Kitchen (Single CPU Core)',
      queueLabel: 'Orders Waiting',
      items: {
        P1: {
          customerName: 'Party Host',
          orderText: 'Party of Forty (24 min)',
          orderIcon: 'party-burger',
          avatarColor: '#E65100'
        },
        P2: {
          customerName: 'Father',
          orderText: 'Two Coffees (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#1565C0'
        },
        P3: {
          customerName: 'Mother',
          orderText: 'Two Coffees (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#2E7D32'
        }
      }
    }
  }
};

export default lesson02;
