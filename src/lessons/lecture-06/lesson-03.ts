import type { Lesson } from '../../core/types.js';
import type { GanttInput } from '../../engines/gantt.js';

// DENSITY (Task A audit): correct at 10, four dispatches, four completions,
// the arrival frame and the computed 7 ms summary. The deck's units 9–11
// (SJF, the slide-11 discrepancy, burst prediction, SRTF) live in the concept
// copy and the playground's SRTF toggle, not the timeline: prediction has no
// discrete mechanism event to step through, and the staggered-arrival variant
// would contradict the published 7 ms the lesson preserves. Ten is the full
// SJF event set.

/**
 * Lesson 03: Shortest Job First, and Why You Can't Have It
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
  title: "Shortest Job First, and Why You Can't Have It",
  absorbsUnits: [9, 10, 11],
  slides: 'slides 10–15',
  engine: 'gantt',
  analogy: {
    domain: 'food',
    text: 
      'Ammu is watching the pass at Yum Cha with four tickets in front of her, and she has decided to try something. Instead of cooking in the order they arrived, she is going to send out the quickest plate first, then the next quickest, and so on.\n\n' +
      'It works beautifully. The tables with small orders are eating within minutes. The average wait across all four tables drops to a number she can be proud of, and she can prove it is the lowest possible.\n\n' +
      'Then she tries to use the same rule tomorrow and discovers the problem. To send the shortest order first she has to know how long each order will take, and she does not. She has a new cook, a ticket she has never seen before, and a kitchen that will only tell her how long something takes by cooking it.\n\n' +
      'That gap between "provably the best rule" and "impossible to actually follow" is the whole lesson.'
  },
  concept: "Shortest-Job-First (SJF) associates each process with the length of its next CPU burst, scheduling the shortest job first to provably minimize average waiting time. Because the operating system cannot know future burst lengths in advance, systems approximate SJF using exponential averaging to predict bursts from past behavior, or use preemptive Shortest-Remaining-Time-First (SRTF) when new jobs arrive. Note on Lecture Slide 11: Although the slide table mentions staggered arrivals 0, 2, 4, and 5, the published 7 ms average wait time mathematically requires all processes to be present at t=0; this lesson displays the true 7 ms schedule without showing misleading arrival offsets that the algorithm would ignore.",
  morphReveals: 'At the table each guest holds one plate. On a schedule width is cooking time, sending the quick plates first minimizes the whole table wait.',
  morphMode: 'morph',
  analogyMapping: [
    'Restaurant Kitchen ➔ CPU Core',
    'Plate Cooking Time ➔ CPU Burst Length',
    'Orders Waiting ➔ Ready Queue',
    'Quick Plates First ➔ SJF Scheduling',
    'Cook Guessing Dish Time ➔ Burst Prediction (Exponential Averaging)',
    'New Quick Plate Arriving Mid-Cook ➔ SRTF (Preemptive SJF)'
  ],
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
      type: 'kitchen',
      serviceLabel: 'Family Kitchen',
      serviceSublabel: 'One Cook (Single Core)',
      queueLabel: 'Dishes Waiting',
      items: {
        P1: {
          customerName: 'P1 · Curry Pot',
          orderText: '6 min on the flame',
          orderIcon: 'meal',
          avatarColor: '#1565C0'
        },
        P2: {
          customerName: 'P2 · Roast Platter',
          orderText: '8 min on the flame',
          orderIcon: 'party-burger',
          avatarColor: '#E65100'
        },
        P3: {
          customerName: 'P3 · Rice Pot',
          orderText: '7 min on the flame',
          orderIcon: 'party-burger',
          avatarColor: '#7B1FA2'
        },
        P4: {
          customerName: 'P4 · Omelette',
          orderText: '3 min on the flame',
          orderIcon: 'coffee',
          avatarColor: '#2E7D32'
        }
      }
    }
  }
};

export default lesson03;
