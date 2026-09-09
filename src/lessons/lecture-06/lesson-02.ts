import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

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
    text: 'A single-file food truck queue where one person orders for a party of forty meals. Customers behind ordering a single coffee are stuck waiting for the entire party order to be cooked.'
  },
  concept: 'First-Come, First-Served (FCFS) allocates the CPU strictly in arrival order. When a CPU-bound process with a large burst runs ahead of short I/O-bound processes, all subsequent jobs queue up behind it — known as the Convoy Effect. Reordering the queue to run shorter jobs first drastically reduces average waiting time.',
  morphReveals: 'In a queue every person occupies equal space. On a timeline width becomes duration — so waiting depends on the time ahead of you, not the number of people ahead of you.',
  morphMode: 'morph',
  analogyMapping: [
    'Food Truck Window ➔ CPU Core',
    'Single Cook ➔ Uniprocessor Core',
    'Party Order (P1) ➔ CPU-bound job (burst 24)',
    'Quick Coffees (P2, P3) ➔ I/O-bound jobs (burst 3)',
    'Queue Order ➔ Ready Queue Arrival Sequence'
  ] as any,
  input: {
    processes: [
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 }
    ],
    algorithm: 'fcfs',
    analogy: {
      domain: 'food',
      type: 'food-truck',
      serviceLabel: 'Food Truck Window',
      serviceSublabel: 'Single Cook (Single CPU Core)',
      queueLabel: 'Single-File Queue',
      items: {
        P1: {
          customerName: 'Party Organizer',
          orderText: 'Party of 24 Meals (24 min)',
          orderIcon: 'party-burger',
          avatarColor: '#E65100'
        },
        P2: {
          customerName: 'Morning Commuter',
          orderText: 'Single Coffee (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#1565C0'
        },
        P3: {
          customerName: 'Student',
          orderText: 'Single Coffee (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#2E7D32'
        }
      }
    }
  }
};

export default lesson02;
