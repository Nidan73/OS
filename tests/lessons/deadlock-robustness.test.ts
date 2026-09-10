import { describe, it, expect } from 'vitest';
import { recoveryRounds, evaluateDetectionCadence, detectionAlgorithm } from '../../src/algorithms/deadlock.js';
import { CANDIDATES, ROUNDS } from '../../src/lessons/lecture-10/lesson-22.js';
import { SWEEP_ALLOCATION, SWEEP_AVAILABLE, SWEEP_REQUEST_T1, sweepOf } from '../../src/lessons/lecture-10/lesson-21.js';

describe('L21/L22 robustness — the verdicts are not artifacts of their fixtures', () => {
  it('L22 starvation is not an artifact of ROUNDS=5', () => {
    for (const r of [2, 3, 7, 12, 50]) {
      expect(recoveryRounds(CANDIDATES, r, false).starved).toBe(true);
      expect(recoveryRounds(CANDIDATES, r, true).starved).toBe(false);
    }
  });
  it('L22 starvation is not an artifact of these three candidates', () => {
    const alt = CANDIDATES.map((c, i) => ({ ...c, priority: 5 - i, computedMinutes: 5 + i * 30 }));
    expect(recoveryRounds(alt, 6, false).starved).toBe(true);
    expect(recoveryRounds(alt, 6, true).starved).toBe(false);
  });
  it('L22 selection is deterministic — same input, same picks, every time', () => {
    const a = recoveryRounds(CANDIDATES, ROUNDS, true).picks;
    for (let i = 0; i < 20; i++) expect(recoveryRounds(CANDIDATES, ROUNDS, true).picks).toEqual(a);
  });
  it('L22 recoveryRounds does not mutate the caller\'s candidates', () => {
    const before = JSON.stringify(CANDIDATES);
    recoveryRounds(CANDIDATES, 10, true);
    expect(JSON.stringify(CANDIDATES)).toBe(before);
  });
  it('L21 slide-40 verdict is not sensitive to row order', () => {
    const order = [4, 0, 3, 1, 2];
    const alloc = order.map((i) => SWEEP_ALLOCATION[i]);
    const req = order.map((i) => SWEEP_REQUEST_T1[i]);
    const r = detectionAlgorithm(SWEEP_AVAILABLE, alloc, req);
    const backToOriginal = r.deadlocked.map((p) => `P${order[Number(p.slice(1))]}`).sort();
    expect(backToOriginal).toEqual(['P1', 'P2', 'P3', 'P4']);
  });
  it('L21 cadence: blocking cost is zero when nothing is deadlocked', () => {
    expect(evaluateDetectionCadence(30, 3, 5, 0).blockedProcessMinutes).toBe(0);
  });
  it('L21 cadence handles absurd input without NaN', () => {
    for (const v of [0, -5, 1e6]) {
      const c = evaluateDetectionCadence(v, 3, 5, 4);
      expect(Number.isFinite(c.detectionOpsPerHour)).toBe(true);
      expect(Number.isFinite(c.blockedProcessMinutes)).toBe(true);
    }
  });
  it('L21 sweep is pure — repeated calls agree', () => {
    const a = sweepOf(SWEEP_REQUEST_T1);
    expect(sweepOf(SWEEP_REQUEST_T1).deadlocked).toEqual(a.deadlocked);
  });
});
