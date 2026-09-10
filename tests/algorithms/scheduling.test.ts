import { describe, test, expect } from 'vitest';
import { fcfs, sjf, srtf, roundRobin, priorityScheduling, mlfq } from '../../src/algorithms/scheduling.js';

describe('CPU Scheduling Algorithms (§7, verified against Lecture 6 slides)', () => {
  test('FCFS matches Lecture 6 slide 8', () => {
    const r = fcfs([
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 },
    ]);
    expect(r.waiting).toEqual({ P1: 0, P2: 24, P3: 27 });
    expect(r.avgWaiting).toBe(17);
    expect(r.turnaround).toEqual({ P1: 24, P2: 27, P3: 30 });
    expect(r.avgTurnaround).toBe(27);
  });

  test('FCFS convoy effect reverses on reorder, slide 9', () => {
    const r = fcfs([
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 },
      { id: 'P1', arrival: 0, burst: 24 },
    ]);
    expect(r.waiting).toEqual({ P1: 6, P2: 0, P3: 3 });
    expect(r.avgWaiting).toBe(3);
  });

  test('SJF non-preemptive matches Lecture 6 slide 11', () => {
    const r = sjf([
      { id: 'P1', arrival: 0, burst: 6 },
      { id: 'P2', arrival: 0, burst: 8 },
      { id: 'P3', arrival: 0, burst: 7 },
      { id: 'P4', arrival: 0, burst: 3 },
    ]);
    expect(r.waiting).toEqual({ P1: 3, P2: 16, P3: 9, P4: 0 });
    expect(r.avgWaiting).toBe(7);
    expect(r.turnaround).toEqual({ P1: 9, P2: 24, P3: 16, P4: 3 });
    expect(r.avgTurnaround).toBe(13);
  });

  test('SRTF preemptive SJF worked example matches Lecture 6 slide 15', () => {
    const r = srtf([
      { id: 'P1', arrival: 0, burst: 8 },
      { id: 'P2', arrival: 1, burst: 4 },
      { id: 'P3', arrival: 2, burst: 9 },
      { id: 'P4', arrival: 3, burst: 5 },
    ]);
    expect(r.waiting).toEqual({ P1: 9, P2: 0, P3: 15, P4: 2 });
    expect(r.avgWaiting).toBe(6.5);
    expect(r.turnaround).toEqual({ P1: 17, P2: 4, P3: 24, P4: 7 });
    expect(r.avgTurnaround).toBe(13);
  });

  test('Round Robin (q=4) matches Lecture 6 slide 17', () => {
    const r = roundRobin([
      { id: 'P1', arrival: 0, burst: 24 },
      { id: 'P2', arrival: 0, burst: 3 },
      { id: 'P3', arrival: 0, burst: 3 },
    ], 4);
    expect(r.waiting).toEqual({ P1: 6, P2: 4, P3: 7 });
    expect(r.avgWaiting).toBe(5.67);
  });

  test('Priority scheduling matches Lecture 6 slide 21', () => {
    const r = priorityScheduling([
      { id: 'P1', arrival: 0, burst: 10, priority: 3 },
      { id: 'P2', arrival: 0, burst: 1, priority: 1 },
      { id: 'P3', arrival: 0, burst: 2, priority: 4 },
      { id: 'P4', arrival: 0, burst: 1, priority: 5 },
      { id: 'P5', arrival: 0, burst: 5, priority: 2 },
    ]);
    expect(r.waiting).toEqual({ P1: 6, P2: 0, P3: 16, P4: 18, P5: 1 });
    expect(r.avgWaiting).toBe(8.2);
  });

  test('MLFQ 3-queue scheduling (Q0 q=8, Q1 q=16, Q2 FCFS) matches Lecture 7 slides 5-6', () => {
    const r = mlfq([
      { id: 'P1', arrival: 0, burst: 30 },
      { id: 'P2', arrival: 0, burst: 8 },
      { id: 'P3', arrival: 0, burst: 15 }
    ], 8, 16);
    expect(r.waiting).toEqual({ P1: 23, P2: 8, P3: 32 });
    expect(r.avgWaiting).toBe(21);
    expect(r.turnaround).toEqual({ P1: 53, P2: 16, P3: 47 });
    expect(r.avgTurnaround).toBe(38.67);
  });
});
