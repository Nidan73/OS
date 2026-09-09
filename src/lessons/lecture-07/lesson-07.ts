import type { Lesson } from "../../core/types.js";
import { QueueEngine, type QueueInput, type QueueState } from "../../engines/queue.js";
import { LessonPlayer } from "../../components/LessonPlayer.js";

// Extend QueueEngine prototype to support LessonPlayer lifecycle and dynamic controls
if (!(QueueEngine.prototype as any).__lesson07Patched) {
  (QueueEngine.prototype as any).__lesson07Patched = true;

  (QueueEngine.prototype as any).getProcesses = function () {
    return (this.input?.items ?? []).map((it: any) => ({
      id: it.id,
      burst: it.burst ?? 12,
      arrival: 0
    }));
  };

  (QueueEngine.prototype as any).getScheduleResult = function () {
    return {
      avgWaiting: 0,
      avgTurnaround: 12,
      metrics: {
        T1: { waiting: 0, turnaround: 12 },
        T2: { waiting: 0, turnaround: 12 },
        T3: { waiting: 0, turnaround: 12 },
        T4: { waiting: 0, turnaround: 12 }
      }
    };
  };

  (QueueEngine.prototype as any).reorderProcesses = function () {
    // no-op for queue engine
  };

  const origMount = (QueueEngine.prototype as any).mount;
  (QueueEngine.prototype as any).mount = function () {
    origMount.call(this);
    if (this.input?.cores && this.input.cores.length >= 4) {
      this.svg?.setAttribute("viewBox", "0 0 720 285");
    }
  };
}

// Custom Lesson 07 Interactive Playground: Hardware threads & core configuration
function setupLesson07Playground(player: any): void {
  const engine: QueueEngine = player.engine;
  if (!engine || !player.playgroundSection || !player.scoreboardSection) return;

  // Custom lens button labels matching Lesson 07 topic
  if (player.analogyBtn) {
    player.analogyBtn.textContent = "🍳 Kitchen Analogy";
    player.analogyBtn.title = "View as kitchen order rail and chef prep station";
  }
  if (player.mechBtn) {
    player.mechBtn.textContent = "⚡ Multiprocessor SMT";
    player.mechBtn.title = "View as multicore hyperthreaded hardware pipeline";
  }

  let coresCount = 2;
  let smtEnabled = true;

  const updatePlaygroundAndScoreboard = () => {
    const totalLogical = coresCount * (smtEnabled ? 2 : 1);

    player.playgroundSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">
            Interactive Playground: Multiprocessor Cores & SMT
          </h3>
          <div style="font-size: 0.74rem; color: var(--muted); margin: 2px 0 0 0;">
            Add cores and hardware threads to watch memory stall dead-time get absorbed.
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

    player.scoreboardSection.innerHTML = `
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
    const coreSlider = player.playgroundSection.querySelector("#core-count-slider") as HTMLInputElement;
    coreSlider?.addEventListener("input", (e: Event) => {
      coresCount = Number((e.target as HTMLInputElement).value);
      applyConfiguration();
    });

    const toggleBtn = player.playgroundSection.querySelector("#btn-toggle-smt") as HTMLButtonElement;
    toggleBtn?.addEventListener("click", () => {
      smtEnabled = !smtEnabled;
      applyConfiguration();
    });

    const btnSingle = player.playgroundSection.querySelector("#btn-preset-single") as HTMLButtonElement;
    btnSingle?.addEventListener("click", () => {
      coresCount = 1;
      smtEnabled = false;
      applyConfiguration();
    });

    const btnSmt = player.playgroundSection.querySelector("#btn-preset-smt") as HTMLButtonElement;
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
        { caption: "T1 dispatched to Core 0. Runs computation cycle.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall (cache miss). Pipeline sits idle waiting on storeroom!", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "No alternate hardware thread available. CPU pipeline remains completely idle during stall.", action: "demote" as const, itemId: "T2", toQueue: "ready" },
        { caption: "Memory returns. T2 dispatched sequentially to Core 0.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t0" }
      );
    } else if (coresCount === 1 && smtEnabled) {
      events.push(
        { caption: "T1 dispatched to Core 0 (Thread 0). Runs computation cycle.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall. Hardware thread switches instantly to T2 on Thread 1.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t1" },
        { caption: "T2 executes while T1 memory stall resolves in background.", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "Latency masked: hardware multithreading keeps the core computation units busy.", action: "dispatch" as const, itemId: "T3", coreId: "core0_t0" }
      );
    } else if (!smtEnabled) {
      events.push(
        { caption: "T1 dispatched to Core 0; T3 dispatched to Core 1 in parallel.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T3 dispatched to Core 1.", action: "dispatch" as const, itemId: "T3", coreId: "core1_t0" },
        { caption: "T1 hits memory stall. Without hardware threads, Core 0 goes idle.", action: "demote" as const, itemId: "T1", toQueue: "stall" },
        { caption: "Multicore without SMT still experiences memory stalls when threads wait on RAM.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t0" }
      );
    } else {
      events.push(
        { caption: "T1 dispatched to Core 0 (Thread 0). Runs computation cycle.", action: "dispatch" as const, itemId: "T1", coreId: "core0_t0" },
        { caption: "T1 hits a memory stall (cache miss). Hardware thread switches instantly to T2.", action: "dispatch" as const, itemId: "T2", coreId: "core0_t1" },
        { caption: "T3 dispatched to Core 1 (Thread 0) in parallel.", action: "dispatch" as const, itemId: "T3", coreId: "core1_t0" },
        { caption: "Hardware multithreading overlaps memory stall with computation, masking latency.", action: "dispatch" as const, itemId: "T4", coreId: "core1_t1" }
      );
    }

    (engine as any).input.cores = cores;
    (engine as any).input.events = events;
    (engine as any).steps = (engine as any).buildSteps((engine as any).input);
    engine.seek(0);

    if (player.scrubber) {
      player.scrubber.max = String(Math.max(0, engine.getSteps().length - 1));
      player.scrubber.value = "0";
    }
    if (player.stepIndicator) {
      player.stepIndicator.textContent = `1 / ${engine.getSteps().length}`;
    }
    player.updateCaption?.();
    updatePlaygroundAndScoreboard();
  };

  updatePlaygroundAndScoreboard();
}

// Hook into LessonPlayer prototype to activate Lesson 07 playground for QueueEngine
if (!(LessonPlayer.prototype as any).__lesson07Hooked) {
  (LessonPlayer.prototype as any).__lesson07Hooked = true;
  const origRenderPlayground = (LessonPlayer.prototype as any).renderPlaygroundAndScoreboard;
  (LessonPlayer.prototype as any).renderPlaygroundAndScoreboard = function () {
    if (this.engine instanceof QueueEngine || (this.engine as any)?.input?.cores) {
      setupLesson07Playground(this);
    } else if (origRenderPlayground) {
      origRenderPlayground.call(this);
    }
  };
}

export const lesson07: Lesson<QueueInput, QueueState> = {
  id: 7,
  lecture: 7,
  slug: "lesson-07",
  title: "More cores, more problems",
  absorbsUnits: [19, 20, 21, 22, 23],
  slides: "slides 9–14",
  engine: "queue",
  analogy: {
    domain: "food",
    text: "One kitchen versus several; a chef idle at the pass waiting on the storeroom. With multiple pans (hardware threads), the chef turns to the other pan while the first simmers, absorbing the memory stall."
  },
  concept: "Multiprocessor architectures scale throughput by adding cores and hardware threads (chip multithreading / SMT). When a running task hits a memory stall waiting for a cache miss, the core hardware instantly switches to an alternate hardware thread, masking latency and keeping execution units saturated across two distinct levels of scheduling.",
  morphReveals: "In a kitchen, one chef waiting for an ingredient stands idle. With multiple pans (hardware threads), the chef turns to the other pan while the first simmers, absorbing the memory stall.",
  morphMode: "morph",
  analogyMapping: [
    "Chef Prep Stations ➔ Processor Cores",
    "Multiple Pans per Chef ➔ Hardware Threads (Hyperthreading)",
    "Storeroom Wait ➔ Memory Stall (Cache Miss)",
    "Head Chef Assigning Dishes ➔ OS Thread Scheduler (First Level)",
    "Chef Switching Pans ➔ Core Hardware Thread Switch (Second Level)"
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
      { id: "T2", name: "Task 2", burst: 12, queueId: "ready" },
      { id: "T3", name: "Task 3", burst: 12, queueId: "ready" },
      { id: "T4", name: "Task 4", burst: 12, queueId: "ready" }
    ],
    events: [
      { caption: "T1 dispatched to Core 0 (Thread 0). Runs computation cycle.", action: "dispatch", itemId: "T1", coreId: "core0_t0" },
      { caption: "T1 hits a memory stall (cache miss). Hardware thread switches instantly to T2.", action: "dispatch", itemId: "T2", coreId: "core0_t1" },
      { caption: "T3 dispatched to Core 1 (Thread 0) in parallel.", action: "dispatch", itemId: "T3", coreId: "core1_t0" },
      { caption: "Hardware multithreading overlaps memory stall with computation, masking latency.", action: "dispatch", itemId: "T4", coreId: "core1_t1" }
    ],
    analogy: {
      domain: "food",
      serviceLabel: "Chef Prep Station",
      queueLabels: { ready: "Order Rail", stall: "Storeroom Wait" }
    }
  }
};

export const lesson = lesson07;
export default lesson07;
