import type { Unit } from '../../core/types.js';
import type { GanttInput, GanttState } from '../../engines/gantt.js';

export const unit: Unit<GanttInput, GanttState> = {
  id: 7,
  lecture: 6,
  slug: 'fcfs',
  title: 'First-Come, First-Served (FCFS)',
  slides: 'slide 8',
  engine: 'gantt',
  analogy: {
    domain: 'food',
    text: 'A single-file food truck queue. Fair, simple, and occasionally terrible, everyone waits while the first large order cooks.'
  },
  concept: 'First-Come, First-Served (FCFS) allocates the CPU strictly in order of arrival. While straightforward and fair, it suffers from the convoy effect when a long CPU-bound process delays all subsequent short processes, resulting in high average waiting times.',
  input: {
    algorithm: 'fcfs',
    processes: [
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 }
    ]
  }
};

export default unit;
