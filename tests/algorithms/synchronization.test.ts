import { describe, it, expect } from "vitest";
import {
  evaluateRealtimeDeadline,
  simulateRaceCondition,
  simulatePeterson,
  simulateTestAndSetLock,
  evaluateLockCost,
  simulateSemaphoreOps
} from "../../src/algorithms/synchronization.js";

describe("Wave 2 Pure Algorithms (§2.1)", () => {
  describe("Real-Time Latency Evaluation (L9)", () => {
    it("computes response time and detects meeting strict deadline", () => {
      // interrupt 2ms, conflict 3ms, dispatch 1ms, exec 4ms, deadline 12ms -> total 10ms <= 12ms
      const result = evaluateRealtimeDeadline(2, 3, 1, 4, 12);
      expect(result.totalDispatchLatency).toBe(4);
      expect(result.totalResponseTime).toBe(10);
      expect(result.slackTime).toBe(2);
      expect(result.met).toBe(true);
    });

    it("detects missed deadline when latency increases", () => {
      // conflict 8ms -> total 15ms > 12ms
      const result = evaluateRealtimeDeadline(2, 8, 1, 4, 12);
      expect(result.totalResponseTime).toBe(15);
      expect(result.slackTime).toBe(-3);
      expect(result.met).toBe(false);
    });
  });

  describe("Race Condition Simulation (L10)", () => {
    it("preserves counter value under serial non-interleaved execution", () => {
      // T1 runs 3 steps, then T2 runs 3 steps
      const serial: Array<"T1" | "T2"> = ["T1", "T1", "T1", "T2", "T2", "T2"];
      const res = simulateRaceCondition(5, serial);
      expect(res.finalCounter).toBe(5);
      expect(res.isCorrupted).toBe(false);
    });

    it("reproduces Slide 6-7 race condition where counter drops from 5 to 4", () => {
      // T1 reads 5, T2 reads 5, T1 increments to 6 & writes 6, T2 decrements to 4 & writes 4
      const raceInterleaving: Array<"T1" | "T2"> = ["T1", "T2", "T1", "T1", "T2", "T2"];
      const res = simulateRaceCondition(5, raceInterleaving);
      expect(res.finalCounter).toBe(4);
      expect(res.isCorrupted).toBe(true);
    });

    it("reproduces alternative race condition where counter rises to 6", () => {
      // T1 reads 5, T2 reads 5, T2 decrements to 4 & writes 4, T1 increments to 6 & writes 6
      const raceInterleaving: Array<"T1" | "T2"> = ["T1", "T2", "T2", "T2", "T1", "T1"];
      const res = simulateRaceCondition(5, raceInterleaving);
      expect(res.finalCounter).toBe(6);
      expect(res.isCorrupted).toBe(true);
    });
  });

  describe("Peterson Solution & Hardware Reordering (L12)", () => {
    it("guarantees mutual exclusion and bounded waiting under sequential consistency", () => {
      const res = simulatePeterson(false);
      expect(res.mutualExclusionViolated).toBe(false);
    });

    it("violates mutual exclusion when hardware out-of-order execution reorders instructions", () => {
      const res = simulatePeterson(true);
      expect(res.mutualExclusionViolated).toBe(true);
    });
  });

  describe("Atomic Hardware Primitives (L13)", () => {
    it("prevents multiple concurrent acquisitions with atomic test_and_set", () => {
      const res = simulateTestAndSetLock(true);
      expect(res.thread1Acquired).toBe(true);
      expect(res.thread2Acquired).toBe(false);
      expect(res.bothEnteredCS).toBe(false);
    });

    it("allows race condition when non-atomic software emulation is used", () => {
      const res = simulateTestAndSetLock(false);
      expect(res.thread1Acquired).toBe(true);
      expect(res.thread2Acquired).toBe(true);
      expect(res.bothEnteredCS).toBe(true);
    });
  });

  describe("Spinlock vs Sleep Cost Evaluation (L14)", () => {
    it("prefers spinlock when CS duration is less than context switch overhead", () => {
      const res = evaluateLockCost(4, 10);
      expect(res.preferSpinlock).toBe(true);
      expect(res.spinWastedCycles).toBeLessThan(res.contextSwitchWastedCycles);
    });

    it("prefers sleep/context switch when CS duration exceeds overhead", () => {
      const res = evaluateLockCost(25, 10);
      expect(res.preferSpinlock).toBe(false);
      expect(res.spinWastedCycles).toBeGreaterThan(res.contextSwitchWastedCycles);
    });
  });

  describe("Semaphore Simulation with Wait/Signal & Queue (L15)", () => {
    it("maintains counting semaphore invariant: negative value equals waiting queue length", () => {
      const ops: Array<{ actorId: string; op: "wait" | "signal" }> = [
        { actorId: "T1", op: "wait" },
        { actorId: "T2", op: "wait" },
        { actorId: "T3", op: "wait" },
        { actorId: "T4", op: "wait" }
      ];
      // Initial value 2 (capacity 2)
      const res = simulateSemaphoreOps(2, ops);
      // After 4 waits, value is 2 - 4 = -2, 2 in holders, 2 in queue
      expect(res.finalValue).toBe(-2);
      const lastStep = res.steps[res.steps.length - 1];
      expect(lastStep.holders.length).toBe(2);
      expect(lastStep.waitingQueue.length).toBe(2);
      expect(Math.abs(lastStep.value)).toBe(lastStep.waitingQueue.length);
    });

    it("wakes up queued process upon signal", () => {
      const ops: Array<{ actorId: string; op: "wait" | "signal" }> = [
        { actorId: "T1", op: "wait" }, // value: 0, T1 in
        { actorId: "T2", op: "wait" }, // value: -1, T2 queues
        { actorId: "T1", op: "signal" } // value: 0, T2 wakes
      ];
      const res = simulateSemaphoreOps(1, ops);
      expect(res.finalValue).toBe(0);
      const lastStep = res.steps[res.steps.length - 1];
      expect(lastStep.holders).toContain("T2");
      expect(lastStep.waitingQueue.length).toBe(0);
    });

    it("detects deadlock if signal is omitted", () => {
      const ops: Array<{ actorId: string; op: "wait" | "omit_signal" }> = [
        { actorId: "T1", op: "wait" },
        { actorId: "T2", op: "wait" },
        { actorId: "T1", op: "omit_signal" }
      ];
      const res = simulateSemaphoreOps(1, ops);
      expect(res.deadlocked).toBe(true);
    });
  });
});
