# BUILD SPEC — OS Concepts Animated Site

**Status:** authoritative. This document is the source of truth.
**Audience:** the implementing agent(s).
**Authored by:** senior engineer. Architecture decisions here are settled — do not relitigate them.

---

## 0. Read this first

You are implementing, not designing. Every architectural decision in this document has already
been made and justified. Your job is to execute it precisely and prove correctness with tests.

**If something is ambiguous, the answer is in this document. If it genuinely is not, stop and
ask — do not invent.** Inventing an approach that conflicts with this spec costs more to unwind
than asking costs to resolve.

**The single most important rule in this document is §2.1. If you break it, the project is
worthless regardless of how good it looks.**

---

## 0A. Verify, do not recall

**Your training data is stale and you must assume it is wrong about tooling.** Your knowledge
cutoff predates the current releases of most libraries in this stack. Library APIs, config
formats, and deployment settings change, and a confidently-remembered API that no longer exists
costs an hour of debugging that a thirty-second lookup prevents.

### 0A.1 Check the harness before hand-rolling

Before implementing anything infrastructural, check what the environment already provides —
available skills, plugins, built-in subagents, MCP servers, and CLI tools. Antigravity ships
`research` (codebase and web exploration) and `browser` (sandboxed web testing) subagents.
If a capability already exists, use it rather than writing your own.

### 0A.2 Look it up before you use it

Fetch current documentation before writing code against any of these. Delegate to the `research`
subagent so it does not consume your context:

| Verify | Why |
|---|---|
| **GSAP 3** — timeline API, `seek`, `kill`, plugin registration, current licence | Plugins became free in April 2025; older sources say otherwise |
| **Vite** — current `vite.config.ts` shape, static build output, base path | Config format has changed across majors |
| **Vitest** — current assertion and config API | Moves quickly |
| **TypeScript** — `strict` flags for the installed version | |
| **Netlify** — SPA redirect syntax, publish directory, build command | Deploy fails silently when wrong |
| **Antigravity** — `invoke_subagent`, frontmatter schema, isolation modes | The docs are authoritative, not your memory |

### 0A.3 Pin what you verify

When you confirm a version and API, pin the exact version in `package.json` and note it in a
short `DECISIONS.md`. A later subagent must not silently install a different major.

### 0A.4 When docs and memory disagree, docs win

Without exception. If a documented approach conflicts with this spec's assumptions, stop and
report it rather than silently following either one.

### 0A.5 Verify in the browser, not in your head

"It should render correctly" is not evidence. Use the `browser` subagent to load the page and
confirm the animation runs, the captions advance, and the layout holds at 360 px and 1440 px.
A visual claim with no screenshot behind it is a guess.

---

## 1. What we are building

A deployable static website that teaches 89 Operating Systems concepts (CSC 2209, Lectures 6–10)
through interactive 2D animations. Each concept gets one self-contained "unit" page containing:

- an **animation** of the actual mechanism (a Gantt chart, a resource graph, a semaphore counter…)
- a **caption rail** that advances in lockstep with the animation
- a **real-life analogy** drawn from travel, food, or friends
- **transport controls**: play/pause, step forward, step back, scrub, restart

There is **no audio and no narration** anywhere in this project. Explanation is on-screen text.

Target: a static `dist/` bundle — no backend, no database, no auth.

**Deployment is out of scope.** The project owner handles hosting entirely. Your deliverable is a
verified production build, never a deploy. Do not run deploy commands, do not create hosting
accounts, do not push to a hosting provider. Producing the config files the build needs is in
scope; using them is not.

---

## 2. Non-negotiables

### 2.1 Compute the animation. Never hand-author its numbers.

Every scheduling algorithm, every safety check, every detection sweep is implemented as a
**pure TypeScript function** that takes the input from the lecture slide and *returns* the
timeline. The animation renders whatever that function produced.

```ts
// CORRECT — the chart is correct because it was computed
const timeline = fcfs([
  { id: 'P1', arrival: 0, burst: 24 },
  { id: 'P2', arrival: 0, burst: 3  },
  { id: 'P3', arrival: 0, burst: 3  },
]);
// timeline.avgWaiting === 17  ← asserted in a test

// WRONG — someone typed these numbers and they will eventually be wrong
const bars = [
  { id: 'P1', start: 0,  end: 24, wait: 0  },
  { id: 'P2', start: 24, end: 27, wait: 24 },
];
```

**Rationale.** This is a teaching tool. A Gantt chart that is off by one teaches a wrong fact
with total confidence, and nobody catches it because it looks authoritative. Computing it means
the numbers are correct by construction, and the tests in §7 prove it against the lecture slides.

It also makes the project cheap: implement FCFS once and every FCFS unit is nearly free.

**No exceptions. Not for "simple" cases, not for one-off diagrams with numbers on them.**

### 2.2 Captions are data, bound to steps

A caption is a field on a timeline step, never a separately-authored script:

```ts
{ t: 4.0, caption: "P2 arrives, burst 4 < P1 remaining 7 → preempt", state: {...} }
```

The caption rail reads from the same array that drives the motion. This makes it structurally
impossible for the text to describe a frame that is not on screen.

### 2.3 One visual system across all 89 units

Every colour, size, weight, and duration comes from `src/styles/tokens.css`. No component
defines a raw colour or a magic pixel value. A learner moving from unit 12 to unit 80 must feel
they are in the same product.

### 2.4 Correctness gates merge

A unit is not done until its engine's tests pass (§7). Tests are not optional polish.

### 2.5 No `any`, no silent catch

`strict: true` in tsconfig. Errors surface. If an engine receives invalid input it throws with a
message naming the unit.

---

## 3. Architecture

```
                    unit data (89 files)
                            │
                            ▼
                  ┌──────────────────┐
   algorithms/ ──▶│     engine       │──▶ Step[]  (state + caption per step)
   (pure funcs)   └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   UnitPlayer     │  transport, scrubber, caption rail
                  └──────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ analogy layer  │  optional scene sprites, same timeline
                   └────────────────┘
```

**Data flow is one-way and pure.** `algorithms` know nothing about rendering. `engines` know
nothing about routing. `UnitPlayer` knows nothing about which engine it is driving.

### 3.1 The core contract

```ts
// src/core/types.ts  — write this FIRST, everything depends on it

export type Domain = 'travel' | 'food' | 'friends';
export type EngineId = 'gantt' | 'queue' | 'trace' | 'counter' | 'graph' | 'matrix' | 'diagram';

/** One frame of the animation. Produced by an engine, never hand-written. */
export interface Step<S = unknown> {
  /** seconds from timeline start; strictly increasing across the array */
  t: number;
  /** the explanatory text for this step. Present tense, ≤ 120 chars. */
  caption: string;
  /** engine-specific render state at time t */
  state: S;
  /** optional emphasis hint for the renderer, e.g. ['P2', 'edge:R1->P2'] */
  highlight?: string[];
}

export interface Analogy {
  domain: Domain;
  /** 1–2 sentences. Concrete and physical. No metaphor stacking. */
  text: string;
}

export interface Unit<I = unknown, S = unknown> {
  /** 1–89, matches the Atlas inventory */
  id: number;
  lecture: 6 | 7 | 8 | 9 | 10;
  /** url-safe, stable, e.g. 'round-robin' */
  slug: string;
  title: string;
  /** provenance, e.g. 'slides 16–17' */
  slides: string;
  engine: EngineId;
  analogy: Analogy;
  /** 2–4 sentences of plain-language OS explanation shown beside the animation */
  concept: string;
  /** engine-specific input; the engine turns this into Step[] */
  input: I;
}

/** Every engine is this shape. Pure. Deterministic. Same input → same output. */
export type Engine<I, S> = (input: I) => Step<S>[];
```

### 3.2 Repository layout

```
os-animations/
├── src/
│   ├── core/
│   │   ├── types.ts           # §3.1 — written first, then frozen
│   │   ├── registry.ts        # EngineId → Engine, and id → Unit
│   │   └── player.ts          # timeline clock, play/pause/step/seek
│   ├── algorithms/            # PURE. no DOM. fully unit-tested.
│   │   ├── scheduling.ts      # fcfs, sjf, srtf, roundRobin, priority, mlfq
│   │   ├── prediction.ts      # exponential averaging
│   │   ├── bankers.ts         # safety, resourceRequest
│   │   ├── detection.ts       # detection sweep, wait-for cycle finding
│   │   └── graph.ts           # cycle detection for RAG
│   ├── engines/
│   │   ├── gantt.ts  queue.ts  trace.ts
│   │   ├── counter.ts  graph.ts  matrix.ts  diagram.ts
│   ├── components/
│   │   ├── UnitPlayer.ts      # transport + caption rail + scrubber
│   │   ├── CaptionRail.ts
│   │   └── AnalogyScene.ts
│   ├── units/
│   │   ├── lecture-06/        # 14 files, one per unit
│   │   ├── lecture-07/        # 19
│   │   ├── lecture-08/        # 13
│   │   ├── lecture-09/        # 16
│   │   └── lecture-10/        # 27
│   ├── styles/
│   │   ├── tokens.css         # §5. the ONLY place colours exist.
│   │   └── base.css
│   └── pages/
│       ├── index.ts           # unit browser, grouped by lecture
│       └── unit.ts            # single unit view
├── tests/
│   └── algorithms/            # §7. slide-derived assertions.
├── index.html
├── vite.config.ts
├── tsconfig.json              # strict: true
└── package.json
```

### 3.3 Stack — fixed, do not substitute

| Concern | Choice | Note |
|---|---|---|
| Build | **Vite** | `npm create vite@latest -- --template vanilla-ts` |
| Language | **TypeScript**, `strict: true` | no `any` |
| Animation | **GSAP 3** (free incl. all plugins since Apr 2025) | timeline drives everything |
| Graphics | **inline SVG** | not canvas — elements must be individually addressable |
| Tests | **Vitest** | |
| Routing | hash-based, hand-rolled | 89 static routes; no router library |
| Styling | plain CSS + custom properties | no Tailwind, no CSS-in-JS |

Do **not** add React, a router library, a component library, or a state manager. The app is a
timeline and a renderer. Extra layers make it slower to build, not faster.

---

## 3A. Object model and fault isolation

**Goal: one broken unit must never take down the site.** Two separate mechanisms deliver that,
and they are often confused. Use both.

### 3A.1 Where to use classes, and where not to

| Layer | Style | Why |
|---|---|---|
| `src/algorithms/` | **Pure functions** | No state, no lifecycle, no DOM. Wrapping `fcfs()` in a class adds ceremony and hurts testability. Keep them functions. |
| `src/engines/` | **Classes**, extending `AnimationEngine` | Real object lifecycle: owns a GSAP timeline, an SVG subtree, and listeners that must be torn down. Seven implementations of one interface is genuine polymorphism. |
| `src/components/` | **Classes** | Same reason — they hold DOM references and need `destroy()`. |
| `src/units/` | **Plain data** | Units are data, not behaviour. |

The boundary rule: **if it owns something that must be cleaned up, it is a class. If it maps
input to output, it is a function.**

### 3A.2 The engine base class

Template-method pattern. The base owns the lifecycle; subclasses supply three methods and cannot
get the lifecycle wrong.

```ts
export abstract class AnimationEngine<I, S> {
  protected steps: Step<S>[] = [];
  protected timeline: gsap.core.Timeline | null = null;
  protected index = 0;
  private disposed = false;

  constructor(protected container: HTMLElement, protected input: I) {}

  /** Pure. Input → the complete step list. Calls into src/algorithms/. */
  protected abstract buildSteps(input: I): Step<S>[];
  /** Build the static SVG scaffolding once. */
  protected abstract mount(): void;
  /** Absolute render of one state. MUST be idempotent (§4A.2). */
  protected abstract render(state: S): void;

  init(): void {
    this.steps = this.buildSteps(this.input);
    if (!this.steps.length) throw new Error('Engine produced no steps');
    this.mount();
    this.seek(0);
  }

  seek(i: number): void {
    if (this.disposed) return;
    this.index = Math.max(0, Math.min(i, this.steps.length - 1));
    this.timeline?.kill();
    this.timeline = null;
    this.render(this.steps[this.index].state);   // absolute — never a replay
  }

  play(): void  { /* tween index → index+1, then advance */ }
  pause(): void { this.timeline?.pause(); }

  destroy(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.container.replaceChildren();
    this.disposed = true;
  }
}
```

Rules that follow from this:

- **An engine touches only its own `container`.** No `document.querySelector` reaching outside it.
  This is what stops one engine corrupting another's DOM.
- **All state is `protected` or `private`.** Nothing outside an engine mutates its steps or index.
- **`destroy()` is always safe to call twice**, and every method no-ops after disposal.
- **Subclasses never override `seek`, `init`, or `destroy`.** If one needs to, the base class is
  wrong — report it rather than overriding.

### 3A.3 Error boundaries — the part OOP does *not* give you

Encapsulation stops engines corrupting each other. It does **not** stop a thrown exception from
blanking the page. That needs an explicit boundary at the mount site:

```ts
export function mountUnit(unit: Unit, container: HTMLElement): AnimationEngine<any, any> | null {
  try {
    const Engine = registry[unit.engine];
    if (!Engine) throw new Error(`Unknown engine "${unit.engine}"`);
    const engine = new Engine(container, unit.input);
    engine.init();
    return engine;
  } catch (err) {
    console.error(`[unit ${unit.id} · ${unit.slug}]`, err);
    renderFallback(container, unit, err);   // "This unit failed to load" + working nav
    return null;
  }
}
```

**Requirements:**

- A failing unit renders a visible fallback card naming the unit and the error. It never shows a
  blank screen and never throws past this boundary.
- **Chapter navigation keeps working when a unit fails.** The nav is outside the boundary, so a
  broken unit 47 does not prevent reaching unit 48.
- Unit data is validated on load. A malformed unit file fails at that unit only, with a message
  naming the file.
- The index page never imports unit modules eagerly — one bad file must not break the listing.
  Load unit modules dynamically at route time.
- Errors are logged with the unit id and slug, always. Silent catches are banned (§2.5).

### 3A.4 What this buys you

A student hitting a bug on unit 63 sees one broken card and can still use the other 88. Without
the boundary, one typo in one data file produces a white screen for the entire site — which is
exactly the failure mode you are trying to avoid.

---

## 3B. Git workflow

Git is not optional bookkeeping here — Phase 1 runs seven subagents in `branch` isolation, so the
repository *is* the coordination mechanism. It is also your recovery path: a crashed session or a
quota lockout loses nothing that has been pushed.

Remote: `https://github.com/Nidan73/OS.git`

### 3B.1 Push early, push often

- Commit at meaningful checkpoints — a working engine, a passing test suite, a completed lecture —
  never one giant commit at the end of a phase.
- **Push after every phase gate, minimum.** Push more often during long phases.
- Any fresh session must be able to `git pull` and resume with no context loss. If the work only
  exists in your working tree, it does not exist.

### 3B.2 Branch per unit of work

| Phase | Branch | Merges to `main` |
|---|---|---|
| 0 | `main` directly | — |
| 1 | `phase1/engine-<name>`, one per subagent | after review of that engine |
| 2 | `phase2/lecture-<nn>`, one per subagent | after that lecture's units render |
| 3 | `phase3/<task>` | after review |
| 4 | `phase4/integration` | at handover |

Subagents in `branch` isolation get their own worktree. Each pushes its own branch. **A subagent
never merges to `main` and never touches another agent's branch.** Merging is the orchestrator's
job, after review.

### 3B.3 Rules

- **Never force-push. Never rewrite published history.** With seven agents sharing a remote, a
  force-push destroys someone else's work.
- **`main` must always build.** Never merge a branch whose tests fail or whose build errors.
- Commit messages state what and why: `feat(engine): gantt renders preemptive SRTF timeline`,
  `test(bankers): assert safe sequence from L10 slide 31`. Reference unit ids where relevant.
- `.gitignore` must cover `node_modules/`, `dist/`, `.env*`, `.DS_Store`, and editor directories.
- **Never commit secrets, API keys, or `.env` files.** If one is committed, say so immediately —
  do not quietly rewrite history to hide it.
- Do not commit `dist/`. The build is reproducible; the owner builds it themselves.

### 3B.4 Pushing is not deploying

Pushing to GitHub is version control and nothing more. Deployment remains entirely the owner's
(§1). **Be aware that if the owner later connects a host to this repository, pushes to `main`
become deploys** — which is another reason feature work stays on branches and `main` moves only
through deliberate, reviewed merges.

---

## 4. The seven engines

Each engine is `(input) => Step[]`. Each is built by one subagent, in isolation, against tests.

### 4.1 `gantt` — 9 units (1, 7, 8, 9, 11, 12, 13, 14, 31)
Renders a process timeline: arrival markers, execution bars, a moving playhead, and a live
metrics table (waiting / turnaround / response, per process and averaged).
**Input:** `{ processes: {id, arrival, burst, priority?}[], algorithm, quantum? }`
**Must:** recompute metrics from the produced schedule — never accept them as input.

### 4.2 `queue` — 10 units (3, 4, 5, 15, 16, 17, 18, 20, 24, 25)
One or more queues with tokens moving between them, plus CPU/core slots. Covers multilevel
queues, feedback demotion/promotion, push–pull migration, and affinity.
**Input:** `{ queues: {id, label, policy, quantum?}[], processes, cores, events }`

### 4.3 `trace` — 8 units (34, 35, 36, 37, 44, 45, 46, 49)
Two or more instruction columns with an interleaving cursor, plus a register/memory panel.
This is how race conditions and Peterson's solution are shown.
**Input:** `{ threads: {id, instructions: string[]}[], interleaving: number[], initial: Record<string, number> }`
**Must:** actually simulate the interleaving to produce final values. This is how the
`counter++`/`counter--` unit proves that a slice goes missing.

### 4.4 `counter` — 13 units (50–62)
A resource pool with a numeric counter, a holder slot, and a waiting area. Covers test-and-set,
CAS, mutexes, spinlocks, counting and binary semaphores, and block/wakeup queues.
**Input:** `{ initial: number, capacity: number, actors, events, mode: 'spin' | 'block' }`

### 4.5 `graph` — 6 units (64, 69, 70, 71, 79, 84)
SVG node-link diagram: process nodes, resource nodes with instance dots, request and assignment
edges, claim edges (dashed). Highlights cycles when found.
**Input:** `{ processes, resources: {id, instances}[], edges, steps }`
**Must:** detect cycles with a real algorithm (`algorithms/graph.ts`), not a hardcoded edge list.
Unit 71 exists specifically to show a cycle that is *not* a deadlock — a hardcoded highlight
would get this wrong.

### 4.6 `matrix` — 7 units (77, 80, 81, 82, 83, 85, 86)
Allocation / Max / Need / Available tables with per-cell highlighting as the algorithm sweeps.
**Input:** `{ resources: string[], processes, allocation, max, available, request? }`
**Must:** derive `Need = Max − Allocation` in code. Must produce the real safe sequence.

### 4.7 `diagram` — 36 units (the remainder)
The flexible engine for conceptual units with no simulation: annotated scenes where labelled
parts appear, connect, and are highlighted in sequence. Used for the burst histogram, criteria
definitions, the four deadlock conditions, latency phase breakdowns, prevention strategies, and
recovery trade-offs.
**Input:** `{ layout: 'stack' | 'row' | 'radial' | 'free', nodes: {id, label, x?, y?}[], reveals: {ids, caption}[] }`
**Note:** this is the catch-all. If a unit does not fit an engine above, it is `diagram`.

---

## 4A. Animation integrity — how it stays unbreakable

The most common way an animated site rots is that animation *mutates* the thing it is animating.
Scrub backwards and elements are in the wrong place; navigate away mid-play and the next unit
inherits half a transform. The rule below makes that structurally impossible.

### 4A.1 Every step carries a COMPLETE state snapshot, never a delta

```ts
// CORRECT — step 5 fully describes the world at t=5
{ t: 5, caption: "P2 preempts P1", state: {
    bars: [{id:'P1', start:0, end:5, status:'ready'}, {id:'P2', start:5, end:9, status:'running'}],
    playhead: 5, metrics: { P1:{wait:0}, P2:{wait:4} },
}}

// WRONG — step 5 only says what changed; now seeking requires replaying 0..5
{ t: 5, caption: "P2 preempts P1", delta: { moveBar:'P2', to: 5 } }
```

### 4A.2 Rendering is a pure function of state

```ts
render(state: S): void   // sets absolute positions/attributes from state, every time
```

`render()` must be **idempotent**: calling `render(steps[5].state)` twice produces exactly the
same DOM. It sets absolute values (`x`, `width`, `opacity`, `class`) — never relative ones
(`x += 10`, `.toggle()`).

### 4A.3 GSAP tweens *between* snapshots; it is never the source of truth

The state object is the truth. GSAP only interpolates from the current snapshot to the next one
so the motion looks smooth. Therefore:

- `seek(i)` → `timeline.kill()`, then `render(steps[i].state)` directly. Instant and correct.
- `play()` from step `i` → tween `steps[i].state` → `steps[i+1].state`.
- Scrubbing backwards is the same code path as forwards. No special case.
- `prefers-reduced-motion` → skip the tween, call `render()`. Everything still works.

### 4A.4 Teardown is mandatory

Leaving a unit must call `timeline.kill()`, remove listeners, and clear the SVG. A unit that
leaks a running timeline will fight the next unit for the DOM. Every unit component exposes
`destroy()` and the router calls it on every navigation.

### 4A.5 Animation must demonstrate, not decorate

Every moving element must correspond to something real in the mechanism. A bar moves because a
process was scheduled. An edge appears because a request was made. A counter drops because a
semaphore was acquired.

**Banned:** fade-ins that carry no meaning, decorative easing on data, elements that move for
visual interest, and anything animating purely because it looked static.

The test: *pause at any step and ask "what does each thing on screen mean right now?"* If any
moving element has no answer, delete it.

Pace for comprehension. Default step duration 0.6–1.2 s — fast enough not to bore, slow enough
to follow. The learner controls pacing anyway; the default just has to be watchable.

---

## 4B. Navigation and information architecture

The site is a **five-chapter book**, one chapter per lecture. Navigation must make that obvious
at every moment.

### 4B.1 Structure

```
/#/                        index — five chapter cards, unit counts, progress
/#/lecture-06              chapter 6 — its 14 units as a grid
/#/lecture-06/round-robin  unit view
```

### 4B.2 Persistent chapter nav

A top bar present on every page, containing:

- product name, links to `/#/`
- five chapter links: **L6 Scheduling · L7 Multiprocessor · L8 Critical Section · L9 Semaphores · L10 Deadlocks**
- the active chapter is visibly current (`aria-current="page"`), not merely hover-styled
- a theme toggle writing `data-theme` to `<html>` and persisting to `localStorage` in a
  `try/catch` (it can throw in private windows)

### 4B.3 Within a chapter

- unit list for the **active chapter only** — a left rail ≥1100 px, a `<select>` jump menu below
- previous / next unit buttons, which stop at chapter boundaries rather than spilling into the
  next lecture
- current position shown as `Unit 12 of 14`
- each unit page shows its chapter name and slide reference

### 4B.4 Deep links must work

Every unit has a stable URL that restores the unit at step 0. Refreshing must not 404.

Because the app is hash-routed, a refresh resolves client-side and needs no server rewrite. Still
ship a `_redirects` file containing `/*  /index.html  200` and a minimal `netlify.toml`, so the
owner can deploy without editing anything — but **do not deploy them yourself**. Verify routing
against the built output with `vite preview`, not against the dev server.

---

## 4C. Responsive — required, not optional

Mobile is the primary revision context. A student checks a concept on a phone far more often
than they sit down at a desktop. **A unit that only works at 1400 px is not done.**

### 4C.1 Breakpoints and layout

| Width | Layout |
|---|---|
| **≥ 1100 px** | three columns — chapter rail · animation · concept + caption rail |
| **760–1099 px** | two columns — animation full width, concept and captions beneath; rail becomes a jump menu |
| **< 760 px** | single column — nav collapses to a drawer, transport becomes a sticky bottom bar |
| **≥ 360 px** | hard floor. Must be usable. No horizontal body scroll at any width. |

### 4C.2 Rules

- All SVG uses `viewBox` + `preserveAspectRatio`, never fixed pixel width or height. The
  animation scales; it is never cropped and never overflows.
- Wide content (matrices, long Gantt charts) scrolls **inside its own
  `overflow-x: auto` container**. The page body never scrolls sideways.
- Layout uses flex/grid + `gap`. No per-element margins doing spacing work.
- Touch targets ≥ 44 × 44 px. The transport controls are used constantly on mobile.
- Text stays legible without zoom — minimum 15 px body, 13 px captions.
- Matrix engine below 760 px: horizontal scroll with the process-id column sticky.
- Gantt engine below 760 px: the chart may scroll horizontally, but the metrics table
  reflows to stacked rows rather than shrinking to unreadable.

### 4C.3 Verify at three widths

Every unit is checked at **360 px, 800 px, and 1440 px** before it is called done. This is
item 9 of §8 and it is not waivable.

---

## 5. Visual system — locked

Put these in `src/styles/tokens.css`. Do not add colours. Do not change these values.

```css
:root {
  --ground: #EEF0F2;  --surface: #FFFFFF;  --surface-alt: #F5F7F8;
  --ink: #0F1820;     --ink-2: #33424E;    --muted: #5D6E7B;  --faint: #93A2AD;
  --rule: #D3DADE;
  --accent: #C0182F;                    /* playhead, active step, focus */
  --running: #0A6446;                   /* holding CPU / holding resource */
  --waiting: #A56A05;                   /* ready but not running */
  --blocked: #8B2C6F;                   /* blocked on I/O or a lock */
  --idle:    #93A2AD;
  --travel:  #1F6390;  --food: #A56A05;  --friends: #0A6446;

  --step: 8px;                          /* all spacing is a multiple */
  --dur-fast: .18s; --dur: .35s; --dur-slow: .7s;
  --ease: cubic-bezier(.4, 0, .2, 1);
}
```

Dark theme is required. Redefine **only these tokens** under both
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and
`:root[data-theme="dark"] { … }`. Never define a colour inside a media query that has no
definition on bare `:root`.

**Semantic colour is meaning, not decoration.** A bar is `--running` because that process holds
the CPU. Never use `--running` because green looked nice there.

**Type:** Archivo (UI/structure) · Source Serif 4 (analogy + concept prose) · IBM Plex Mono
(all numbers, process IDs, code). Numbers that change on screen get `font-variant-numeric: tabular-nums`.

**Motion:** honour `prefers-reduced-motion` — snap to step end states, no tweening. Every
control has a visible `:focus-visible` outline. The player must be fully keyboard-operable:
`space` play/pause, `←`/`→` step, `home` restart.

---

## 6. Unit authoring rules

Each of the 89 units is one file exporting a `Unit`. Content rules:

- **`concept`** — 2–4 sentences, plain language, no slide-copying. Say what the mechanism does
  and why it matters. Present tense.
- **`analogy.text`** — 1–2 sentences, concrete and physical. The analogy must map *structurally*
  to the mechanism, not just vibe at it. If you cannot explain which part of the analogy is the
  CPU, the analogy is wrong.
- **`caption`** (per step) — ≤ 120 chars, states what is happening *right now* and why.
  Prefer `"P2 preempts P1: 4 remaining < 7 remaining"` over `"Now P2 runs"`.
- **`input`** — take the numbers from the lecture slides listed in the Atlas. Do not invent
  example data when the slide provides some.

The full 89-unit inventory — id, title, slide references, engine, and analogy — is in the
**OS Animation Atlas**. Treat it as the backlog. Do not renumber units.

---

## 7. Tests — the acceptance gate

Every algorithm is tested against numbers taken directly from the lecture slides. These are not
illustrative; they are the contract.

```ts
// tests/algorithms/scheduling.test.ts
test('FCFS matches Lecture 6 slide 8', () => {
  const r = fcfs([
    { id: 'P1', arrival: 0, burst: 24 },
    { id: 'P2', arrival: 0, burst: 3 },
    { id: 'P3', arrival: 0, burst: 3 },
  ]);
  expect(r.waiting).toEqual({ P1: 0, P2: 24, P3: 27 });
  expect(r.avgWaiting).toBe(17);
});

test('FCFS convoy effect reverses on reorder — slide 9', () => {
  const r = fcfs([
    { id: 'P2', arrival: 0, burst: 3 },
    { id: 'P3', arrival: 0, burst: 3 },
    { id: 'P1', arrival: 0, burst: 24 },
  ]);
  expect(r.avgWaiting).toBe(3);
});

test("Banker's finds the safe sequence — Lecture 10 slide 31", () => {
  // 5 processes, resources A(10) B(5) C(7)
  expect(safeSequence(SNAPSHOT_T0)).toEqual(['P1', 'P3', 'P4', 'P0', 'P2']);
});

test("Banker's grants P1's request (1,0,2) — slide 32", () => {
  expect(resourceRequest(SNAPSHOT_T0, 'P1', [1, 0, 2]).granted).toBe(true);
});

test('detection: safe at T0, deadlocked after P2 requests C — slides 39–40', () => {
  expect(detect(DETECT_T0).deadlocked).toEqual([]);
  expect(detect(DETECT_P2_REQUESTS_C).deadlocked).toEqual(['P1', 'P2', 'P3', 'P4']);
});
```

### 7.1 Base-class lifecycle tests — Phase 0, not Phase 1

The `AnimationEngine` contract must be tested **before any engine inherits from it**, because a
bug here is a bug in all seven. These need no real engine — define a trivial three-step
`FakeEngine` in the test file.

```ts
class FakeEngine extends AnimationEngine<void, { n: number }> {
  renders: number[] = [];
  protected buildSteps() {
    return [0, 1, 2].map(n => ({ t: n, caption: `step ${n}`, state: { n } }));
  }
  protected mount() { /* no-op */ }
  protected render(st: { n: number }) { this.renders.push(st.n); }
}

test('seek is idempotent — §4A.2', () => {
  const e = new FakeEngine(el); e.init();
  e.seek(2); const a = e.renders.at(-1);
  e.seek(2); const b = e.renders.at(-1);
  expect(a).toBe(b);
});

test('seek backwards equals seek forwards — §4A.3', () => {
  const fwd = new FakeEngine(el); fwd.init(); fwd.seek(0); fwd.seek(2);
  const back = new FakeEngine(el); back.init(); back.seek(2); back.seek(0); back.seek(2);
  expect(fwd.renders.at(-1)).toBe(back.renders.at(-1));
});

test('seek clamps out-of-range indices', () => {
  const e = new FakeEngine(el); e.init();
  e.seek(99); expect(e.getCurrentIndex()).toBe(2);
  e.seek(-5); expect(e.getCurrentIndex()).toBe(0);
});

test('destroy is safe twice and no-ops afterwards — §3A.2', () => {
  const e = new FakeEngine(el); e.init();
  expect(() => { e.destroy(); e.destroy(); }).not.toThrow();
  const before = e.renders.length;
  e.seek(1);
  expect(e.renders.length).toBe(before);   // disposed engines do nothing
});

test('destroy removes subscriptions', () => {
  const e = new FakeEngine(el); e.init();
  let calls = 0;
  e.onStepChange(() => { calls++; });
  e.destroy();
  e.seek(1);
  expect(calls).toBe(0);
});

test('unsubscribe function detaches a single listener', () => {
  const e = new FakeEngine(el); e.init();
  let calls = 0;
  const off = e.onStepChange(() => { calls++; });
  e.seek(1); const after = calls;
  off(); e.seek(2);
  expect(calls).toBe(after);
});

test('an engine that throws renders the fallback and does not escape — §3A.3', () => {
  class Broken extends FakeEngine { protected mount() { throw new Error('boom'); } }
  const host = document.createElement('div');
  expect(() => mountUnit({ ...UNIT_STUB, engine: 'broken' }, host)).not.toThrow();
  expect(host.textContent).toMatch(/failed to load/i);
});

test('an empty step list is rejected loudly', () => {
  class Empty extends FakeEngine { protected buildSteps() { return []; } }
  expect(() => new Empty(el).init()).toThrow();
});
```

```ts
test('pause() stops playback under reduced motion — regression', () => {
  // The reduced-motion path in play() must be cancellable. Inferring "not playing"
  // from `timeline === null` is unsafe: pause() also nulls the timeline, so a pending
  // timer sees a null timeline and resumes playback after the user pressed pause.
  matchMediaMock('(prefers-reduced-motion: reduce)', true);
  const e = new FakeEngine(el); e.init();
  e.play();
  e.pause();
  const idx = e.getCurrentIndex();
  vi.advanceTimersByTime(5000);
  expect(e.getCurrentIndex()).toBe(idx);      // must NOT have advanced
});

test('pause() stops playback with motion enabled', () => {
  matchMediaMock('(prefers-reduced-motion: reduce)', false);
  const e = new FakeEngine(el); e.init();
  e.play(); e.pause();
  const idx = e.getCurrentIndex();
  vi.advanceTimersByTime(5000);
  expect(e.getCurrentIndex()).toBe(idx);
});

test('destroy() during playback cancels pending advances', () => {
  const e = new FakeEngine(el); e.init();
  e.play(); e.destroy();
  expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
});
```

**Track playback state explicitly.** `private playing = false`, set in `play()` and cleared in
`pause()` and `destroy()`, and gate every scheduled advance on it. Any pending `setTimeout` handle
must be stored and cleared in both `pause()` and `destroy()`. Never infer "is playing" from
`timeline === null` — `pause()` nulls the timeline too, so the two states are indistinguishable.

These eleven tests gate Phase 1. Do not start building engines until they pass.

Required coverage before any engine is considered done:
`fcfs`, `sjf`, `srtf`, `roundRobin`, `priority`, `exponentialAverage`, `safeSequence`,
`resourceRequest`, `detect`, `findCycle`, and the `counter++` interleaving in `trace`.

---

## 8. Definition of done — per unit

A unit ships only when **all** of these hold:

1. Its engine's algorithm tests pass.
2. Every number on screen was computed, not typed.
3. Captions advance in lockstep; pausing anywhere leaves text and visuals agreeing.
4. Play, pause, step forward, step back, scrub, and restart all work.
5. Keyboard operable; `:focus-visible` visible on every control.
6. Correct in light **and** dark theme.
7. No colour or spacing literal outside `tokens.css`.
8. `prefers-reduced-motion` respected.
9. Verified at 360 px, 800 px and 1440 px. No horizontal body scroll at any width.
10. `seek()` is idempotent; scrubbing backwards renders identically to forwards.
11. `destroy()` kills the timeline and clears listeners; navigating away leaks nothing.
12. Every animating element corresponds to a real part of the mechanism (§4A.5).
13. Engine extends `AnimationEngine`, touches only its own container, and `destroy()` is safe twice.
14. Throwing inside the unit renders the fallback card; chapter nav still works.
15. `npm run build` passes with no TypeScript errors.

---

## 9. Phases

| Phase | Work | Parallel? |
|---|---|---|
| **0** | Scaffold, `types.ts`, `tokens.css`, `UnitPlayer`, verified production build | **No — serial** |
| **1** | 7 engines + their algorithms + tests | **Yes — 7 agents** |
| **2** | 89 unit data files | **Yes — 5 agents, one per lecture** |
| **3** | Index page, routing, analogy scenes | Yes — 2 agents |
| **4** | Integration pass, a11y audit, responsive sweep, final build handover | No — serial |

**Phase 0 must be complete and reviewed before Phase 1 starts.** It defines the contracts
everything else is written against. Parallelising it produces seven incompatible interfaces.

**Verify the production build at the end of Phase 0 — not at the end of the project.** Run
`npm run build` and then `vite preview`, and check the app in a browser against the *built*
output. The dev server hides exactly the class of bug that breaks a deploy: wrong base paths,
broken asset URLs, and routing that only works under HMR. Discovering those at unit 60 is
expensive; discovering them on day one is free.

Handover at the end of Phase 4 is a clean `dist/` plus a one-page `DEPLOY.md` stating the build
command, publish directory, and Node version. The owner takes it from there.

---

## 10. Known traps

- **Unit 71** shows a cycle that is *not* a deadlock. If your graph engine highlights every cycle
  as deadlock, this unit teaches the opposite of the truth. Cycle ⇒ deadlock only with single
  instances per resource type.
- **Unit 46** shows Peterson's solution *failing* under instruction reordering. Expected output
  is 100; the unit must be able to show 0. Do not "fix" it.
- **Unit 13** needs the quantum to be draggable and turnaround time to recompute live. It is the
  reason the algorithms are pure functions.
- **Unit 83 and 86** use the same Banker's data structures with different semantics — 83 uses
  declared maximums, 86 uses current requests. Do not share a code path without reading both.
- **SJF is optimal but unimplementable.** Unit 9's caption must say so; unit 10 exists because
  of it.
