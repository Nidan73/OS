// src/algorithms/deadlock.ts — Pure deadlock algorithms (§2.1)
//
// Every number the Wave 3 lessons show comes from here: cycle detection over
// resource-allocation graphs, the Banker's safety sweep with its cell-by-cell
// record, the pretend-grant request check, the detection sweep over current
// requests, and the wait-for collapse. Tested against the Lecture 10 deck —
// slides 30–32 (the five-process ledger) and slides 39–40 (detection).

// ── 1. Resource-allocation graph ──

export type RagNodeKind = 'process' | 'resource';

/** One vertex: a process (Pi) or a resource type (Rj with N instances). */
export interface RagNode {
  id: string;
  kind: RagNodeKind;
  /** Instance count for resources; 1 for processes. */
  instances: number;
}

export type RagEdgeKind = 'request' | 'assignment' | 'claim';

export interface RagEdge {
  /** Request/claim: process → resource. Assignment: resource → process. */
  from: string;
  to: string;
  kind: RagEdgeKind;
}

export interface RagGraph {
  nodes: RagNode[];
  edges: RagEdge[];
}

// ── 2. Cycle detection (single instance) ──

/**
 * All directed cycles over request + assignment edges (claim edges are
 * may-request annotations, not waits — they never close a ring).
 * Iterative DFS from every vertex; each cycle returned once, rotated to start
 * at its lexicographically smallest id so repeats compare equal.
 */
export function detectCycle(graph: RagGraph): string[][] {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    if (e.kind === 'claim') continue;
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)?.push(e.to);
  }

  const cycles: string[][] = [];
  const seen = new Set<string>();

  for (const start of adj.keys()) {
    // Iterative DFS carrying the current path; a back-edge to a vertex on
    // the path closes a cycle.
    const stack: Array<{ v: string; next: number }> = [{ v: start, next: 0 }];
    const onPath = new Set<string>([start]);
    const path = [start];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const outs = adj.get(top.v) ?? [];
      if (top.next >= outs.length) {
        stack.pop();
        onPath.delete(top.v);
        path.pop();
        continue;
      }
      const w = outs[top.next++];
      if (w === start && path.length >= 2) {
        const canon = canonical([...path]);
        const key = canon.join('>');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(canon);
        }
        continue;
      }
      if (onPath.has(w)) continue;
      onPath.add(w);
      path.push(w);
      stack.push({ v: w, next: 0 });
    }
  }

  return cycles;
}

function canonical(cycle: string[]): string[] {
  let best = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[best]) best = i;
  }
  return [...cycle.slice(best), ...cycle.slice(0, best)];
}

// ── 3. Deadlock: a cycle is necessary, not sufficient (unit 71) ──

export interface DeadlockVerdict {
  /** True only when the detection sweep confirms unfinishable processes. */
  deadlocked: boolean;
  cycles: string[][];
  /** Processes that can never drain, empty when not deadlocked. */
  deadlockedProcesses: string[];
}

/**
 * A cycle with spare instances is NOT a deadlock (deck slide 11: the ring
 * T1→R1→T3→R2→T1 exists, yet nobody is stuck). Nor is a fully-claimed ring
 * enough: on slide 11 every resource on the cycle is fully held, but R1 is
 * also held by T2, which waits on nothing, finishes, and breaks the ring.
 * Topology alone cannot see that an off-cycle holder will release — the
 * detection sweep can. So: enumerate cycles topologically, then reduce the
 * graph to allocation/request/available matrices and run the detection
 * sweep (§6 below); only processes it cannot finish are deadlocked. This
 * distinction is the entire lesson of L17 and it lives here, in the tested
 * function, not in the lesson.
 */
export function isDeadlock(graph: RagGraph): DeadlockVerdict {
  const cycles = detectCycle(graph);
  if (cycles.length === 0) {
    return { deadlocked: false, cycles, deadlockedProcesses: [] };
  }

  const processes = graph.nodes.filter((n) => n.kind === 'process');
  const resources = graph.nodes.filter((n) => n.kind === 'resource');
  const pIdx = new Map(processes.map((p, i) => [p.id, i]));
  const rIdx = new Map(resources.map((r, j) => [r.id, j]));
  const allocation = processes.map(() => resources.map(() => 0));
  const request = processes.map(() => resources.map(() => 0));
  for (const e of graph.edges) {
    if (e.kind === 'claim') continue;
    if (e.kind === 'assignment') {
      const ri = rIdx.get(e.from);
      const pi = pIdx.get(e.to);
      if (ri !== undefined && pi !== undefined) allocation[pi][ri]++;
    } else {
      const pi = pIdx.get(e.from);
      const ri = rIdx.get(e.to);
      if (pi !== undefined && ri !== undefined) request[pi][ri]++;
    }
  }
  const available = resources.map(
    (r, j) => r.instances - allocation.reduce((sum, row) => sum + row[j], 0)
  );

  const det = detectionAlgorithm(available, allocation, request);
  const deadlockedProcesses = processes
    .filter((_, i) => !det.finish[i])
    .map((p) => p.id)
    .sort();
  return {
    deadlocked: deadlockedProcesses.length > 0,
    cycles,
    deadlockedProcesses
  };
}

// ── 4. Banker's safety algorithm (deck slides 28, 30–32) ──

export interface BankerState {
  available: number[];
  max: number[][];
  allocation: number[][];
}

export interface SafetyProbe {
  /** Process examined this probe. */
  pid: number;
  /** Need[pid] vs Work at probe time — the cell-by-cell comparison. */
  need: number[];
  work: number[];
  /** Per-resource verdicts, so the animation highlights cell by cell. */
  cellOk: boolean[];
  /** Whether Need[pid] <= Work held, resource by resource. */
  satisfied: boolean;
}

export interface SafetyResult {
  safe: boolean;
  /** The order that drains, in P-index terms — computed, never typed. */
  sequence: number[];
  /** One probe per examination, so the animation replays the sweep. */
  steps: SafetyProbe[];
  /** Work vector after the sweep (all holdings reclaimed when safe). */
  work: number[];
}

export function needMatrix(max: number[][], allocation: number[][]): number[][] {
  return max.map((row, i) => row.map((v, j) => v - allocation[i][j]));
}

/**
 * Deck slide 28, verbatim: Work = Available; Finish[i] = false; repeatedly
 * find an unfinished i with Need[i] <= Work, reclaim its allocation, repeat.
 * Safe iff every process finishes. The probe log records each examination —
 * including failed ones — so L20 replays the sweep, not a summary.
 *
 * Selection order is the deck's own: each pass scans circularly from after
 * the last satisfied process and takes the FIRST satisfiable one — pass 3
 * therefore meets P4 before wrapping to P0, which is exactly why ⟨P1, P3,
 * P4, P0, P2⟩ falls out. A restart-from-P0 scan would take P0 third
 * ([1,3,0,2,4]) and contradict the deck; the deck's walkthrough is the spec.
 * Every pass examines each unfinished process once (failed probes included),
 * so the log replays the whole sweep, not just the winners.
 */
export function safetyAlgorithm(
  available: number[],
  max: number[][],
  allocation: number[][]
): SafetyResult {
  const n = max.length;
  const m = available.length;
  const need = needMatrix(max, allocation);
  const work = [...available];
  const finish = new Array<boolean>(n).fill(false);
  const sequence: number[] = [];
  const steps: SafetyProbe[] = [];
  let cursor = 0;

  for (;;) {
    let found = -1;
    for (let k = 0; k < n; k++) {
      const i = (cursor + k) % n;
      if (finish[i]) continue;
      const cellOk = need[i].map((v, j) => v <= work[j]);
      const satisfied = cellOk.every(Boolean);
      steps.push({ pid: i, need: [...need[i]], work: [...work], cellOk, satisfied });
      if (satisfied && found < 0) found = i;
    }
    if (found < 0) break;
    for (let j = 0; j < m; j++) work[j] += allocation[found][j];
    finish[found] = true;
    sequence.push(found);
    cursor = (found + 1) % n;
  }

  return {
    safe: finish.every(Boolean),
    sequence,
    steps,
    work
  };
}

// ── 5. Resource-request algorithm (deck slide 29) ──

export interface RequestResult {
  granted: boolean;
  /** Why, in one computed sentence — the lesson quotes it, never rewords it. */
  reason: string;
  /** Safety sweep on the pretended state (present iff checks 1–2 passed). */
  safety: SafetyResult | null;
}

export function requestAlgorithm(
  state: BankerState,
  pid: number,
  request: number[]
): RequestResult {
  const need = needMatrix(state.max, state.allocation)[pid];

  if (request.some((v, j) => v > need[j])) {
    return {
      granted: false,
      reason: `P${pid} asked for more than its declared ceiling — exceeds Need.`,
      safety: null
    };
  }
  if (request.some((v, j) => v > state.available[j])) {
    return {
      granted: false,
      reason: `P${pid} must wait — the resources are not available.`,
      safety: null
    };
  }

  const available = state.available.map((v, j) => v - request[j]);
  const allocation = state.allocation.map((row, i) =>
    row.map((v, j) => (i === pid ? v + request[j] : v))
  );
  const safety = safetyAlgorithm(available, state.max, allocation);
  if (!safety.safe) {
    return {
      granted: false,
      reason: `P${pid} must wait — granting it would leave the system unsafe.`,
      safety
    };
  }
  return {
    granted: true,
    reason: `P${pid} granted — the system stays safe.`,
    safety
  };
}

// ── 6. Detection sweep (deck slides 36–38) ──

export interface DetectionState {
  available: number[];
  allocation: number[][];
  /** Current outstanding requests (NOT declared ceilings — cf. Banker's Need). */
  request: number[][];
}

export interface DetectionResult {
  deadlocked: string[];
  /** Finish flags in P-index order at sweep end. */
  finish: boolean[];
  steps: SafetyProbe[];
}

/**
 * Deck slides 37–38: the same sweep shape as safety, but Finish[i] starts
 * true for processes holding nothing, and the comparison is Request[i] <=
 * Work instead of Need[i] <= Work. Unfinished processes at the end are
 * deadlocked.
 */
export function detectionAlgorithm(
  available: number[],
  allocation: number[][],
  request: number[][]
): DetectionResult {
  const n = allocation.length;
  const m = available.length;
  const work = [...available];
  const finish = allocation.map((row) => row.every((v) => v === 0));
  const steps: SafetyProbe[] = [];

  // Same selection discipline as safetyAlgorithm: full P0→Pn scan per pass,
  // first satisfiable wins, rescan from P0. The deck's ⟨P0, P2, P3, P1, P4⟩
  // falls out of the pass structure, not a stored answer.
  for (;;) {
    let found = -1;
    for (let i = 0; i < n; i++) {
      if (finish[i]) continue;
      const cellOk = request[i].map((v, j) => v <= work[j]);
      const satisfied = cellOk.every(Boolean);
      steps.push({ pid: i, need: [...request[i]], work: [...work], cellOk, satisfied });
      if (satisfied && found < 0) found = i;
    }
    if (found < 0) break;
    for (let j = 0; j < m; j++) work[j] += allocation[found][j];
    finish[found] = true;
  }

  const deadlocked = finish
    .map((f, i) => (!f ? `P${i}` : null))
    .filter((x): x is string => x !== null);
  return { deadlocked, finish, steps };
}

// ── 7. Wait-for collapse (deck slides 34–35) ──

/**
 * Collapse a resource-allocation graph to who-blocks-whom: Pi → Pj when Pi
 * waits on a resource held by Pj (deck slide 35b). Resources drop out; only
 * the waiting matters. The detection cycle check then runs on processes.
 */
export function waitForGraph(graph: RagGraph): Map<string, string[]> {
  const holders = new Map<string, Set<string>>();
  const waiters = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (e.kind === 'assignment') {
      // Assignment: resource → process.
      if (!holders.has(e.from)) holders.set(e.from, new Set());
      holders.get(e.from)?.add(e.to);
    } else if (e.kind === 'request') {
      // Request: process → resource.
      if (!waiters.has(e.to)) waiters.set(e.to, new Set());
      waiters.get(e.to)?.add(e.from);
    }
  }

  const out = new Map<string, string[]>();
  for (const [resource, procs] of waiters) {
    for (const waiter of procs) {
      for (const holder of holders.get(resource) ?? []) {
        if (holder === waiter) continue;
        if (!out.has(waiter)) out.set(waiter, []);
        if (!out.get(waiter)?.includes(holder)) out.get(waiter)?.push(holder);
      }
    }
  }
  return out;
}
