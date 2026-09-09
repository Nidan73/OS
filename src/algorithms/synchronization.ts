// src/algorithms/synchronization.ts — Pure algorithms for synchronization & real-time latency (§2.1)

// ── 1. Real-Time Latency & Deadline Evaluation (L9, Units 27–30) ──

export interface LatencyBreakdown {
  interruptLatency: number; // Recognition + state save
  conflictPhase: number;    // Kernel preemption + resource release
  dispatchPhase: number;    // Context switch
  totalDispatchLatency: number; // conflict + dispatch
  executionTime: number;    // Real-time task burst
  totalResponseTime: number; // interrupt + dispatch + execution
  deadline: number;
  slackTime: number;        // deadline - totalResponseTime
  met: boolean;             // whether totalResponseTime <= deadline
}

export function evaluateRealtimeDeadline(
  interruptLatency: number,
  conflictPhase: number,
  dispatchPhase: number,
  executionTime: number,
  deadline: number
): LatencyBreakdown {
  const totalDispatchLatency = conflictPhase + dispatchPhase;
  const totalResponseTime = interruptLatency + totalDispatchLatency + executionTime;
  const slackTime = deadline - totalResponseTime;
  return {
    interruptLatency,
    conflictPhase,
    dispatchPhase,
    totalDispatchLatency,
    executionTime,
    totalResponseTime,
    deadline,
    slackTime,
    met: totalResponseTime <= deadline
  };
}

// ── 2. Race Condition Simulator (L10, Units 34–37) ──

export interface RaceStep {
  stepIndex: number;
  threadId: "T1" | "T2";
  instruction: string;
  register1: number | null;
  register2: number | null;
  counter: number;
  description: string;
}

export interface RaceSimulationResult {
  steps: RaceStep[];
  finalCounter: number;
  expectedCounter: number;
  isCorrupted: boolean;
}

/**
 * The register-level instruction sequences simulateRaceCondition actually
 * executes, exported so a lesson's displayed instruction text is bound to
 * the simulation — the two cannot drift.
 */
export const RACE_INSTRUCTIONS: { T1: string[]; T2: string[] } = {
  T1: ["register1 = counter", "register1 = register1 + 1", "counter = register1"],
  T2: ["register2 = counter", "register2 = register2 - 1", "counter = register2"]
};

/**
 * Simulates register-level interleaving of counter++ (T1) and counter-- (T2).
 * T1 instructions: [0: read R1=counter, 1: add R1=R1+1, 2: write counter=R1]
 * T2 instructions: [0: read R2=counter, 1: sub R2=R2-1, 2: write counter=R2]
 * interleaving: array of thread IDs indicating which thread executes its next instruction
 */
export function simulateRaceCondition(
  initialCounter: number,
  interleaving: Array<"T1" | "T2">
): RaceSimulationResult {
  let counter = initialCounter;
  let r1: number | null = null;
  let r2: number | null = null;
  let t1Ptr = 0;
  let t2Ptr = 0;

  const t1Insts = RACE_INSTRUCTIONS.T1;
  const t2Insts = RACE_INSTRUCTIONS.T2;

  const steps: RaceStep[] = [];

  for (let i = 0; i < interleaving.length; i++) {
    const thread = interleaving[i];
    let inst = "";
    let desc = "";

    if (thread === "T1" && t1Ptr < t1Insts.length) {
      inst = t1Insts[t1Ptr];
      if (t1Ptr === 0) {
        r1 = counter;
        desc = `T1 reads counter (${counter}) into register1`;
      } else if (t1Ptr === 1) {
        r1 = (r1 ?? counter) + 1;
        desc = `T1 increments register1 to ${r1}`;
      } else if (t1Ptr === 2) {
        counter = r1 ?? counter;
        desc = `T1 writes register1 (${r1}) back to counter`;
      }
      t1Ptr++;
    } else if (thread === "T2" && t2Ptr < t2Insts.length) {
      inst = t2Insts[t2Ptr];
      if (t2Ptr === 0) {
        r2 = counter;
        desc = `T2 reads counter (${counter}) into register2`;
      } else if (t2Ptr === 1) {
        r2 = (r2 ?? counter) - 1;
        desc = `T2 decrements register2 to ${r2}`;
      } else if (t2Ptr === 2) {
        counter = r2 ?? counter;
        desc = `T2 writes register2 (${r2}) back to counter`;
      }
      t2Ptr++;
    } else {
      continue;
    }

    steps.push({
      stepIndex: i + 1,
      threadId: thread,
      instruction: inst,
      register1: r1,
      register2: r2,
      counter,
      description: desc
    });
  }

  return {
    steps,
    finalCounter: counter,
    expectedCounter: initialCounter,
    isCorrupted: counter !== initialCounter
  };
}

// ── 3. Peterson Solution & Instruction Reordering (L12, Units 44–46) ──

export interface PetersonStep {
  step: number;
  thread: 0 | 1;
  action: string;
  flag0: boolean;
  flag1: boolean;
  turn: 0 | 1;
  inCS0: boolean;
  inCS1: boolean;
  mutualExclusionViolated: boolean;
  caption: string;
}

export interface PetersonResult {
  steps: PetersonStep[];
  mutualExclusionViolated: boolean;
  finalTurn: 0 | 1;
}

export function simulatePeterson(
  reorderInstructions = false
): PetersonResult {
  let flag0 = false;
  let flag1 = false;
  let turn: 0 | 1 = 0;
  let inCS0 = false;
  let inCS1 = false;
  let violated = false;
  const steps: PetersonStep[] = [];
  let s = 1;

  if (reorderInstructions) {
    turn = 1;
    steps.push({
      step: s++,
      thread: 0,
      action: "turn = 1 (reordered ahead of flag[0])",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "Hardware reordering: T0 writes turn = 1 before setting flag[0]!"
    });

    turn = 0;
    steps.push({
      step: s++,
      thread: 1,
      action: "turn = 0 (reordered ahead of flag[1])",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "Hardware reordering: T1 writes turn = 0 before setting flag[1]!"
    });

    inCS0 = true;
    steps.push({
      step: s++,
      thread: 0,
      action: "T0 enters CS (sees flag[1]==false)",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T0 enters Critical Section because flag[1] is false."
    });

    inCS1 = true;
    violated = true;
    steps.push({
      step: s++,
      thread: 1,
      action: "T1 enters CS (sees flag[0]==false) — VIOLATION",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: true,
      caption: "CRITICAL BUG: T1 also enters CS! Mutual Exclusion violated due to instruction reordering."
    });
  } else {
    flag0 = true;
    steps.push({
      step: s++,
      thread: 0,
      action: "flag[0] = true",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T0 raises flag[0] = true (\"I want to enter CS\")."
    });

    turn = 1;
    steps.push({
      step: s++,
      thread: 0,
      action: "turn = 1",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T0 sets turn = 1 (\"You first, T1\")."
    });

    flag1 = true;
    steps.push({
      step: s++,
      thread: 1,
      action: "flag[1] = true",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T1 raises flag[1] = true (\"I also want to enter CS\")."
    });

    turn = 0;
    steps.push({
      step: s++,
      thread: 1,
      action: "turn = 0",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T1 sets turn = 0 (\"You first, T0\")."
    });

    inCS0 = true;
    steps.push({
      step: s++,
      thread: 0,
      action: "T0 enters CS (turn == 0)",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T0 enters Critical Section: loop condition false because turn is 0."
    });

    steps.push({
      step: s++,
      thread: 1,
      action: "T1 spins waiting (flag[0] && turn==0)",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T1 waits in while loop: flag[0] is true and turn is 0."
    });

    inCS0 = false;
    flag0 = false;
    steps.push({
      step: s++,
      thread: 0,
      action: "T0 exits CS, flag[0] = false",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T0 leaves CS and sets flag[0] = false."
    });

    inCS1 = true;
    steps.push({
      step: s++,
      thread: 1,
      action: "T1 enters CS (flag[0] is false)",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T1 enters Critical Section: flag[0] is now false."
    });

    inCS1 = false;
    flag1 = false;
    steps.push({
      step: s++,
      thread: 1,
      action: "T1 exits CS, flag[1] = false",
      flag0,
      flag1,
      turn,
      inCS0,
      inCS1,
      mutualExclusionViolated: false,
      caption: "T1 leaves CS and sets flag[1] = false. Both threads finished safely."
    });
  }

  return {
    steps,
    mutualExclusionViolated: violated,
    finalTurn: turn
  };
}

// ── 4. Atomic Hardware & CAS (L13, Units 50–55) ──

export interface AtomicTestResult {
  atomic: boolean;
  thread1Acquired: boolean;
  thread2Acquired: boolean;
  bothEnteredCS: boolean;
  lockValue: number;
}

export function simulateTestAndSetLock(atomic: boolean): AtomicTestResult {
  let lock = 0;
  let t1Acquired = false;
  let t2Acquired = false;

  if (atomic) {
    const t1Old = lock;
    lock = 1;
    t1Acquired = (t1Old === 0);

    const t2Old = lock;
    t2Acquired = (t2Old === 0);
  } else {
    const t1Read = lock;
    const t2Read = lock;
    lock = 1;
    t1Acquired = (t1Read === 0);
    t2Acquired = (t2Read === 0);
  }

  return {
    atomic,
    thread1Acquired: t1Acquired,
    thread2Acquired: t2Acquired,
    bothEnteredCS: t1Acquired && t2Acquired,
    lockValue: lock
  };
}

// ── 5. Spinlock vs Sleep-Lock Cost Evaluation (L14, Units 56–57) ──

export interface LockCostModel {
  csDurationUs: number;
  contextSwitchCostUs: number;
  spinWastedCycles: number;
  contextSwitchWastedCycles: number;
  preferSpinlock: boolean;
  crossoverThresholdUs: number;
}

export function evaluateLockCost(
  csDurationUs: number,
  contextSwitchCostUs = 10,
  cpuFreqGHz = 3.0
): LockCostModel {
  const cyclesPerUs = cpuFreqGHz * 1000;
  const spinWastedCycles = Math.round(csDurationUs * cyclesPerUs);
  const contextSwitchWastedCycles = Math.round(contextSwitchCostUs * cyclesPerUs);
  const preferSpinlock = csDurationUs < contextSwitchCostUs;

  return {
    csDurationUs,
    contextSwitchCostUs,
    spinWastedCycles,
    contextSwitchWastedCycles,
    preferSpinlock,
    crossoverThresholdUs: contextSwitchCostUs
  };
}

// ── 6. Semaphore Simulation with Wait/Signal & Queue (L15, Units 58–62) ──

export interface SemaphoreState {
  step: number;
  action: string;
  actorId: string;
  value: number;
  holders: string[];
  waitingQueue: string[];
  caption: string;
}

export interface SemaphoreSimulationResult {
  steps: SemaphoreState[];
  finalValue: number;
  deadlocked: boolean;
}

export function simulateSemaphoreOps(
  initialValue: number,
  ops: Array<{ actorId: string; op: "wait" | "signal" | "omit_signal" }>
): SemaphoreSimulationResult {
  let value = initialValue;
  const holders: string[] = [];
  const waitingQueue: string[] = [];
  const steps: SemaphoreState[] = [];
  let deadlocked = false;

  for (let i = 0; i < ops.length; i++) {
    const { actorId, op } = ops[i];
    let caption = "";

    if (op === "wait") {
      value--;
      if (value < 0) {
        waitingQueue.push(actorId);
        caption = `${actorId} executes wait(): value decrements to ${value} (< 0). ${actorId} blocks and enters waiting queue.`;
      } else {
        holders.push(actorId);
        caption = `${actorId} executes wait(): value decrements to ${value}. ${actorId} acquires resource slot.`;
      }
    } else if (op === "signal") {
      value++;
      if (value <= 0) {
        const woke = waitingQueue.shift();
        if (woke) {
          holders.push(woke);
          caption = `${actorId} executes signal(): value increments to ${value}. ${woke} is removed from waiting queue and woken up!`;
        } else {
          caption = `${actorId} executes signal(): value increments to ${value}.`;
        }
      } else {
        caption = `${actorId} executes signal(): value increments to ${value}. Resource freed.`;
      }
      const hIdx = holders.indexOf(actorId);
      if (hIdx >= 0) holders.splice(hIdx, 1);
    } else if (op === "omit_signal") {
      caption = `BUG: ${actorId} exits without calling signal()! Value remains ${value}. Waiting processes starved!`;
      const hIdx = holders.indexOf(actorId);
      if (hIdx >= 0) holders.splice(hIdx, 1);
      deadlocked = waitingQueue.length > 0;
    }

    steps.push({
      step: i + 1,
      action: `${actorId}:${op}`,
      actorId,
      value,
      holders: [...holders],
      waitingQueue: [...waitingQueue],
      caption
    });
  }

  return {
    steps,
    finalValue: value,
    deadlocked: deadlocked || (waitingQueue.length > 0 && holders.length === 0)
  };
}
