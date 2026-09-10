export interface Process {
  id: string;
  arrival: number;
  burst: number;
  priority?: number;
}

export interface GanttBar {
  id: string;
  start: number;
  end: number;
}

export interface ProcessMetrics {
  waiting: number;
  turnaround: number;
  response: number;
  completion: number;
}

export interface ScheduleResult {
  bars: GanttBar[];
  totalTime: number;
  metrics: Record<string, ProcessMetrics>;
  waiting: Record<string, number>;
  turnaround: Record<string, number>;
  response: Record<string, number>;
  avgWaiting: number;
  avgTurnaround: number;
  avgResponse: number;
}

function computeMetrics(processes: Process[], bars: GanttBar[]): ScheduleResult {
  const metrics: Record<string, ProcessMetrics> = {};
  const waiting: Record<string, number> = {};
  const turnaround: Record<string, number> = {};
  const response: Record<string, number> = {};

  let totalWait = 0;
  let totalTurnaround = 0;
  let totalResponse = 0;
  const n = processes.length;

  for (const p of processes) {
    const pBars = bars.filter(b => b.id === p.id);
    if (pBars.length === 0) {
      metrics[p.id] = { waiting: 0, turnaround: 0, response: 0, completion: p.arrival };
      waiting[p.id] = 0;
      turnaround[p.id] = 0;
      response[p.id] = 0;
      continue;
    }

    const firstRun = pBars[0].start;
    const lastEnd = pBars[pBars.length - 1].end;
    const resp = firstRun - p.arrival;
    const tat = lastEnd - p.arrival;
    const wait = tat - p.burst;

    metrics[p.id] = {
      waiting: wait,
      turnaround: tat,
      response: resp,
      completion: lastEnd
    };
    waiting[p.id] = wait;
    turnaround[p.id] = tat;
    response[p.id] = resp;

    totalWait += wait;
    totalTurnaround += tat;
    totalResponse += resp;
  }

  const totalTime = bars.length ? bars[bars.length - 1].end : 0;
  const round2 = (num: number) => Math.round(num * 100) / 100;

  return {
    bars,
    totalTime,
    metrics,
    waiting,
    turnaround,
    response,
    avgWaiting: n ? round2(totalWait / n) : 0,
    avgTurnaround: n ? round2(totalTurnaround / n) : 0,
    avgResponse: n ? round2(totalResponse / n) : 0
  };
}

/** First-Come, First-Served (FCFS) */
export function fcfs(processes: Process[]): ScheduleResult {
  const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
  const bars: GanttBar[] = [];
  let currentTime = 0;

  for (const p of sorted) {
    if (currentTime < p.arrival) {
      currentTime = p.arrival;
    }
    const start = currentTime;
    const end = start + p.burst;
    bars.push({ id: p.id, start, end });
    currentTime = end;
  }

  return computeMetrics(processes, bars);
}

/** Shortest-Job-First (SJF) Non-preemptive */
export function sjf(processes: Process[]): ScheduleResult {
  const remaining = processes.map(p => ({ ...p }));
  const bars: GanttBar[] = [];
  let currentTime = 0;
  const completed = new Set<string>();

  while (completed.size < processes.length) {
    const available = remaining.filter(p => !completed.has(p.id) && p.arrival <= currentTime);
    if (available.length === 0) {
      const nextArrival = Math.min(...remaining.filter(p => !completed.has(p.id)).map(p => p.arrival));
      currentTime = nextArrival;
      continue;
    }

    available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    const selected = available[0];
    const start = currentTime;
    const end = start + selected.burst;
    bars.push({ id: selected.id, start, end });
    currentTime = end;
    completed.add(selected.id);
  }

  return computeMetrics(processes, bars);
}

/** Shortest-Remaining-Time-First (SRTF / Preemptive SJF) */
export function srtf(processes: Process[]): ScheduleResult {
  const remaining = processes.map(p => ({ ...p, remainingBurst: p.burst }));
  const rawEvents: { id: string; time: number }[] = [];
  let currentTime = 0;
  let completedCount = 0;

  const maxTime = processes.reduce((acc, p) => acc + p.burst, Math.max(...processes.map(p => p.arrival), 0));

  while (completedCount < processes.length && currentTime <= maxTime + 100) {
    const available = remaining.filter(p => p.arrival <= currentTime && p.remainingBurst > 0);
    if (available.length === 0) {
      const future = remaining.filter(p => p.remainingBurst > 0);
      if (future.length === 0) break;
      currentTime = Math.min(...future.map(p => p.arrival));
      continue;
    }

    available.sort((a, b) => a.remainingBurst - b.remainingBurst || a.arrival - b.arrival);
    const selected = available[0];

    rawEvents.push({ id: selected.id, time: currentTime });
    selected.remainingBurst -= 1;
    currentTime += 1;

    if (selected.remainingBurst === 0) {
      completedCount++;
    }
  }

  // Compress unit-time segments into continuous Gantt bars
  const bars: GanttBar[] = [];
  for (const ev of rawEvents) {
    if (bars.length > 0 && bars[bars.length - 1].id === ev.id && bars[bars.length - 1].end === ev.time) {
      bars[bars.length - 1].end = ev.time + 1;
    } else {
      bars.push({ id: ev.id, start: ev.time, end: ev.time + 1 });
    }
  }

  return computeMetrics(processes, bars);
}

/** Round Robin (RR) */
export function roundRobin(processes: Process[], quantum: number): ScheduleResult {
  if (quantum <= 0) throw new Error('Time quantum must be greater than zero');
  const queue: { id: string; arrival: number; burst: number; remaining: number }[] = [];
  const procPool = processes.map(p => ({ ...p, remaining: p.burst })).sort((a, b) => a.arrival - b.arrival);

  const bars: GanttBar[] = [];
  let currentTime = 0;
  let poolIdx = 0;

  while (poolIdx < procPool.length && procPool[poolIdx].arrival <= currentTime) {
    queue.push(procPool[poolIdx]);
    poolIdx++;
  }

  while (queue.length > 0 || poolIdx < procPool.length) {
    if (queue.length === 0) {
      currentTime = procPool[poolIdx].arrival;
      while (poolIdx < procPool.length && procPool[poolIdx].arrival <= currentTime) {
        queue.push(procPool[poolIdx]);
        poolIdx++;
      }
    }

    const currentProc = queue.shift()!;
    const slice = Math.min(quantum, currentProc.remaining);
    const start = currentTime;
    const end = start + slice;
    bars.push({ id: currentProc.id, start, end });
    currentTime = end;
    currentProc.remaining -= slice;

    // Enqueue processes that arrived during this time slice
    while (poolIdx < procPool.length && procPool[poolIdx].arrival <= currentTime) {
      queue.push(procPool[poolIdx]);
      poolIdx++;
    }

    if (currentProc.remaining > 0) {
      queue.push(currentProc);
    }
  }

  return computeMetrics(processes, bars);
}

/** Priority Scheduling (Non-preemptive, lower number = higher priority) */
export function priorityScheduling(processes: Process[]): ScheduleResult {
  const remaining = processes.map(p => ({ ...p, prio: p.priority ?? 999 }));
  const bars: GanttBar[] = [];
  let currentTime = 0;
  const completed = new Set<string>();

  while (completed.size < processes.length) {
    const available = remaining.filter(p => !completed.has(p.id) && p.arrival <= currentTime);
    if (available.length === 0) {
      const nextArrival = Math.min(...remaining.filter(p => !completed.has(p.id)).map(p => p.arrival));
      currentTime = nextArrival;
      continue;
    }

    available.sort((a, b) => a.prio - b.prio || a.arrival - b.arrival);
    const selected = available[0];
    const start = currentTime;
    const end = start + selected.burst;
    bars.push({ id: selected.id, start, end });
    currentTime = end;
    completed.add(selected.id);
  }

  return computeMetrics(processes, bars);
}

/** Multilevel Feedback Queue (MLFQ) Scheduling (§2.1) */
export function mlfq(
  processes: Process[],
  q0Quantum = 8,
  q1Quantum = 16
): ScheduleResult {
  if (processes.length === 0) {
    return computeMetrics([], []);
  }

  interface JobState {
    id: string;
    arrival: number;
    burst: number;
    remaining: number;
    queueLevel: number;
  }

  const jobs: JobState[] = processes.map(p => ({
    id: p.id,
    arrival: p.arrival,
    burst: p.burst,
    remaining: p.burst,
    queueLevel: 0
  })).sort((a, b) => a.arrival - b.arrival);

  const q0: JobState[] = [];
  const q1: JobState[] = [];
  const q2: JobState[] = [];
  const bars: GanttBar[] = [];

  let currentTime = 0;
  let unarrivedIndex = 0;

  const enqueueArrivals = () => {
    while (unarrivedIndex < jobs.length && jobs[unarrivedIndex].arrival <= currentTime) {
      q0.push(jobs[unarrivedIndex]);
      unarrivedIndex++;
    }
  };

  enqueueArrivals();

  while (unarrivedIndex < jobs.length || q0.length > 0 || q1.length > 0 || q2.length > 0) {
    if (q0.length === 0 && q1.length === 0 && q2.length === 0) {
      currentTime = jobs[unarrivedIndex].arrival;
      enqueueArrivals();
      continue;
    }

    if (q0.length > 0) {
      const job = q0.shift()!;
      const slice = Math.min(q0Quantum, job.remaining);
      const start = currentTime;
      const end = start + slice;
      bars.push({ id: job.id, start, end });
      currentTime = end;
      job.remaining -= slice;
      enqueueArrivals();

      if (job.remaining > 0) {
        job.queueLevel = 1;
        q1.push(job);
      }
    } else if (q1.length > 0) {
      const job = q1.shift()!;
      let timeLimit = q1Quantum;
      if (unarrivedIndex < jobs.length) {
        const nextArr = jobs[unarrivedIndex].arrival;
        if (nextArr < currentTime + Math.min(q1Quantum, job.remaining)) {
          timeLimit = Math.max(1, nextArr - currentTime);
        }
      }
      const slice = Math.min(timeLimit, Math.min(q1Quantum, job.remaining));
      const start = currentTime;
      const end = start + slice;
      bars.push({ id: job.id, start, end });
      currentTime = end;
      job.remaining -= slice;
      enqueueArrivals();

      if (job.remaining > 0) {
        if (slice >= q1Quantum) {
          job.queueLevel = 2;
          q2.push(job);
        } else {
          q1.push(job);
        }
      }
    } else if (q2.length > 0) {
      const job = q2.shift()!;
      let slice = job.remaining;
      if (unarrivedIndex < jobs.length) {
        const nextArr = jobs[unarrivedIndex].arrival;
        if (nextArr < currentTime + job.remaining) {
          slice = Math.max(1, nextArr - currentTime);
        }
      }
      const start = currentTime;
      const end = start + slice;
      bars.push({ id: job.id, start, end });
      currentTime = end;
      job.remaining -= slice;
      enqueueArrivals();

      if (job.remaining > 0) {
        q2.push(job);
      }
    }
  }

  const mergedBars: GanttBar[] = [];
  for (const bar of bars) {
    const last = mergedBars[mergedBars.length - 1];
    if (last && last.id === bar.id && last.end === bar.start) {
      last.end = bar.end;
    } else {
      mergedBars.push({ ...bar });
    }
  }

  return computeMetrics(processes, mergedBars);
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm evaluation — L23, ATLAS units 31–33, Lecture 7 slides 24–30.
//
// Three ways to answer "which scheduler?", in increasing generality and cost:
// deterministic modelling (exact, one workload), queueing models / Little's
// formula (statistical, any workload), and simulation (accurate, expensive).
// Every figure the lesson shows comes from here.
// ─────────────────────────────────────────────────────────────────────────────

/** One algorithm's result on one fixed workload — slide 25's deterministic evaluation. */
export interface AlgorithmVerdict {
  algorithm: 'fcfs' | 'sjf' | 'rr';
  label: string;
  avgWaiting: number;
  bars: GanttBar[];
}

const round2 = (num: number) => Math.round(num * 100) / 100;

/**
 * Deterministic modelling (slides 24–25): run every candidate over one
 * predetermined workload and read off the average waiting time. Order is
 * fixed — fcfs, sjf, rr — so the caller compares, never the callee.
 */
export function deterministicComparison(
  processes: Process[],
  quantum = 10
): AlgorithmVerdict[] {
  const f = fcfs(processes);
  const s = sjf(processes);
  const r = roundRobin(processes, quantum);
  return [
    { algorithm: 'fcfs', label: 'FCFS', avgWaiting: f.avgWaiting, bars: f.bars },
    { algorithm: 'sjf', label: 'Non-preemptive SJF', avgWaiting: s.avgWaiting, bars: s.bars },
    { algorithm: 'rr', label: `RR (q=${quantum})`, avgWaiting: r.avgWaiting, bars: r.bars }
  ];
}

/** The lowest average waiting time in a comparison. Ties resolve to the earliest listed. */
export function bestOf(verdicts: AlgorithmVerdict[]): AlgorithmVerdict {
  if (verdicts.length === 0) throw new Error('bestOf: no verdicts to compare');
  return verdicts.reduce((best, v) => (v.avgWaiting < best.avgWaiting ? v : best));
}

/**
 * Little's formula (slide 27): n = lambda x W, in steady state, valid for any
 * scheduling algorithm and any arrival distribution. Supply exactly two of the
 * three terms and the third is derived — the lesson never types the third.
 */
export interface LittlesLaw {
  /** average queue length */
  n: number;
  /** average arrival rate into the queue */
  lambda: number;
  /** average waiting time in the queue */
  w: number;
  /** which term was derived rather than supplied */
  solvedFor: 'n' | 'lambda' | 'w';
}

export function littlesLaw(known: { n?: number; lambda?: number; w?: number }): LittlesLaw {
  const has = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
  const given = [has(known.n), has(known.lambda), has(known.w)].filter(Boolean).length;
  if (given !== 2) {
    throw new Error(`littlesLaw: supply exactly two of n, lambda, w — got ${given}`);
  }
  if (!has(known.n)) {
    if (known.lambda! < 0 || known.w! < 0) throw new Error('littlesLaw: rates and waits must be >= 0');
    return { n: round2(known.lambda! * known.w!), lambda: known.lambda!, w: known.w!, solvedFor: 'n' };
  }
  if (!has(known.lambda)) {
    if (known.w! <= 0) throw new Error('littlesLaw: cannot solve for lambda when W is 0');
    return { n: known.n!, lambda: round2(known.n! / known.w!), w: known.w!, solvedFor: 'lambda' };
  }
  if (known.lambda! <= 0) throw new Error('littlesLaw: cannot solve for W when lambda is 0');
  return { n: known.n!, lambda: known.lambda!, w: round2(known.n! / known.lambda!), solvedFor: 'w' };
}

/**
 * Simulation (slides 28–30): instead of one exact answer for one workload,
 * run the same algorithms over every ordering of the same job sizes and
 * report the spread. This is what slide 25's caveat — "applies only to those
 * inputs" — costs you: an algorithm whose spread is wide was never really
 * measured by a single deterministic run.
 */
export interface OrderingSpread {
  algorithm: 'fcfs' | 'sjf' | 'rr';
  label: string;
  min: number;
  max: number;
  mean: number;
  /** true when every ordering gives the same average waiting time */
  invariant: boolean;
}

export interface SimulationRun {
  orderings: number;
  spread: OrderingSpread[];
  /** how often each algorithm had the lowest average waiting time (ties count for each) */
  winCounts: Record<'fcfs' | 'sjf' | 'rr', number>;
}

/** Every distinct ordering of a multiset of burst times. Guarded — 8! is the ceiling. */
export function orderingsOf(bursts: number[]): number[][] {
  if (bursts.length > 8) {
    throw new Error(`orderingsOf: ${bursts.length} bursts is too many to enumerate (max 8)`);
  }
  const out: number[][] = [];
  const seen = new Set<string>();
  const walk = (rest: number[], acc: number[]): void => {
    if (rest.length === 0) {
      const key = acc.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        out.push([...acc]);
      }
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      walk([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, rest[i]]);
    }
  };
  walk(bursts, []);
  return out;
}

export function simulateOrderings(bursts: number[], quantum = 10): SimulationRun {
  const orderings = orderingsOf(bursts);
  const cols: Record<'fcfs' | 'sjf' | 'rr', number[]> = { fcfs: [], sjf: [], rr: [] };
  const winCounts: Record<'fcfs' | 'sjf' | 'rr', number> = { fcfs: 0, sjf: 0, rr: 0 };
  const labels: Record<string, string> = {};

  for (const order of orderings) {
    const workload: Process[] = order.map((burst, i) => ({ id: `P${i + 1}`, arrival: 0, burst }));
    const verdicts = deterministicComparison(workload, quantum);
    const low = Math.min(...verdicts.map((v) => v.avgWaiting));
    for (const v of verdicts) {
      cols[v.algorithm].push(v.avgWaiting);
      labels[v.algorithm] = v.label;
      if (v.avgWaiting === low) winCounts[v.algorithm] += 1;
    }
  }

  const spread = (['fcfs', 'sjf', 'rr'] as const).map((algorithm) => {
    const vals = cols[algorithm];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return {
      algorithm,
      label: labels[algorithm],
      min: round2(min),
      max: round2(max),
      mean: round2(vals.reduce((a, b) => a + b, 0) / vals.length),
      invariant: max - min < 0.005
    };
  });

  return { orderings: orderings.length, spread, winCounts };
}
