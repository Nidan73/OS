import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

/**
 * Lesson 03: Shortest Job First — and Why You Can't Have It
 * Absorbs Atlas Units 9, 10, 11 (Slides 10–15).
 *
 * CRITICAL SLIDE 11 DISCREPANCY RESOLUTION:
 * Slide 11 lists arrival times 0, 2, 4, 5 with bursts 7, 4, 1, 4 but publishes an
 * average waiting time of 7 ms. However, an average waiting time of 7 ms is only reachable
 * when all processes are available at t=0 (such as bursts 6, 8, 7, 3 under non-preemptive SJF,
 * which yields waiting times of P4:0, P1:3, P3:9, P2:16, avg 7 ms).
 * If staggered arrivals 0/2/4/5 are evaluated, non-preemptive SJF yields an average wait of 4 ms,
 * while preemptive SRTF yields 3 ms.
 * To maintain exam alignment, this lesson preserves the published schedule and 7 ms outcome,
 * setting all arrival times to 0 so that no ignored arrivals are displayed to students.
 */
export const lesson03: Lesson<GanttInput> = {
  id: 3,
  lecture: 6,
  slug: 'lesson-03',
  title: "Shortest Job First — and Why You Can't Have It",
  absorbsUnits: [9, 10, 11],
  slides: 'slides 10–15',
  engine: 'gantt',
  analogy: {
    domain: 'food',
    text: 'The supermarket express checkout lane — "10 items or fewer." Shoppers with full carts wait while customers with small baskets check out in seconds. Prioritizing shorter jobs minimizes overall waiting time, but the cashier cannot know the exact basket size in advance without inspecting every cart.'
  },
  concept: "Shortest-Job-First (SJF) associates each process with the length of its next CPU burst, scheduling the shortest job first to provably minimize average waiting time. Because the operating system cannot know future burst lengths in advance, systems approximate SJF using exponential averaging to predict bursts from past behavior, or use preemptive Shortest-Remaining-Time-First (SRTF) when new jobs arrive. Note on Lecture Slide 11: Although the slide table mentions staggered arrivals 0, 2, 4, and 5, the published 7 ms average wait time mathematically requires all processes to be present at t=0; this lesson displays the true 7 ms schedule without showing misleading arrival offsets that the algorithm would ignore.",
  morphReveals: 'In the supermarket line each shopper has one cart. On a schedule width is item count and service time — letting 1-item baskets go first minimizes overall line waiting.',
  morphMode: 'morph',
  analogyMapping: [
    'Supermarket Express Register ➔ CPU Core',
    'Basket Item Count ➔ CPU Burst Length',
    'Customer Queue ➔ Ready Queue',
    'Express Lane Rule (Shortest First) ➔ SJF Scheduling',
    'Cashier Guessing Order Size ➔ Burst Prediction (Exponential Averaging)',
    'Customer Preemption Mid-Checkout ➔ SRTF (Preemptive SJF)'
  ] as any,
  input: {
    processes: [
      { id: 'P1', arrival: 0, burst: 6 },
      { id: 'P2', arrival: 0, burst: 8 },
      { id: 'P3', arrival: 0, burst: 7 },
      { id: 'P4', arrival: 0, burst: 3 }
    ],
    algorithm: 'sjf',
    analogy: {
      domain: 'food',
      type: 'express-lane',
      serviceLabel: 'Express Register',
      serviceSublabel: 'Checkout Scanner (Single Core)',
      queueLabel: 'Express Checkout Queue',
      items: {
        P1: {
          customerName: 'Shopper P1',
          orderText: '6 items (6 min)',
          orderIcon: 'meal',
          avatarColor: '#1565C0'
        },
        P2: {
          customerName: 'Shopper P2',
          orderText: '8 items (8 min)',
          orderIcon: 'party-burger',
          avatarColor: '#E65100'
        },
        P3: {
          customerName: 'Shopper P3',
          orderText: '7 items (7 min)',
          orderIcon: 'party-burger',
          avatarColor: '#7B1FA2'
        },
        P4: {
          customerName: 'Shopper P4',
          orderText: '3 items (3 min)',
          orderIcon: 'coffee',
          avatarColor: '#2E7D32'
        }
      }
    }
  }
};

export default lesson03;
