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
