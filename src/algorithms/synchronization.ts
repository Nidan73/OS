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

/**
 * compare_and_swap verdict (L13, Units 52–53). Deck slide 9: the swap takes
 * place only if *value == expected. Atomic (fused): T1 compares live 0
 * against expected 0, swaps to 1 and enters; T2 compares live 1 against
 * expected 0 and refuses. Split (check-then-act): both threads check 0
 * before either acts, so both write 1 and both enter — the change slips
 * through between the check and the act.
 */
export function simulateCompareAndSwap(atomic: boolean): AtomicTestResult {
  let lock = 0;
  let t1Acquired = false;
  let t2Acquired = false;

  if (atomic) {
    t1Acquired = lock === 0;
    if (t1Acquired) lock = 1;

    t2Acquired = lock === 0;
    if (t2Acquired) lock = 1;
  } else {
    const t1Checked = lock;
    const t2Checked = lock;
    t1Acquired = t1Checked === 0;
    lock = 1;
    t2Acquired = t2Checked === 0;
    lock = 1;
  }

  return {
    atomic,
    thread1Acquired: t1Acquired,
    thread2Acquired: t2Acquired,
    bothEnteredCS: t1Acquired && t2Acquired,
    lockValue: lock
  };
}

// ── 4b. Stepwise atomicity trace (L13, Units 50–55) ──

export type AtomicMechanism = "tas" | "cas";

export interface AtomicTraceStep {
  step: number;
  actorId: string;
  action: string;
  /** Deck value: 0 = free, 1 = held (slides 8, 10). */
  lock: number;
  entered: string[];
  waiting: string[];
  /** What actorId last read, on split read/check steps; otherwise null. */
  snapshot: number | null;
  bothInside: boolean;
  /** First waiter handed the key on this step; otherwise null. */
  handoffTo: string | null;
  caption: string;
}

export interface AtomicTraceResult {
  mechanism: AtomicMechanism;
  atomic: boolean;
  steps: AtomicTraceStep[];
  bothEnteredCS: boolean;
  /** Order in which threads first held the lock. */
  handoffOrder: string[];
}

/**
 * The full instruction-level story of two threads racing for one lock, as an
 * explicit script per (mechanism, atomicity) combination — the same style as
 * simulatePeterson's scripts. TAS follows deck slide 8 (boolean lock, spin
 * until test_and_set reads free); CAS follows slide 10 (swap 0 for 1 only on
 * a live match). The split versions separate the read from the write so both
 * threads act on a stale observation. The lesson maps these steps 1:1 onto
 * CounterState; every number on screen comes from here.
 */
export function simulateAtomicSteps(
  mechanism: AtomicMechanism,
  atomic: boolean
): AtomicTraceResult {
  const steps: AtomicTraceStep[] = [];
  const order: string[] = [];
  const seen = new Set<string>();
  const note = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };

  const push = (
    actorId: string,
    action: string,
    lock: number,
    entered: string[],
    waiting: string[],
    caption: string,
    extra?: { snapshot?: number | null; handoffTo?: string | null }
  ) => {
    entered.forEach(note);
    steps.push({
      step: steps.length,
      actorId,
      action,
      lock,
      entered: [...entered],
      waiting: [...waiting],
      snapshot: extra?.snapshot ?? null,
      bothInside: entered.length > 1,
      handoffTo: extra?.handoffTo ?? null,
      caption
    });
  };

  if (mechanism === "tas" && atomic) {
    push("—", "free", 0, [], [], "The key hangs on the hook. The lock reads free and nobody holds it.");
    push("T1", "acquire", 1, ["T1"], [], "T1 looks and grabs in one motion — the lock read free, so T1 steps in.");
    push("T2", "spin", 1, ["T1"], ["T2"], "T2 jiggles the handle: still held. T2 waits and checks again.");
    push("T1", "release", 0, [], ["T2"], "T1 hangs the key back. The lock reads free.");
    push("T2", "acquire", 1, ["T2"], [], "T2's next check reads free — T2 steps in, first in line, handed the key directly.", { handoffTo: "T2" });
  } else if (mechanism === "tas" && !atomic) {
    push("—", "free", 0, [], [], "The key hangs on the hook. The lock reads free and nobody holds it.");
    push("T1", "read", 0, [], [], "T1 looks at the hook: the key is there.", { snapshot: 0 });
    push("T2", "read", 0, [], [], "T2 looks: the key is still there — T1 looked but hasn't grabbed.", { snapshot: 0 });
    push("T1", "write", 1, ["T1"], [], "T1 grabs on its earlier look and steps in.");
    push("T2", "write", 1, ["T1", "T2"], [], "T2 grabs on its stale look — and steps in too. Two holders, one key.");
    push("T2", "verdict", 1, ["T1", "T2"], [], "The meter reads held, yet the room holds two. That disagreement is the corruption.");
  } else if (mechanism === "cas" && atomic) {
    push("—", "free", 0, [], [], "The tag reads 0. Nobody holds the lock.");
    push("T1", "swap", 1, ["T1"], [], "T1 compares: the lock still reads 0 — swaps in 1 and steps in.");
    push("T2", "compare", 1, ["T1"], ["T2"], "T2 compares: the lock reads 1, not 0 — the swap refuses, and T2 waits.");
    push("T1", "release", 0, [], ["T2"], "T1 writes the lock back to 0.");
    push("T2", "swap", 1, ["T2"], [], "T2 compares again: 0 as expected — swaps and steps in, first in line.", { handoffTo: "T2" });
  } else {
    push("—", "free", 0, [], [], "The tag reads 0. Nobody holds the lock.");
    push("T1", "check", 0, [], [], "T1 checks the tag: 0.", { snapshot: 0 });
    push("T2", "check", 0, [], [], "T2 checks the tag: still 0 — T1 hasn't acted.", { snapshot: 0 });
    push("T1", "act", 1, ["T1"], [], "T1 acts on its check: writes 1 and steps in.");
    push("T2", "act", 1, ["T1", "T2"], [], "T2 acts on its stale check: writes 1 and steps in too.");
    push("T2", "verdict", 1, ["T1", "T2"], [], "The tag reads claimed — twice. The change slipped through between check and act.");
  }

  return {
    mechanism,
    atomic,
    steps,
    bothEnteredCS: steps.some(s => s.bothInside),
    handoffOrder: order
  };
}

// ── 4c. Atomic increment, built on compare-and-swap (L13, Unit 55) ──

export interface AtomicIncrementResult {
  start: number;
  expected: number;
  finalCAS: number;
  retriesCAS: number;
  finalPlain: number;
  lostPlain: number;
}

/**
 * Deck slides 12–13: increment() retried through compare_and_swap until the
 * swap lands. Two threads increment once from 0. The plain version snapshots
 * a stale value and one update never lands; the CAS version's second thread
 * sees its swap refused, re-reads, and retries — so nothing is lost. The
 * retry count is executed, not asserted: it falls out of the interleaving.
 */
export function simulateAtomicIncrement(): AtomicIncrementResult {
  const start = 0;
  const threads = 2;

  let plain = start;
  const p1 = plain;
  const p2 = plain;
  plain = p1 + 1;
  plain = p2 + 1;

  let cas = start;
  let retries = 0;
  const t1 = cas;
  const t2 = cas;
  if (cas === t1) {
    cas = t1 + 1;
  } else {
    retries++;
  }
  if (cas === t2) {
    cas = t2 + 1;
  } else {
    retries++;
    const t2Retry = cas;
    if (cas === t2Retry) cas = t2Retry + 1;
  }

  const expected = start + threads;
  return {
    start,
    expected,
    finalCAS: cas,
    retriesCAS: retries,
    finalPlain: plain,
    lostPlain: expected - plain
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

// ── 7. Critical-Section Requirements Simulator (L11, Units 38–42) ──

export type CSGuarantee = "none" | "mutex" | "progress" | "bounded";
export type CSPhase = "entry" | "critical" | "exit" | "remainder";

export interface CSStep {
  step: number;
  movedId: string | null;
  phases: Record<string, CSPhase>;
  inside: string[];
  waiting: string[];
  entries: Record<string, number>;
  lockCount: number;
  mutexViolated: boolean;
  progressViolated: boolean;
  starved: string[];
  queueJumps: number;
  caption: string;
  history: Record<string, CSPhase>[];
}

export interface CSResult {
  steps: CSStep[];
  maxOccupancy: number;
  entries: Record<string, number>;
  mutexViolated: boolean;
  progressViolated: boolean;
  starved: string[];
  queueJumps: number;
  stuck: boolean;
}

const CS_PROCS = ["P1", "P2", "P3"];

/**
 * Simulates three processes taking turns through entry / critical / exit /
 * remainder under one protocol with exactly one guarantee disabled.
 * 'none'    — intact protocol: one occupant, empty room admits, FIFO order.
 * 'mutex'   — entry never checks the lock, so occupants overlap.
 * 'progress'— exit leaves the lock engaged: empty room, queue waits forever.
 * 'bounded' — the process that just exited may re-enter ahead of the queue.
 * Every violation flag is computed from the trace, never asserted.
 */
export function simulateCriticalSection(broken: CSGuarantee = "none"): CSResult {
  const target: Record<string, number> =
    broken === "bounded" ? { P1: 4, P2: 4, P3: 4 } : { P1: 2, P2: 2, P3: 2 };

  const phases: Record<string, CSPhase> = { P1: "remainder", P2: "remainder", P3: "remainder" };
  const entries: Record<string, number> = { P1: 0, P2: 0, P3: 0 };
  const tickets: string[] = [];
  const starved = new Set<string>();
  const history: Record<string, CSPhase>[] = [];
  let lockCount = 0;
  let mutexViolated = false;
  let progressViolated = false;
  let queueJumps = 0;
  let rr = 0;
  const steps: CSStep[] = [];

  const inside = () => CS_PROCS.filter(p => phases[p] === "critical");
  const waiting = () => CS_PROCS.filter(p => phases[p] === "entry");

  const canMove = (p: string): boolean => {
    switch (phases[p]) {
      case "remainder":
        return entries[p] < target[p];
      case "entry":
        if (broken === "mutex") return true;
        if (lockCount > 0) return false;
        if (broken === "bounded") {
          const queue = waiting();
          if (queue.length > 1) {
            const most = Math.max(...queue.map(q => entries[q]));
            const least = Math.min(...queue.map(q => entries[q]));
            if (most > least) {
              return p === queue.find(q => entries[q] === most);
            }
          }
          return tickets[0] === p;
        }
        return tickets[0] === p;
      default:
        return true;
    }
  };

  const move = (p: string): string => {
    switch (phases[p]) {
      case "remainder":
        phases[p] = "entry";
        tickets.push(p);
        return `${p} walks to the door and asks for the room.`;
      case "entry": {
        const jumped = tickets[0] !== p;
        tickets.splice(tickets.indexOf(p), 1);
        if (jumped) queueJumps++;
        phases[p] = "critical";
        entries[p]++;
        lockCount++;
        if (broken === "mutex") {
          return inside().length > 1
            ? `${p} walks in without checking the lock — ${inside().length} inside at once!`
            : `${p} walks in without checking the lock.`;
        }
        return `${p} enters — the room was free.`;
      }
      case "critical":
        phases[p] = "exit";
        return `${p} is done and slides the lock back on the way out.`;
      case "exit":
        phases[p] = "remainder";
        if (broken === "progress") {
          return `${p} returns to their seat — but leaves the lock engaged!`;
        }
        lockCount = Math.max(0, lockCount - 1);
        return `${p} releases the room and returns to their seat.`;
    }
  };

  const pushStep = (movedId: string | null, caption: string) => {
    if (inside().length > 1) mutexViolated = true;
    const exiting = CS_PROCS.some(p => phases[p] === "exit");
    if (inside().length === 0 && waiting().length > 0 && lockCount > 0 && !exiting) {
      progressViolated = true;
    }
    for (const w of waiting()) {
      for (const q of CS_PROCS) {
        if (q !== w && entries[q] >= entries[w] + 2) starved.add(w);
      }
    }
    history.push({ ...phases });
    steps.push({
      step: steps.length,
      movedId,
      phases: { ...phases },
      inside: inside(),
      waiting: waiting(),
      entries: { ...entries },
      lockCount,
      mutexViolated,
      progressViolated,
      starved: [...starved],
      queueJumps,
      caption,
      history: history.map(h => ({ ...h }))
    });
  };

  pushStep(null, "Everyone is seated. All three want the room; nobody has moved yet.");

  let stuck = false;
  while (steps.length <= 26) {
    let mover: string | null = null;
    for (let i = 0; i < CS_PROCS.length; i++) {
      const p = CS_PROCS[(rr + i) % CS_PROCS.length];
      if (canMove(p)) {
        mover = p;
        rr = (rr + i + 1) % CS_PROCS.length;
        break;
      }
    }
    if (!mover) {
      stuck = true;
      break;
    }
    const caption = move(mover);
    pushStep(mover, caption);
    if (CS_PROCS.every(p => entries[p] >= target[p] && (phases[p] === "remainder" || phases[p] === "exit"))) break;
  }

  return {
    steps,
    maxOccupancy: steps.reduce((m, s) => Math.max(m, s.inside.length), 0),
    entries,
    mutexViolated,
    progressViolated,
    starved: [...starved],
    queueJumps,
    stuck
  };
}

// ── 8. Instruction Reordering & the Print-Out Flip (L12, Unit 46) ──

export interface PublicationStep {
  step: number;
  actorId: string;
  action: string;
  x: number;
  flag: boolean;
  printed: number | null;
  caption: string;
}

export interface PublicationResult {
  steps: PublicationStep[];
  output: number | null;
  expectedOutput: number | null;
  flipped: boolean;
}

/**
 * The lecture slide's print test: two threads share `boolean flag = false`
 * and `int x = 0`. Thread 1 spins on the flag then prints x; Thread 2 sets
 * x = 100 then raises the flag. With sequential consistency the output is
 * 100. If hardware reorders Thread 2's independent operations (flag first,
 * then x), the print can run before the store lands and the output is 0.
 * Both numbers are computed from the trace; expectedOutput is the intact
 * run's output, never a constant.
 */
export function simulateReorderingOutput(reordered = false): PublicationResult {
  let x = 0;
  let flag = false;
  let printed: number | null = null;
  const steps: PublicationStep[] = [];

  const push = (actorId: string, action: string, caption: string) => {
    steps.push({ step: steps.length + 1, actorId, action, x, flag, printed, caption });
  };

  if (reordered) {
    flag = true;
    push("T2", "flag = true", "T2 raises the flag first — the store to x is still in flight.");
    push("T1", "while (!flag); passes", "T1 sees the flag and leaves the spin loop.");
    printed = x;
    push("T1", "print x", `T1 prints x — it is still ${x}. The announcement ran ahead of the fact.`);
    x = 100;
    push("T2", "x = 100", "T2 finally stores 100 into x — too late for the print.");
  } else {
    x = 100;
    push("T2", "x = 100", "T2 stores 100 into x.");
    flag = true;
    push("T2", "flag = true", "T2 raises the flag — after the fact it announces.");
    push("T1", "while (!flag); passes", "T1 sees the flag and leaves the spin loop.");
    printed = x;
    push("T1", "print x", `T1 prints x — the store had already landed: ${printed}.`);
  }

  const intact = reordered ? simulateReorderingOutput(false) : null;
  return {
    steps,
    output: printed,
    expectedOutput: intact ? intact.output : printed,
    flipped: (intact?.output ?? printed) !== printed
  };
}
