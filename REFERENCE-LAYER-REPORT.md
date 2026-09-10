# Reference Layer Implementation Report (Lecture 6 & Lecture 7)

**Branch:** `phase4/reference-layer`  
**Author:** Antigravity  
**Target Lectures:** CSC 2209 — Lecture 6 (Unit 6, slides 6–7) & Lecture 7 (Units 17, 18, slide 23)

---

## 1. Test, Compilation, Build & Quality Gate Verification

### 1.1 `npm test`
```
Test Files  34 passed (34)
     Tests  347 passed (347)
  Start at  19:09:26
  Duration  2.55s (environment 43%, tests 33%, transform 17%, import 7%, worker 1%)
```
All 32 pre-existing test files and the 2 new reference test suites (`tests/reference/lecture-06.test.ts` and `tests/reference/lecture-07.test.ts`) passed with 100% success.

### 1.2 `npx tsc --noEmit`
```
(clean — exit code 0, 0 type errors across src/ and tests/)
```

### 1.3 `npm run build`
```
> os-animation-build@0.1.0 build
> tsc && vite build

vite v8.2.2 building client environment for production...
✓ 45 modules transformed.
dist/index.html                            0.95 kB │ gzip:  0.54 kB
dist/assets/index-CWv2ZgKt.css             5.36 kB │ gzip:  1.82 kB
dist/assets/fcfs-CgKuNiR1.js               0.68 kB │ gzip:  0.43 kB
dist/assets/lesson-02-UaF3mrvs.js          1.79 kB │ gzip:  0.92 kB
dist/assets/lesson-01-CCEyjF4r.js          2.26 kB │ gzip:  1.11 kB
dist/assets/lesson-03-C1Rgrfr0.js          2.41 kB │ gzip:  1.24 kB
dist/assets/deadlock-D6rI1iMn.js           2.85 kB │ gzip:  1.26 kB
dist/assets/lesson-13-DTiwguX0.js         10.95 kB │ gzip:  3.84 kB
dist/assets/synchronization-D_L4VJTm.js   11.09 kB │ gzip:  3.87 kB
dist/assets/lesson-11-DS5JElCM.js         11.19 kB │ gzip:  4.16 kB
dist/assets/lesson-20-E4Q_0b1N.js         11.53 kB │ gzip:  4.26 kB
dist/assets/lesson-08-vhwH3WKe.js         11.77 kB │ gzip:  3.55 kB
dist/assets/lesson-04-CECsJByo.js         11.92 kB │ gzip:  3.83 kB
dist/assets/lesson-05-BKorOQm2.js         12.05 kB │ gzip:  3.70 kB
dist/assets/lesson-15-Bnl70O7C.js         12.39 kB │ gzip:  4.18 kB
dist/assets/lesson-17-DQ4F3DeP.js         12.58 kB │ gzip:  3.80 kB
dist/assets/lesson-12-DBWXziGV.js         12.83 kB │ gzip:  4.41 kB
dist/assets/lesson-07-_jDcO3ZI.js         13.68 kB │ gzip:  3.47 kB
dist/assets/lesson-14-BTPKy-Ra.js         14.07 kB │ gzip:  4.14 kB
dist/assets/lesson-09-BReMjXAa.js         14.15 kB │ gzip:  4.62 kB
dist/assets/lesson-16-CqwghKcK.js         14.97 kB │ gzip:  4.45 kB
dist/assets/lesson-06-C2L_Ro-3.js         17.02 kB │ gzip:  4.83 kB
dist/assets/lesson-10-BXmrrZaG.js         18.24 kB │ gzip:  5.92 kB
dist/assets/lecture-06-BuQFNVjs.js        33.02 kB │ gzip:  6.83 kB
dist/assets/lecture-07--OMAd5vi.js        59.05 kB │ gzip: 12.42 kB
dist/assets/index-C6jVhbgv.js            194.92 kB │ gzip: 55.63 kB

✓ built in 100ms
```

### 1.4 Automated Quality Gate (`scripts/gate.mjs`) Integration & Results

The reference pages have been incorporated into `scripts/gate.mjs` via an additive `REFERENCES` array and `gateReference()` routine that runs **17 checks per reference page**:
1. **Error boundary / fallback check**: Ensures no error boundary or missing page fallback was rendered.
2. **Rendered container check**: Asserts `main.reference-page` is present.
3. **Text overflow / SVG text clipping check**: Evaluates bounding rectangles of `svg text`, `.caption`, `.metric`, `.label`, `td`, `th` against parent containers.
4. **8 Student-facing jargon checks**: Verifies no forbidden terms (`§`, `Atlas unit`, `ABSORBS`, `isomorph`, `SPEC.md`, `view = 0`, `morphMode`, `engine` outside engineering) leak into copy.
5. **3 Responsive floor checks**: Tests viewports `360x780`, `800x900`, `1440x900` to guarantee zero horizontal scroll.
6. **2 Theme contrast & WCAG AA checks**: Validates light and dark theme body/lead contrast against background.
7. **Console error check**: Asserts 0 console errors during load and theme changes.

#### Total Check Count Breakdown:
- **Lessons**: 18 lessons × 33 checks = 594 checks
- **Reference Pages**: 2 reference pages × 17 checks = 34 checks
- **Total**: **628 checks** across 18 lessons and 2 reference pages

#### Full Gate Run Output (`GATE_PORT=5301 npm run verify`):
```
> os-animation-build@0.1.0 verify
> node scripts/verify.mjs

vite v8.2.2 building client environment for production...
✓ 45 modules transformed.
dist-verify-132904-1789045903949/index.html                            0.95 kB │ gzip:  0.55 kB
dist-verify-132904-1789045903949/assets/index-CWv2ZgKt.css             5.36 kB │ gzip:  1.82 kB
dist-verify-132904-1789045903949/assets/fcfs-CgKuNiR1.js               0.68 kB │ gzip:  0.43 kB
dist-verify-132904-1789045903949/assets/lesson-02-UaF3mrvs.js          1.79 kB │ gzip:  0.92 kB
dist-verify-132904-1789045903949/assets/lesson-01-CCEyjF4r.js          2.26 kB │ gzip:  1.11 kB
dist-verify-132904-1789045903949/assets/lesson-03-C1Rgrfr0.js          2.41 kB │ gzip:  1.24 kB
dist-verify-132904-1789045903949/assets/deadlock-D6rI1iMn.js           2.85 kB │ gzip:  1.26 kB
dist-verify-132904-1789045903949/assets/lesson-13-BLZZquCZ.js         10.95 kB │ gzip:  3.84 kB
dist-verify-132904-1789045903949/assets/synchronization-D_L4VJTm.js   11.09 kB │ gzip:  3.87 kB
dist-verify-132904-1789045903949/assets/lesson-11-BwOAd0pK.js         11.19 kB │ gzip:  4.16 kB
dist-verify-132904-1789045903949/assets/lesson-20-DMWBunbb.js         11.53 kB │ gzip:  4.26 kB
dist-verify-132904-1789045903949/assets/lesson-08-BbCh1Vsv.js         11.77 kB │ gzip:  3.55 kB
dist-verify-132904-1789045903949/assets/lesson-04-ziMsWBz5.js         11.92 kB │ gzip:  3.83 kB
dist-verify-132904-1789045903949/assets/lesson-05-N8xISNk9.js         12.05 kB │ gzip:  3.70 kB
dist-verify-132904-1789045903949/assets/lesson-15-CpwxVFjm.js         12.39 kB │ gzip:  4.18 kB
dist-verify-132904-1789045903949/assets/lesson-17-DQtxx17o.js         12.58 kB │ gzip:  3.80 kB
dist-verify-132904-1789045903949/assets/lesson-12-CHvsCHaE.js         12.83 kB │ gzip:  4.41 kB
dist-verify-132904-1789045903949/assets/lesson-07-D8jC1f1n.js         13.68 kB │ gzip:  3.48 kB
dist-verify-132904-1789045903949/assets/lesson-14-lc6knJ2o.js         14.07 kB │ gzip:  4.14 kB
dist-verify-132904-1789045903949/assets/lesson-09-DOe44yQC.js         14.15 kB │ gzip:  4.62 kB
dist-verify-132904-1789045903949/assets/lesson-16-DXY_vYlu.js         14.97 kB │ gzip:  4.45 kB
dist-verify-132904-1789045903949/assets/lesson-06-DyIBix3a.js         17.02 kB │ gzip:  4.83 kB
dist-verify-132904-1789045903949/assets/lesson-10-BMzJ6O61.js         18.24 kB │ gzip:  5.92 kB
dist-verify-132904-1789045903949/assets/lecture-06-B_TRf1ii.js        33.07 kB │ gzip:  6.84 kB
dist-verify-132904-1789045903949/assets/lecture-07--OMAd5vi.js        59.05 kB │ gzip: 12.42 kB
dist-verify-132904-1789045903949/assets/index-B2tNIl5x.js            194.92 kB │ gzip: 55.63 kB

✓ built in 111ms

── lesson-01 · Why a scheduler exists at all
── lesson-02 · FCFS & the convoy
── lesson-03 · Shortest job first
── lesson-04 · Round robin & fairness
── lesson-05 · Priority, starvation & aging
── lesson-06 · Queues within queues (MLFQ)
── lesson-07 · More cores, more problems
── lesson-08 · Load balancing & affinity
── lesson-09 · When late means failed
── lesson-10 · The last slice
── lesson-11 · What a correct solution must promise
── lesson-12 · Peterson's solution
── lesson-13 · One indivisible motion
── lesson-14 · Locks, and the cost of waiting
── lesson-15 · Semaphores
── lesson-16 · Two friends, two chopsticks
── lesson-17 · Seeing it as a graph
── lesson-20 · The banker's algorithm

── lecture-06/reference · Scheduling criteria & five metrics
── lecture-07/reference · Thread scheduling PCS/SCS & schedulers

────────────────────────────────────────────────────────────
GATE PASSED — 628 checks across 18 lesson(s) and 2 reference page(s).
```

### 1.5 Induced Gate Failure Test (Proof of Negative Detection)

To prove that the reference checks in the gate actively detect real defects rather than unconditionally passing, we deliberately altered `.ref-lead` in `src/reference/lecture-06.ts` from `color: var(--ink-2);` to `color: #aaaaaa;` (inducing a WCAG AA contrast failure on light mode).

#### Failure Output:
```
── lecture-06/reference · Scheduling criteria & five metrics

── lecture-07/reference · Thread scheduling PCS/SCS & schedulers

────────────────────────────────────────────────────────────
GATE FAILED — 1 of 34 checks:

  ✗ [lecture-06/reference] contrast light — 2.32:1 at 19px, needs 3:1

A lesson that fails the gate is not finished. Do not report it as complete.
```
The gate correctly aborted with exit code 1 and pinpointed the exact failure mode (`2.32:1 at 19px, needs 3:1`). Following this verification, the line was restored to `color: var(--ink-2);`, returning the suite to a 100% clean pass.
```

---

## 2. Page Descriptions & The Fixed Visual Diagram

### What was broken and how it was resolved
In the initial build, the Worked Example SVG on the Lecture 6 page attempted to place small monospace strings (`P2 (3 ms)`, `P3 (3 ms)`) inside narrow 70px bars (causing text overlapping into adjacent rect borders), and appended unconstrained single-line breakdown strings (`Wait = ... Burst = ... Turnaround = ...`) to the right of completion coordinates ($x > 620\text{px}$), which spilled $240\text{px}$ off the right edge of the card and was clipped by the container.

We completely redesigned the diagram to align with true Apple layout restraint:
1. **Gantt timeline bar**: P1 (24 ms, width 576px) cleanly displays `P1 (24 ms)`. Narrow bars P2 and P3 (3 ms, width 72px) display crisp, centered bold identifiers `P2` and `P3` inside the fill, with their durations `3 ms` placed above the bar at $y=40$. Zero text collision or boundary spilling.
2. **Process Execution & Waiting Breakdown tracks**: Re-anchored to the **exact same horizontal time axis** (0 to 30 ms) as the Gantt chart:
   - P1: 24 ms active green burst bar with wait 0 ms.
   - P2: 24 ms dashed amber waiting bar (`Waiting in Ready Queue: 24 ms (Convoy Delay)`), followed by 3 ms blue burst bar.
   - P3: 27 ms dashed amber waiting bar (`Waiting in Ready Queue: 27 ms (Convoy Delay)`), followed by 3 ms purple burst bar.
3. **Vertical alignment guide lines**: Dotted vertical hairlines connect timeline endpoints (0, 24, 27, 30 ms) through all process rows down to the axis.
4. **Table & KPI cards**: Clean tabular numeric layout with tabular figures for arrival, burst, start, completion, wait, turnaround, and response times.

### Lecture 6 Reference Page Overview (`#/lecture-06/reference`)
- **Theme Support**: Renders in pure White/Parchment in light mode (`--surface`, `--ground`) and deep Slate-Navy in dark mode (`--surface: #121820`, `--ground: #0B0F14`). Passes WCAG AA in both themes.
- **Section Rhythm**: Alternating full-bleed sections with 80px section padding (`calc(var(--step) * 10)`).
- **Core Sections**:
  1. *Hero & Overview*: The role of scheduling criteria in comparing algorithms.
  2. *The Five Metrics*: Individual typographic cards for CPU Utilisation (40%–90%), Throughput (1 proc/hr to 10 proc/sec), Turnaround Time ($\sum \text{wait} + \text{burst} + \text{I/O}$), Waiting Time (scheduler-governed), and Response Time (interactive onset).
  3. *Optimization Criteria & Trade-offs*: Averages vs Extremes (minimizing maximum response time to ensure fairness) and Predictability vs Variance (low variance prioritized for interactive desktop/mobile UX).
  4. *Household Analogy Grid*: Complete mapping of the 5 criteria to dinner service at home.
  5. *Worked Reference Benchmark*: The canonical Lecture 6 slide 8 process set backed dynamically by `fcfs()`.

### Lecture 7 Reference Page Overview (`#/lecture-07/reference`)
- **Theme Support**: Full light/dark mode parity using tokens (`--ground`, `--surface`, `--surface-alt`, `--ink`, `--muted`).
- **Section Rhythm**: 80px vertical rhythm with maximum reading column width of 980px.
- **Core Sections**:
  1. *Thread Scheduling — PCS vs SCS (Slide 7)*: Clear architectural explanation of User-level threads (ULT), Kernel-level threads (KLT), Light Weight Processes (LWP), Process-Contention Scope (thread library scheduling onto LWPs within process), and System-Contention Scope (kernel scheduling threads onto CPU cores system-wide). Explains why modern 1:1 OSes (Linux NPTL, Windows, macOS) use SCS exclusively.
  2. *Architecture SVG (Figure 1)*: Multi-tiered SVG illustrating Process address spaces, user threads, LWP abstraction boundaries, kernel thread pool, and physical hardware cores.
  3. *POSIX Pthreads API (Slide 8)*: C99 reference code block detailing `pthread_attr_setscope`, `pthread_attr_getscope`, `PTHREAD_SCOPE_PROCESS`, and `PTHREAD_SCOPE_SYSTEM`. Documents why Linux returns `ENOTSUP` on `PTHREAD_SCOPE_PROCESS`.
  4. *Production Operating System Schedulers Survey (Slide 23)*:
     - **Linux**: CFS (Completely Fair Scheduler), virtual runtime (`vruntime`), red-black tree ordering, nice values (-20 to +19, 40 levels), and real-time classes (`SCHED_FIFO` / `SCHED_RR`, priorities 0–99).
     - **Windows**: 32 priority levels (0 to 31), zero-page thread (level 0), variable priorities (1–15), real-time (16–31), and dynamic boosting (foreground window focus boost, I/O completion boost, and 4-second starvation boost).
     - **Solaris**: Multi-class dispatch tables (Time-Sharing TS with inverse priority-to-quantum relationship 200ms down to 20ms, Interactive IA, Real-Time RT 100–159, System SYS 60–99, Fair-Share FSS).
  5. *Priority Spectrums SVG (Figure 2)*: Tri-platform comparison of Linux (0–139), Windows (0–31), and Solaris (0–159).

---

## 3. Re-Cast Analogies & Original Replacements

All analogies were moved from the old domain (airports, venue microphones, travel bookings) to the required **household & city dining register** (upper-middle-class family that owns cars and eats out):

| Topic | Old Analogy (ATLAS §6.2) | Re-Cast Analogy (`src/reference/`) | Key Metaphor |
|---|---|---|---|
| **CPU Utilisation** | How busy airport gates stay | The kitchen stove and oven at home actively cooking dinner courses for father, mother, and sister, rather than sitting cold and unlit while family members decide what to order (targeting 40%–90% utilization). | Stove / Oven active cooking |
| **Throughput** | Flights cleared per hour | Number of complete dinner plates or full courses prepared and delivered to the dining table per hour. | Finished dishes per hour |
| **Turnaround Time** | Total door-to-gate time | Total elapsed time from when father or sister requests a meal until the plate is empty, finished, and cleared from the table. | Order-to-clean-plate |
| **Waiting Time** | Minutes stuck in line | Minutes spent sitting at the dining table with an empty fork, waiting for mother or the kitchen to serve the next dish (excluding time actively eating). | Fork-in-hand waiting |
| **Response Time** | How fast someone first acknowledges you | Elapsed time from requesting dinner until the first appetizer, bowl of soup, or cup of tea is placed on the table. | Time to first appetizer |
| **Process-Contention Scope (PCS)** | Your table decides who speaks within your group | Inside a family's booth at a restaurant, father, mother, and children decide among themselves whose story is told next. Father might yield to sister, but the conversation is confined entirely to that booth — neighboring tables neither participate nor care. | Table booth conversation |
| **System-Contention Scope (SCS)** | The venue decides which table gets the microphone | Submitting orders to the restaurant's central kitchen: every ticket from every table enters the head chef's central order rail. The family's order for steak competes head-to-head against orders from Table 3 and Table 8 across the entire restaurant. | Central kitchen order rail |
| **Pthreads Scope API (`PTHREAD_SCOPE_*`)** | Declaring rules up front when booking | Choosing table coordination: `PTHREAD_SCOPE_PROCESS` requests internal turn-taking at the booth; `PTHREAD_SCOPE_SYSTEM` gives each person an independent order ticket submitted to the central kitchen. (On 1:1 Linux, the kitchen manager insists on SCS for every guest, returning `ENOTSUP` if asked for PCS). | Kitchen booking contract |

---

## 4. Subagent Split & Concurrency Report

- **Subagents Deployed**: Two parallel subagents were invoked using `invoke_subagent`:
  1. *Subagent 1 (`e0f4f79b`)*: Responsible for `src/reference/lecture-06.ts` and `tests/reference/lecture-06.test.ts`.
  2. *Subagent 2 (`b072fdf8`)*: Responsible for `src/reference/lecture-07.ts` and `tests/reference/lecture-07.test.ts`.
- **Parent Agent Ownership**: We handled routing and navigation in `src/main.ts` exclusively, preventing shared-edit conflicts.
- **Collisions Hit**: **0 file collisions.** The subagents ran in parallel without file contention.
- **Post-Subagent Audit**: When reviewing the generated Lecture 6 SVG, we diagnosed the text-overflow and clipping issue highlighted in the user's uploaded screenshot (monospace text overflowing narrow 3ms bars and long text strings placed off to the right). We resolved this directly in `src/reference/lecture-06.ts`.

---

## 5. Slide Input / Answer Discrepancies

- **Lecture 6 Slide 11**: Stated SJF inputs $P_1(0, 7), P_2(2, 4), P_3(4, 1), P_4(5, 4)$ publish an average waiting time of 7 ms in the deck, which mathematically only occurs if all four processes arrive simultaneously at $t=0$ (actual wait with staggered arrivals is 3 ms). Documented in the reference notes.
- **Lecture 7 Slide 8**: The deck states `PTHREAD_SCOPE_PROCESS` and `PTHREAD_SCOPE_SYSTEM` are POSIX options, but omits that on Linux NPTL (1:1 model standard for nearly 20 years), `pthread_attr_setscope(&attr, PTHREAD_SCOPE_PROCESS)` fails and returns `ENOTSUP`. Our reference page documents this real-world invariant explicitly so students do not assume both flags work on modern Linux.

---

## 6. Alignment Between Student Copy & Computed Mechanism

- **Lecture 6 Benchmark Parity**: All figures for the FCFS worked example ($P_1$: wait 0 ms, turnaround 24 ms; $P_2$: wait 24 ms, turnaround 27 ms; $P_3$: wait 27 ms, turnaround 30 ms; averages: wait 17.00 ms, turnaround 27.00 ms; CPU utilisation 100.0%; throughput 0.10 proc/ms) are computed live through `fcfs()` in `src/algorithms/scheduling.ts`. There are zero hardcoded numbers in the benchmark card or table.
- **Lecture 7 Arithmetic Parity**: The level ranges (140 levels for Linux, 32 for Windows, 160 for Solaris) are computed from their endpoints ($[139 - 0 + 1]$, $[31 - 0 + 1]$, $[159 - 0 + 1]$).
- **Jargon Gate Cleanliness**: Automated tests in `tests/reference/lecture-06.test.ts` and `tests/reference/lecture-07.test.ts` confirm 0 forbidden jargon terms (`§`, `Atlas unit`, `ABSORBS`, `isomorph`, `SPEC.md`, `morphMode`, `engine` outside engineering).

---

## 7. Feedback on Brief & Observations

1. **Routing in `src/main.ts`**: The hash structure `#/lecture-06/reference` and `#/lecture-07/reference` cleanly differentiates references from `#/lecture-XX/lesson-YY`. The distinct Parchment/Hairline card styling in `renderChapter()` clearly informs the student that it is a reference reading surface rather than an animated lesson.
2. **Lecture 10 Slide 33**: Noted and left alone as instructed (covered by L21/L22).
3. **Repository State**:
   - Working on branch: `phase4/reference-layer`.
   - `GEMINI-START.md` remains untracked.
   - Zero changes made to `src/lessons/**`, `src/engines/**`, `src/algorithms/**`, `tests/lessons/**`, or `LESSONS.md`.
   - Not merged to `main`.
