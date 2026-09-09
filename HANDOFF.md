# HANDOFF.md — read this first

You are picking up an in-progress build with no prior conversation. This file is self-contained.
**Read it fully, then `SPEC.md`, `LESSONS.md`, and `DESIGN.md`, before writing any code.**

Repo: `https://github.com/Nidan73/OS.git` · work on `main` unless told otherwise.

---

## What is being built

A deployable static site teaching **22 interactive lessons** on Operating Systems
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

Read `src/lessons/lesson-02.ts` as the reference implementation before building anything.

---

## The gate — a lesson is not finished until it passes

```
npm run verify              # build + preview + gate
npm run gate                # gate only, against a running preview on :4173
npm run gate lesson-09      # one lesson
```

27 checks per lesson: geometry genuinely interpolates between views, isomorphic element ids, no
text overflow at view 0/0.5/1, no internal vocabulary in student-facing copy, the primary control
**fully** above the fold at 1440×900, no horizontal scroll at 360/800/1440, WCAG AA in both
themes, no console errors. Screenshots land in `./screenshots/` (gitignored).

**Never report a lesson complete without a passing gate run.**

Every new lesson must:
- add itself to the `LESSONS` array at the top of `scripts/gate.mjs`
- expose `[data-view-lens]` on the view slider and `[data-primary-control]` on the main interaction

---

## Where things stand

**Wave 1 complete and merged to `main`** — Lessons 1–8. 96 unit tests pass, 219 gate checks pass,
`npm run build` clean.

| Wave | Lessons | Engines | Status |
|---|---|---|---|
| 1 | L1, L2, L3, L4, L5 · L6, L7, L8 | `gantt`, `queue` | **done, merged** |
| 2 | L9 · L10, L11, L12 · L13, L14, L15 | `diagram`, `trace`, `counter` | **next** |
| 3 | L16, L17, L18, L19 · L20, L21 · L22 | `graph`, `matrix`, `diagram` | not started |

Waves are grouped so each introduces at most two new engines. Wave 3 is the hardest chapter
(deadlocks) and runs last, when the patterns are most established.

---

## Your next task: Wave 2

Seven parallel subagents, `branch` isolation, branches `phase1/lesson-NN-<slug>`.

- **L9** Real-time and latency (`diagram`)
- **L10** The last slice — race conditions (`trace`)
- **L11** What a correct solution must promise (`trace`)
- **L12** Peterson's solution, and why hardware breaks it (`trace`)
- **L13** One indivisible motion — test-and-set, CAS (`counter`)
- **L14** Locks, and the cost of waiting at the door (`counter`)
- **L15** Semaphores (`counter`)

**Subagents inherit no conversation history.** Every brief must be self-contained and include,
quoted in full rather than referenced:

- the lesson's entry from `LESSONS.md`, verbatim
- the `ATLAS.md` rows for the units it absorbs (id, title, slides, analogy domain, analogy text)
- `src/lessons/lesson-02.ts` as the reference implementation
- SPEC §3C.2a, §3C.2b and §3C.2c in full
- the exact file paths it owns, and that it must touch nothing else
- "add your lesson to the `LESSONS` array in `scripts/gate.mjs`"
- "expose `[data-view-lens]` and `[data-primary-control]`"
- "run `npm run gate` for your lesson before reporting; a failing gate means not finished"

A wave is not done until all seven pass. **Merge each branch to `main` yourself after its gate
passes — subagents never merge.** Never force-push.

Report the wave as one summary: which lessons passed, which declared `crossfade` and why, and
**any lesson where the slide's stated inputs did not reproduce its stated answer** — flag those
rather than massaging the input. That is the one failure mode the gate cannot catch.

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
