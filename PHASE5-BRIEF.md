# PHASE5-BRIEF.md — the finishing phase

All 24 lessons are built. This brief covers what is left: an independent review of the last
four lessons, two defects in the gate itself, accessibility, one design decision, and the
handover build.

**Read order:** this file → `HANDOFF.md` → `CONTEXT.md` → `SPEC.md` §3C → `DESIGN.md` Part 0.

**Delete `GEMINI-START.md` before you start.** It was written when 18 of 24 lessons existed and
is stale in every number it quotes. `HANDOFF.md` supersedes it.

Use subagents for the read-heavy work — Task A especially, one per lesson. Work sequentially,
one branch per task: `phase5/<task>`. Merge to `main` yourself once that task's gate passes.
Never force-push.

---

## Current state — all of this was run, none of it copied from a report

`main` is at `342298e`.

```
npm test          →  41 files / 505 tests passing
npx tsc --noEmit  →  clean
npm run verify    →  GATE PASSED — 815 checks across 24 lesson(s) and 2 reference page(s)
```

The reference layer is **complete at two pages**, `lecture-06` and `lecture-07`.

**There is no Ch 8, 9 or 10 reference page to build, and you must not build one.** Ch 8 and
Ch 9 retain nothing — units 47–49 became L24 — and Lecture 10 slide 33 is a section header
whose three bullets L21 (detection) and L22 (recovery) now teach in full.

---

## Task A — Review L21, L22, L23, L24. Do this first, and do it properly.

This is the most valuable thing you will do here, and it is not a formality.

Those four lessons were written by the seat that normally reviews *your* work, so nothing
independent has ever looked at them. Two things to know before you start:

- The gate passed all four. The gate cannot see the failure classes that actually bite this
  project.
- The owner opened L24 and found the UI visibly broken — overflowing text, a heading taken from
  a different lesson's analogy, and a "morph" whose geometry moved 4px. It had scored 29/29.

So assume there is something wrong, and go and find it.

For each of L21–L24, give a verdict with evidence, not an impression:

1. **Analogy** — is it a genuine re-cast, or a noun-swap wearing a re-cast's clothes? Each
   lesson must declare which it is (see *The analogy register* in `HANDOFF.md`). The register is
   **cars, mother, father, the cat, restaurants, food** — a Bangladeshi upper-middle-class
   family that owns cars and eats out. Not rivers or scenery; not street food or hostels.
2. **`morphReveals`** — does it name a geometric property whose *meaning* changes, or does it
   summarise the topic? Then **verify the claim**: open the lesson, set view 0 and view 1, and
   measure that the named property actually moves a meaningful distance. L24's said "the gap
   between the columns"; that gap moved 20px → 16px. A `morphReveals` that is not true of the
   rendered geometry is a defect, not a wording nit.
3. **Words vs mechanism** — does any student-facing string contradict what the code computes?
   This has recurred six times on this project. A card reading "takes one" over a `+1`
   mechanism is the shape of it.
4. **Look at it.** Load every lesson at 1440×900, both themes, both views, and step the whole
   timeline. Screenshot anything that looks wrong. This is the step that caught L24.

**Rules for this task:**

- Fix anything unambiguously wrong — a factual error, an overflowing box, a broken claim — and
  state each thing you fixed.
- For judgment calls, such as *is this analogy really a re-cast?*, **report and stop**. Do not
  rewrite someone's analogy on your own judgment.
- Do not change a test to make a lesson pass. If a test and the lesson disagree, that is the
  finding.

**Deliver:** a findings list, most serious first, each with `file:line` and the evidence you
gathered. *"I reviewed them and they look good"* is not an acceptable answer to this task.

---

## Task B — Two defects in the gate. Both found while building L21–L24.

### B1 · The gate reads less geometry than the spec allows

| where | what |
|---|---|
| `scripts/gate.mjs:128` | `out[el.id] = { x: b.x, width: b.width };` |
| `src/engines/gantt.ts:509` | `validateMorph()` — same two attributes |
| `SPEC.md:461` | *"at least one geometric attribute — `x`, `y`, `width`, `height`, or transform — must differ between `view = 0` and `view = 1`"* |

A lesson whose carrying property is **vertical** is therefore spec-legal and gate-invisible: the
gate reports it as *"geometry identical at view 0 and 1 — this is a reskin"*. That is a false
negative, and it already caused one lesson to be redesigned around the instrument instead of
the content.

Widen both to the attributes `SPEC.md` already names. Then **prove the widened check still
fails when it should**: temporarily make a lesson a genuine reskin, confirm the gate catches
it, revert. Paste both outputs.

**This was deliberately left for you.** The seat that found it also wrote the lessons the gate
judges, and must not be the one loosening it.

### B2 · The gate cannot see SVG text overflowing its box

`scripts/gate.mjs:203` — `el.closest('g, .box, .card')`

A `<g>` has no intrinsic size: its bbox is the union of its children, so a text node can never
exceed its own group and the check silently passes. L24 shipped a ~110px label inside a 52px
box and scored 29/29.

Compare each text against the `rect` it is visually drawn inside, not its parent group.
Tightening this is safe — it can only catch more, never fewer. Re-run the full gate afterwards
and **report every lesson it newly catches**. Expect more than L24.

---

## Task C — Accessibility: put the checks in the gate first, then fix what they surface

The gate today checks colour contrast on body text in both themes and nothing else. Do not
sweep by hand first — that is reviewing by eye, which is the thing the gate exists to replace.

Add to `scripts/gate.mjs`, per lesson and per reference page:

- every interactive control is reachable by keyboard and has a visible `:focus-visible` state
- every icon-only control has an accessible name
- `prefers-reduced-motion` is honoured — the code does this in `src/core/engine.ts` and
  `src/styles/base.css`, but nothing currently proves it stays that way
- the page has one `h1` and a sane heading order
- contrast covers control text and the scoreboard, not only body copy

Then fix what they catch. Paste the check count before and after.

---

## Task D — DESIGN.md L2 finding 5 is mostly done. Verify; do not re-do.

Measured: **41 of 45** buttons already use `--rounded-pill`, and `--rounded-lg` appears 90
times. The only exceptions are four ±1 stepper buttons in `lesson-05` and `lesson-10`, where a
pill is arguably the wrong shape for a small square nudge control.

Decide those four against `DESIGN.md` and apply the decision. **Do not restyle the other 41.**

---

## Task E — A verified `dist/` and `DEPLOY.md`

Deployment is out of scope: the owner hosts it. Produce a verified `dist/` and a `DEPLOY.md`.
Never deploy, never create hosting accounts. Writing `netlify.toml` / `_redirects` is fine.

---

## Rules that do not bend

1. **Compute every number; never type one.** Every figure on screen comes from a pure function
   in `src/algorithms/`, tested against the lecture slides. A hardcoded value is a defect even
   when it happens to be right.
2. **Never bend the artifact to fit the check.** If something you wrote fails, report what
   failed and why *before* changing anything. Never edit a test to accommodate an
   implementation without saying so explicitly. If a check and the spec disagree, that is a
   finding — not something to resolve by changing the work.
3. **No prototype patching**, and no `registerEngine()` from a lesson. Use the four seams:
   `engineClass`, `renderPlayground()`, `lensLabels`, `setSteps()` + `onStepsRebuilt()`.
4. **No completion claim without pasted gate output.** *A lesson that fails the gate is not
   finished.* The same applies to a task.
5. **A number in the UI that no test asserts is a defect.** And a test asserting a value moved
   by `>= 1px` is not an assertion — that is exactly how L24's broken morph passed.
6. **The playground is a 412px-wide column**, and its section must end above `y=900` at
   1440×900. `LessonPlayer` marks the whole *section* as `[data-primary-control]`, so the gate
   measures the section, not your button. Budget ≈ 412×198. `lesson-05` and `lesson-06` strip
   that attribute to dodge the check; that hides content off screen. Do not copy it.
7. **Verify, do not recall.** Training data is stale about tooling. Fetch current docs before
   writing against GSAP, Vite, Vitest or TypeScript. Pinned versions are in `DECISIONS.md`; do
   not change majors.

**Crossfade is still available and still unused** — 24 lessons, zero `morphMode: 'crossfade'`,
against a spec expecting roughly a quarter. If a morph does not carry, an honest crossfade with
a one-line `morphReason` is the **right** answer and will not be marked down. L24 is the
cautionary tale in the other direction.

---

## Report back, per task

- what you changed, file by file
- the pasted output of `npm test`, `npx tsc --noEmit`, `npm run verify`
- every finding you did **not** fix, and why
- anything you found that contradicts this brief — I would rather be corrected than agreed
  with. Two claims in the project docs were wrong this week, and both were mine.
