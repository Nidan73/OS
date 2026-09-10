# HANDOFF.md — read this first

You are picking up an in-progress build with no prior conversation. This file is self-contained.
**Read it fully, then `SPEC.md`, `LESSONS.md`, and `DESIGN.md`, before writing any code.**

Repo: `https://github.com/Nidan73/OS.git` · work on `main` unless told otherwise.

---

## What is being built

A deployable static site teaching **24 interactive lessons** on Operating Systems
(CSC 2209, Lectures 6–10) — for a student preparing for an exam. Quality matters more than speed;
scope is not being cut.

Each lesson: **opens in a real-life analogy → morphs into the formal mechanism → hands the learner
the controls.** No audio, no narration. Explanation is on-screen text.

Stack: Vite + TypeScript (strict) + GSAP + inline SVG + Vitest. Hash routing, no framework.

---

## The five rules that matter most

1. **Compute every number; never type one.** Gantt charts, waiting times, safe sequences and
   detection results come from pure functions in `src/algorithms/`, tested against the lecture
   slides. A hardcoded value is a defect even when it happens to be right. (SPEC §2.1)
2. **Captions are fields on timeline steps**, never a separate script. Same array drives motion
   and text so they cannot drift. (§2.2)
3. **Complete state snapshots, never deltas.** `render(state, view)` is absolute and idempotent;
   GSAP only tweens *between* snapshots. This is what makes scrubbing and teardown safe. (§4A)
4. **The morph must be geometric, not cosmetic.** See §3C.2a — this was got wrong once and the
   whole spec section exists because of it. Details below.
5. **All colour and spacing lives in `tokens.css`.** `DESIGN.md` is the design authority; read its
   **Part 0 first**, which adapts an Apple marketing language to a data-dense teaching tool.

---

## The mistake that cost three review cycles — do not repeat it

Lesson 2 first shipped with correct shared element ids, a passing isomorphism validator, and
**no morph at all**: the analogy had been drawn in the mechanism's geometry from the start, so
the view parameter only changed fill colour, label text and sprite opacity.

**A transition that changes only paint is a reskin. The analogy must be a different SHAPE, not a
different colour.**

It is a seductive failure because it is less work and passes structural checks. Avoid it:

- **Author the analogy layout independently first**, as you would if the mechanism did not exist.
  People queueing at a food truck occupy *equal* footprints — that is what a queue looks like.
  Only then map it onto the mechanism's element set. Never start from the mechanism and restyle.
- **Declare `morphReveals`** on every lesson: the geometric property whose meaning changes.
  If you cannot name one, there is no lesson in the morph.
- **If the analogy does not map layout-for-layout, declare `morphMode: 'crossfade'`** with a
  one-line reason. An honest cross-fade beats a fake morph. **Expect roughly a quarter of lessons
  to land here — that is correct, not a failure.**

Read `src/lessons/lecture-06/lesson-02.ts` as the reference implementation before building anything.

---

## The gate — a lesson is not finished until it passes

```
npm run verify              # build + preview + gate
npm run gate                # gate only, against a running preview on :4173
npm run gate lesson-09      # one lesson
```

30 checks per lesson: geometry genuinely interpolates between views, isomorphic element ids, no
text overflow at view 0/0.5/1, no internal vocabulary in student-facing copy, the primary control
**fully** above the fold at 1440×900, no horizontal scroll at 360/800/1440, WCAG AA in both
themes, no console errors. Screenshots land in `./screenshots/` (gitignored).

**Never report a lesson complete without a passing gate run.**

Every new lesson must:
- add itself to the `LESSONS` array at the top of `scripts/gate.mjs`
- expose `[data-view-lens]` on the view slider and `[data-primary-control]` on the main interaction
- ship a control that actually changes the outcome — the gate now drives your controls and fails
  if the steps, scoreboard, caption and drawing all stay identical, or if any handler throws

---

## How a lesson extends its engine — read this before writing one

Wave 1 got this wrong four times and it was refactored out on 2026-09-09. The rules are now
enforceable, so follow them rather than rediscovering them.

**Never patch a prototype. Never call `registerEngine()` from a lesson.** Both are global: the
engines are shared between lessons, so patching one changed what a *different* lesson did, and
which version won depended on the order the learner happened to browse in. `grep -rn "prototype
as any" src` must keep returning 0.

Use these four seams instead:

| You need to… | Use |
|---|---|
| give your lesson its own engine behaviour | `engineClass` on the lesson — a subclass of the base engine. `mountLesson` prefers it over the shared registry, so it stays scoped to you. |
| draw your own playground / scoreboard | implement `renderPlayground(host, scoreboardHost)` from `PlaygroundCapable`. Do not touch `LessonPlayer`. |
| relabel the analogy / mechanism lens buttons | `lensLabels` on the lesson. Data, not DOM poking. |
| rebuild the timeline when a control changes an input | `this.setSteps(this.buildSteps(this.input))` — **never** assign `this.steps`. The player resyncs the scrubber, step indicator and caption through `onStepsRebuilt()`. |
| expose a handle for the gate or for probing | `debugHooks()` — merged into `window.__lesson`. Do not assign `window.__lesson` yourself; `LessonPlayer` owns it. |

`svg` is `protected` on all five engines, so a subclass can reach it in `mount()` or `render()`.
Read `src/lessons/lecture-07/lesson-06.ts` (MLFQ) for the full pattern: subclass, computed
metrics, own playground, no patching.

**And compute your numbers.** Lesson 6 shipped showing an average turnaround of `26.3 ms` that
someone had typed in. The real figure, once `mlfq()` computed it, was **38.7 ms** — the typed
number was wrong by 47% and no test or gate check could see it. That is why §2.1 exists.

## Where things stand

**`main` is at `081019e`.** Verified by running it:

```
npm test          →  32 files / 329 tests passing
npx tsc --noEmit  →  clean
npm run build     →  clean
npm run verify    →  GATE PASSED — 594 checks across 18 lesson(s)   (~104s)
grep -rn "prototype as any" src   →  0
```

**18 of 24 lessons built:** L1–L17 and L20.

| Wave | Lessons | Engines | Status |
|---|---|---|---|
| 1 | L1–L8 | `gantt`, `queue` | **done, merged** |
| 2 | L9 · L10–L12 · L13–L15 | `diagram`, `trace`, `counter` | **done, merged** |
| 3 | L16, L17, L20 | `graph`, `matrix` | **done, merged** |
| 3 | **L18, L19, L21, L22** | `diagram`, `graph`, `matrix` | **next** |
| 4 | **L23, L24** | `diagram`/`gantt`, `trace` | not started |

**All seven engines are proven by a shipped lesson** — `gantt`, `queue`, `trace`, `counter`,
`diagram`, `graph`, `matrix`. **Do not rewrite them.** Three deck-verified algorithm modules:
`scheduling.ts`, `synchronization.ts`, `deadlock.ts`.

### Things learned the expensive way — do not rediscover

- **`npm run gate <slug>` is ~6s. Full `npm run verify` is ~104s.** Use the single-lesson gate
  while iterating; full verify only before you merge.
- **`verify.mjs` builds into run-scoped `dist-verify-<pid>-<ts>/`, never `dist/`.** Two runs
  cannot collide. Use `GATE_PORT=<n>` to move the preview.
- **Do not parallelise the gate.** Tried and measured: 594/18 correct but **310s against a
  104s baseline**, ≥419s at concurrency 1. Per-lesson browser contexts refetch the bundle cold
  and the timeouts needed to survive parallel races are pure wait.
- **Parallel subagents do not work in commandcode** — tested twice; one pair died in 9s, another
  hung ~50 minutes with zero files written. Work sequentially. They *do* work in Antigravity.
- **Never run a build against the shared tree while another agent is working.** It clobbers
  `dist/` mid-gate and produces phantom failures.

### The analogy register — apply from the start

Every analogy is cast for one learner: a Bangladeshi undergraduate, upper-middle-class.
The register is **cars, mother, father, the cat, restaurants, food** — household and city life
for a family that owns cars and eats out. **Not** rivers or scenery; **not** street food,
messes or hostels — wrong social register.

Each lesson declares which it is:

- **mechanism-fixed** — the mechanism dictates the analogy's shape, so a familiar-noun swap is
  correct and sufficient. L11's queue-enter-lock-exit-return is mandatory; the home bathroom is
  simply the familiar version. Say so; do not over-think it.
- **re-cast** — real structural choice existed, so find the scenario that genuinely maps.
  L20 is the model: mother's household ledger *actually has* Available/Max/Allocation/Need.

Read `src/lessons/lecture-06/lesson-01.ts` and `src/lessons/lecture-09/lesson-14.ts` for voice.

### Slide discrepancies found — report any others, never massage an input

- **L6 slide 11:** SJF arrivals 0/2/4/5 but a published average wait of 7, only reachable if all
  four arrive at t=0. L3 keeps the published answer for exam alignment and documents it.
- **L7 slide 8:** teaches `PTHREAD_SCOPE_PROCESS`, but Linux NPTL is 1:1 and returns `ENOTSUP` —
  an API mode that does not work on the student's platform.
- Lectures 8, 9 and 10 checked clean.

---

## Your next task

Work **sequentially**, one branch per lesson, `phase1/lesson-NN-<slug>`.

- **L18** Making it impossible — units 72–75 (`diagram`)
- **L19** Safe, unsafe, and stuck — units 76–79 (`diagram` + `graph`)
- **L21** Spotting a deadlock — units 84–87 (`graph` + `matrix`)
- **L22** Getting out — units 88, 89 (`diagram`)
- **L23** Guessing before you build — units 31–33, Little's formula `n = λ·W`
- **L24** The barrier — units 47–49. **Pairs with L12**: L12 owns the broken case, L24 owns the
  fix. Reference it; do not duplicate its trace.

**L17, L21 and L22 share one picture:** cars blocking each other in the building driveway — who
blocks whom, the closed ring, which car has to move out. Build on it rather than inventing.

Every lesson needs: a row in the `LESSONS` array in `scripts/gate.mjs` **and** a row in
`LESSONS_META` in `src/main.ts`; a row in `tests/engine-taxonomy.test.ts`; `[data-view-lens]`
and `[data-primary-control]`; the three SPEC §3C.2c geometry tests reading **real DOM
coordinates**; one step per discrete mechanism event; a `morphReveals` naming a geometric
property whose **meaning** changes; and an honest `engine` declaration (`standalone` if the
`engineClass` extends `AnimationEngine` directly — the taxonomy test enforces this).

**Crossfade is still available and still unused.** 18 lessons, zero `morphMode: 'crossfade'`,
against a spec expecting roughly a quarter. If a morph does not carry, an honest crossfade with
a one-line `morphReason` is the right answer and will not be marked down.

**Merge each branch to `main` yourself after its gate passes.** Never force-push.

---

## Open items

- **Deployment is out of scope.** The owner handles hosting entirely. Produce a verified `dist/`;
  never deploy, never create hosting accounts. Writing `netlify.toml` / `_redirects` is fine.
- **A known slide inconsistency to watch for.** Lecture 6 slide 11 lists arrival times 0/2/4/5 for
  the SJF example but publishes an average wait of 7, which is only reachable if all four arrive
  at t=0 (honouring the stated arrivals gives 5). Lesson 3 keeps the published answer for exam
  alignment, documents the discrepancy, and does not display arrivals the schedule ignores.
  **Check every lesson for the same trap** and report any you find.
- **Verify, do not recall.** Your training data is stale about tooling. Before writing against
  GSAP, Vite, Vitest, TypeScript or Antigravity's own subagent API, fetch current docs — delegate
  to the `research` subagent. Pinned versions are in `DECISIONS.md`; do not silently change majors.
