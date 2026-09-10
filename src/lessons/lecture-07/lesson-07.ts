import type { Lesson, PlaygroundCapable } from "../../core/types.js";
import { QueueEngine, type QueueInput, type QueueState } from "../../engines/queue.js";

// DENSITY (Task A audit): correct at 11, four dispatches, four completions,
// the stall, the instant hardware switch onto Thread 1, and the resume, plus
// the initial frame. T3 and T4 run straight through with no contention: each
// contributes exactly its dispatch and its completion, and a contention-free
// run has no further mechanism event to name. Eleven is the full stall story.

/**
 * Lesson 07's engine. A subclass, not a prototype patch: the queue engine is
 * shared with lessons 6 and 8, and patching it there made behaviour depend on
 * which lesson the learner happened to open first.
 */
export class SMTQueueEngine extends QueueEngine implements PlaygroundCapable {
  protected override mount(): void {
    super.mount();
    // Four or more logical CPUs need a taller canvas to stay legible.
    if (this.input?.cores && this.input.cores.length >= 4) {
      this.svg?.setAttribute("viewBox", "0 0 720 285");
    }
  }

  /** Rebuild the timeline from a new core/thread configuration. */
  public reconfigure(cores: QueueInput["cores"], events: QueueInput["events"]): void {
    this.input.cores = cores;
    this.input.events = events;
    this.setSteps(this.buildSteps(this.input));
    this.seek(0);
  }

  public renderPlayground(host: HTMLElement, scoreboardHost: HTMLElement): void {
    setupLesson07Playground(this, host, scoreboardHost);
  }
}

// Custom Lesson 07 Interactive Playground: Hardware threads & core configuration
function setupLesson07Playground(
  engine: SMTQueueEngine,
  playgroundSection: HTMLElement,
  scoreboardSection: HTMLElement
): void {

  let coresCount = 2;
  let smtEnabled = true;

  const updatePlaygroundAndScoreboard = () => {
    const totalLogical = coresCount * (smtEnabled ? 2 : 1);

    playgroundSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
            Interactive Playground: Multiprocessor Cores & SMT
          </h3>
          <div style="font-size: 0.74rem; color: var(--muted); margin: 2px 0 0 0;">
            Add cores and hardware threads to watch memory stall dead-time get covered.
          </div>
        </div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="btn-preset-single" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--waiting); color: var(--waiting); cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            ⚠️ 1 Core · Single-Thread
          </button>
          <button id="btn-preset-smt" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--running); color: var(--running); cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            🟢 2 Cores · SMT Active
          </button>
        </div>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <label for="core-count-slider" style="font-size: 0.8rem; font-weight: 600; color: var(--ink);">Cores:</label>
          <input id="core-count-slider" data-primary-control="true" type="range" min="1" max="2" value="${coresCount}" style="width: 75px; cursor: pointer;" />
          <span id="core-count-label" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; color: var(--accent); min-width: 45px;">${coresCount} Core${coresCount > 1 ? "s" : ""}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--ink);">Hardware Threads:</label>
          <button id="btn-toggle-smt" data-primary-control="true" type="button" style="padding: 3px 10px; font-size: 0.75rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: ${smtEnabled ? "rgba(8, 127, 91, 0.12)" : "var(--surface-alt)"}; border: 1px solid ${smtEnabled ? "var(--running)" : "var(--hairline)"}; color: ${smtEnabled ? "var(--running)" : "var(--ink)"}; cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            ${smtEnabled ? "⚡ 2 Threads / Core (Active)" : "1 Thread / Core (Off)"}
          </button>
        </div>
      </div>
    `;

    scoreboardSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Multiprocessor Architecture Scoreboard</h3>
        </div>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; ${smtEnabled ? "background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);" : "background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);"}">
          ${smtEnabled ? "⚡ Memory Stall Overlapped & Latency Masked" : "⚠️ Pipeline Stalled: Dead Time on Cache Miss"}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Logical Stations</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: var(--accent); margin: 2px 0;">
            ${totalLogical} CPUS
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${coresCount} Cores × ${smtEnabled ? "2 Threads" : "1 Thread"}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Stall Absorption</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: ${smtEnabled ? "var(--running)" : "var(--waiting)"}; margin: 2px 0;">
            ${smtEnabled ? "100%" : "0%"}
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${smtEnabled ? "Latency hidden by SMT switch" : "Core idle during memory stall"}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Two-Level Scheduling</div>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">OS:</span>
              <span style="color: var(--accent); font-weight: 600;">Assigns tasks to logical CPUs</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">Hardware:</span>
              <span style="color: ${smtEnabled ? "var(--running)" : "var(--waiting)"}; font-weight: 600;">${smtEnabled ? "Instant thread switch" : "Single thread execution"}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind controls
    const coreSlider = playgroundSection.querySelector("#core-count-slider") as HTMLInputElement;
    coreSlider?.addEventListener("input", (e: Event) => {
      coresCount = Number((e.target as HTMLInputElement).value);
      applyConfiguration();
    });

    const toggleBtn = playgroundSection.querySelector("#btn-toggle-smt") as HTMLButtonElement;
    toggleBtn?.addEventListener("click", () => {
      smtEnabled = !smtEnabled;
      applyConfiguration();
    });

    const btnSingle = playgroundSection.querySelector("#btn-preset-single") as HTMLButtonElement;
    btnSingle?.addEventListener("click", () => {
      coresCount = 1;
      smtEnabled = false;
      applyConfiguration();
    });

    const btnSmt = playgroundSection.querySelector("#btn-preset-smt") as HTMLButtonElement;
    btnSmt?.addEventListener("click", () => {
      coresCount = 2;
      smtEnabled = true;
      applyConfiguration();
    });
  };

  const applyConfiguration = () => {
    // Reconfigure cores and events on engine input
    const cores = [];
    for (let c = 0; c < coresCount; c++) {
      if (smtEnabled) {
        cores.push({ id: `core${c}_t0`, label: `Core ${c} · Thread 0` });
        cores.push({ id: `core${c}_t1`, label: `Core ${c} · Thread 1` });
      } else {
        cores.push({ id: `core${c}_t0`, label: `Core ${c} (Uniprocessor)` });
      }
    }

    const events = [];
    if (coresCount === 1 && !smtEnabled) {
      events.push(
        { caption: "T1 dispatched to Core 0. Runs its compute slice.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall (cache miss). The pan simmers, nobody can touch it!", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "No alternate hardware thread: the core stays empty through the whole stall.", action: "demote" as const, itemId: "T2", toQueue: "ready" },
        { caption: "Memory returns. T1 resumes on Core 0.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 finishes its slice.", action: "complete" as const, itemId: "T1" },
        { caption: "T2 dispatched sequentially to Core 0.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t0" },
        { caption: "T2 finishes its slice.", action: "complete" as const, itemId: "T2" }
      );
    } else if (coresCount === 1 && smtEnabled) {
      events.push(
        { caption: "T1 dispatched to Core 0 (Thread 0). Runs its compute slice.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall. Hardware switches instantly to T2 on Thread 1.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t1" },
        { caption: "T2 executes while the T1 stall resolves in the background.", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "T2 finishes its slice.", action: "complete" as const, itemId: "T2" },
        { caption: "T1 resumes on Thread 0 with its line refilled.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 finishes its slice.", action: "complete" as const, itemId: "T1" },
        { caption: "T3 dispatched to Core 0, the core never sat idle.", action: "dispatch" as const, itemId: "T3", coreId: "core0_t0" },
        { caption: "T3 finishes its slice.", action: "complete" as const, itemId: "T3" }
      );
    } else if (!smtEnabled) {
      events.push(
        { caption: "T1 dispatched to Core 0; runs its compute slice.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T3 dispatched to Core 1 in parallel.", action: "dispatch" as const, itemId: "T3", coreId: "core1_t0" },
        { caption: "T1 hits a memory stall. Without hardware threads, Core 0 goes idle.", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "T1 resumes on Core 0 when memory returns.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 finishes its slice.", action: "complete" as const, itemId: "T1" },
        { caption: "T3 finishes its slice on Core 1.", action: "complete" as const, itemId: "T3" },
        { caption: "T2 dispatched to Core 0, multicore still stalls per thread.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t0" },
        { caption: "T2 finishes its slice.", action: "complete" as const, itemId: "T2" }
      );
    } else {
      events.push(
        { caption: "T1 dispatched to Core 0 (Thread 0). Runs its compute slice.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall (cache miss) and leaves the pipeline.", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "Hardware switches instantly: T2 runs on Thread 1 while T1 waits on RAM.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t1" },
        { caption: "T2 finishes its slice; the stall resolves underneath it.", action: "complete" as const, itemId: "T2" },
        { caption: "T1 resumes on Thread 0 with its line refilled.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 finishes its slice.", action: "complete" as const, itemId: "T1" },
        { caption: "T3 dispatched to Core 1 (Thread 0) in parallel.", action: "dispatch" as const, itemId: "T3", coreId: "core1_t0" },
        { caption: "T3 finishes its slice on Core 1.", action: "complete" as const, itemId: "T3" },
        { caption: "T4 dispatched to Core 1 (Thread 1), the stall window stays filled.", action: "dispatch" as const, itemId: "T4", coreId: "core1_t1" },
        { caption: "T4 finishes. Latency was masked, not removed.", action: "complete" as const, itemId: "T4" }
      );
    }

    engine.reconfigure(cores, events);
    updatePlaygroundAndScoreboard();
  };

  updatePlaygroundAndScoreboard();
}

export const lesson07: Lesson<QueueInput, QueueState> = {
  id: 7,
  lecture: 7,
  slug: "lesson-07",
  title: "More cores, more problems",
  absorbsUnits: [19, 20, 21, 22, 23],
  slides: "slides 9–14",
  engine: "queue",
  engineClass: SMTQueueEngine,
  lensLabels: {
    analogy: "🍳 Kitchen Analogy",
    mechanism: "⚡ Multiprocessor SMT",
    analogyTitle: "View as one cook versus several, with pans per cook",
    mechanismTitle: "View as multicore hyperthreaded hardware pipeline"
  },
  analogy: {
    domain: "food",
    text: 
      'One cook can only stand at one stove. On a Friday at Yum Cha, that is the whole problem, and there are two different ways to fix it that people constantly confuse.\n\n' +
      'The first is obvious: hire a second cook. Two cooks, two stoves, two plates of chicken nanban coming out at once. You have doubled what the kitchen can actually do.\n\n' +
      'The second is subtler. Keep one cook, but give her two pans. While the first pan is sitting there with the chicken simmering and needing nothing from her, she turns to the second pan and starts the next order. She has not become faster. She has stopped standing still during the parts of the work that do not need her.\n\n' +
      'Both of these make the kitchen busier. Only one of them is more cooks. Knowing which is which is the difference between a core and a hardware thread.'
  },
  concept: "Multiprocessor architectures scale throughput by adding cores and hardware threads (chip multithreading / SMT). When a running task hits a memory stall waiting for a cache miss, the core hardware instantly switches to an alternate hardware thread, masking latency and keeping execution units saturated across two distinct levels of scheduling.",
  morphReveals: "In the kitchen a gap at the cook's counter is plain dead time, nobody is cooking and the width is simply waste. On the core that same gap is a memory stall, and a second pan slides straight into it. Empty width stops meaning wasted and starts meaning available to somebody else.",
  morphMode: "morph",
  analogyMapping: [
    "Cooks at Counters ➔ Processor Cores",
    "Several Pans per Cook ➔ Hardware Threads (Hyperthreading)",
    "Simmering Untouched ➔ Memory Stall (Cache Miss)",
    "Ammu Assigning Dishes ➔ OS Thread Scheduler (First Level)",
    "Cook Turning Pans ➔ Core Hardware Thread Switch (Second Level)"
  ],
  input: {
    queues: [
      { id: "ready", label: "Common Ready Queue" },
      { id: "stall", label: "Memory Stall Queue" }
    ],
    cores: [
      { id: "core0_t0", label: "Core 0 · Thread 0" },
      { id: "core0_t1", label: "Core 0 · Thread 1" },
      { id: "core1_t0", label: "Core 1 · Thread 0" },
      { id: "core1_t1", label: "Core 1 · Thread 1" }
    ],
    items: [
      { id: "T1", name: "Task 1", burst: 12, queueId: "ready" },
      { id: "T2", name: "Task 2", burst: 8, queueId: "ready" },
      { id: "T3", name: "Task 3", burst: 16, queueId: "ready" },
      { id: "T4", name: "Task 4", burst: 20, queueId: "ready" }
    ],
    events: [
      { caption: "T1 dispatched to Core 0 (Thread 0). Runs its compute slice.", action: "dispatch", itemId: "T1", coreId: "core0_t0" },
      { caption: "T1 hits a memory stall (cache miss) and leaves the pipeline.", action: "demote", itemId: "T1", toQueue: "stall" },
      { caption: "Hardware switches instantly: T2 runs on Thread 1 while T1 waits on RAM.", action: "dispatch", itemId: "T2", coreId: "core0_t1" },
      { caption: "T2 finishes its slice; the stall resolves underneath it.", action: "complete", itemId: "T2" },
      { caption: "T1 resumes on Thread 0 with its line refilled.", action: "dispatch", itemId: "T1", coreId: "core0_t0" },
      { caption: "T1 finishes its slice.", action: "complete", itemId: "T1" },
      { caption: "T3 dispatched to Core 1 (Thread 0) in parallel.", action: "dispatch", itemId: "T3", coreId: "core1_t0" },
      { caption: "T3 finishes its slice on Core 1.", action: "complete", itemId: "T3" },
      { caption: "T4 dispatched to Core 1 (Thread 1), the stall window stays filled.", action: "dispatch", itemId: "T4", coreId: "core1_t1" },
      { caption: "T4 finishes. Latency was masked, not removed.", action: "complete", itemId: "T4" }
    ],
    analogy: {
      domain: "food",
      serviceLabel: "Cook Counter",
      queueLabels: { ready: "Dishes Waiting", stall: "Simmering Pans" }
    }
  }
};

export const lesson = lesson07;
export default lesson07;
