# CONTEXT — session handoff

**Purpose:** read this first in a new session and you have everything. No prior conversation needed.
**Last updated:** 2026-09-09, 23:10. **Wave 1 complete and merged. Wave 2 engine layer built and the
five correction items are CLOSED** on `phase1/engines-wave2`. The seven lesson subagents have not
fanned out yet — that is the next action.
**Keep this current.** Update the State and Log sections at every phase gate.

---

## Your role

You are the **senior engineer** on this project. You do not write the application code.

A junior implementer — **Gemini 3.8 Flash running in Google Antigravity** — builds it. Your job is
to specify precisely, review its reports critically, and gate each phase. The user relays messages
between you and it: they paste its reports to you, you produce paste-back text for them to send it.

**Always end a review with a ready-to-paste code block.** That is the deliverable format here.

### The review standard that has been working

- **Demand evidence, not assertion.** "It should render" is rejected. Real browser, production
  build, concrete values.
- **Check its claims yourself when cheap.** Its pinned npm versions were verified against the
  registry and were all correct.
- **Name the gap even when it is yours.** §7.1 was added because the spec was missing lifecycle
  tests, and that was said plainly rather than framed as its error.
- **Credit good judgment.** It added observer subscriptions to `AnimationEngine` that were not
  specified; that was the right call and was approved as such.
- Do not rubber-stamp. Two Phase 0 reports have been sent back so far.

---

## The project

A deployable static site teaching **89 Operating Systems concepts** (CSC 2209, Lectures 6–10)
through interactive 2D animations. Each unit: an SVG animation of the real mechanism, a caption
rail advancing in lockstep, a travel/food/friends analogy, and transport controls.

Source material: 10 `.pptx` lecture decks in the parent folder `~/Downloads/New folder/`.

**Stack:** Vite + TypeScript (strict) + GSAP + inline SVG + Vitest. Hash routing, no framework.
**No audio, no narration** — the user explicitly wants on-screen explanatory text instead.
**Deployment is the user's job.** The agent must never deploy. It produces a verified `dist/`.
**Git is the agent's job:** `https://github.com/Nidan73/OS.git`, branch per unit of work.

---

## Files in this folder

| File | Role |
|---|---|
| `SPEC.md` | 950 lines. Authoritative. Architecture, 7 engines, contracts, tests, traps. |
| `LESSONS.md` | **The 20-lesson structure. Supersedes the 89-unit model.** |
| `ATLAS.md` | Source inventory, 89 units: id, engine, topic, slides, analogy domain, analogy text. |
| `DESIGN.md` | Design authority. Apple-derived. **Part 0 is mine and outranks Part 1.** |
| `HANDOFF.md` | **Cold-start brief for a fresh agent session.** Self-contained; on `main`. |
| `KICKOFF-PROMPT.md` | The original opening message. Superseded by `HANDOFF.md` for new sessions. |
| `CONTEXT.md` | This file. |

Two published artifacts exist from earlier (topic inventory; the Flash verdict + handover).
**The user has said not to maintain them.** Do not update or re-publish artifacts unless asked.

---

## Architectural decisions — settled, do not relitigate

1. **Compute every number, never type one.** Gantt bars, waiting times, safe sequences and
   detection results come from pure functions in `src/algorithms/`, tested against slide values.
   This is the project's whole correctness argument. (§2.1)
2. **Captions are fields on timeline steps**, never a separate script. (§2.2)
3. **Complete state snapshots, never deltas.** `render(state)` is pure and idempotent; GSAP only
   tweens *between* snapshots and is never the source of truth. This is what makes scrubbing and
   teardown safe. (§4A)
4. **Classes where there is a lifecycle, functions where there is not.** Engines extend
   `AnimationEngine`; algorithms stay pure functions. (§3A.1)
5. **Encapsulation is not fault isolation.** Error boundary at `mountUnit`, dynamic unit imports,
   nav outside the boundary. One broken unit must not blank the site. (§3A.3)
6. **`DESIGN.md` is the design authority** — an Apple-derived system supplied by the user.
   Precedence: **SPEC §5.0 invariants > DESIGN.md Part 0 > DESIGN.md Part 1**. Part 1 is the
   verbatim Apple system (a marketing-site language); **Part 0 is mine** and resolves four
   collisions with a data-dense teaching tool:
   (a) **density is per-surface** — full Apple airiness on index/chapter pages, compact on the 89
   unit pages, because a student mid-scrub must never scroll to see the caption for the frame
   they are looking at;
   (b) **the single-accent rule governs chrome, not data** — `--running`/`--waiting`/`--blocked`/
   `--idle`/`--completed` and the three analogy-domain colours stay distinct hues and are exempt;
   (c) **monospace is a third type role Apple lacks** — SF Mono → JetBrains Mono for all numbers,
   process ids and matrix cells, with tabular-nums;
   (d) **hover exists** — Part 1's "never document hover" is an instruction to its own author,
   not a prohibition.
   The `design-taste-frontend` skill (taste-skill, MIT, 85.7k stars) is now optional and
   secondary; where it and DESIGN.md differ, DESIGN.md wins. The originally frozen tokens were a
   spec error — freezing values produced a coherent but characterless site.
7. **Seven engines** — gantt 9, queue 10, trace 8, counter 13, graph 6, matrix 7, diagram 36
   units. All 89 mapped in `ATLAS.md`.
8. **Text-to-video AI was ruled out** and should stay ruled out: Sora-2 renders accurate on-screen
   text ~79% of the time, Veo-3.1 ~69%, and this content is almost entirely precise text and state.

---

## Verified external facts (do not re-research)

Checked 2026-09-09. Re-verify only if something depends on a change.

- **npm latest**, confirmed against the registry: `gsap@3.15.0`, `vite@8.2.2`, `vitest@5.0.0`,
  `typescript@7.0.2`. The agent pinned all four correctly.
- **Gemini 3.8 Flash** — released 2026-09-02. DeepSWE v1.1 73.7% (≈ Opus 5 at high reasoning),
  Terminal-Bench 2.1 89.4–90.8%, HLE-Verified 54.9% (flat vs 3.7 — its weak axis).
  Knowledge cutoff March 2026. Default model in Antigravity.
  API $0.75/$3.75 per M, intro rate **through 2026-12-31**, then $1.50/$7.50.
- **Antigravity subagents** — `.agents/agents/<name>.md` with YAML frontmatter, spawned via
  `invoke_subagent`. Isolation: `inherit` / `branch` / `share`. Max nesting depth 10.
  Built-ins: `research`, `browser`, `self`. **Subagents do NOT inherit parent conversation
  history** — every brief must be self-contained.
- **Quota** — user is on **Google AI Pro**. Pro moved to a *weekly* ceiling in March 2026;
  hitting it can lock out up to 168 hours. Exact quotas unpublished. May 2026 brought a 3× raise.
  Parallel subagents multiply burn. Advice given: measure after Phase 0, stagger fan-out, or
  attach an API key (~$30–100 for the whole build) to protect the Pro quota.
- **GSAP** is fully free including all plugins (Webflow, April 2025).
- **taste-skill** — `github.com/leonxlnx/taste-skill`, MIT, 85.7k stars, 154 commits. Billed as
  "the anti-slop frontend framework for AI agents." Ships GSAP templates, so it matches the stack.
  Skill used: `design-taste-frontend` (v2, experimental). Three dials: DESIGN_VARIANCE,
  MOTION_INTENSITY, VISUAL_DENSITY. Invocation the user specified:
  `npx skills use "https://github.com/leonxlnx/taste-skill" --skill "design-taste-frontend"`
  (the repo README documents `npx skills add <url>`). Flagged to the user once: this runs
  third-party code whose instructions an agent with repo write access then follows.

---

## State

**Wave 1 COMPLETE and merged to `main`** (`ee40883`). Verified independently on 2026-09-09:

- `npm test` → **96 passing / 13 files**
- `npm run gate` → **219 checks passing across 8 lessons**
- `npm run build` → clean

Lessons 1–8 shipped: L1 why a scheduler exists · L2 FCFS & the convoy · L3 shortest job first ·
L4 round robin & fairness · L5 priority, starvation & aging · L6 queues within queues ·
L7 more cores, more problems · L8 load balancing & affinity. Engines `gantt` and `queue` proven.

**L1 and L3–L8 landed with zero review round-trips from me.** That is the gate working — the
three-cycle grind on L2 was the cost of building the patterns, and it is paid.

**Wave 2 is in flight.** The agent did the right thing unprompted: it built all three engines
**centrally, once, before the lessons** rather than letting seven parallel agents each invent a
`TraceEngine`. Committed as `345b19c` on `phase1/engines-wave2` — `src/engines/trace.ts`,
`counter.ts`, `diagram.ts` plus `src/algorithms/synchronization.ts` (517 lines:
`simulateRaceCondition`, `simulatePeterson`, `simulateTestAndSetLock`, `evaluateLockCost`,
`simulateSemaphoreOps`, `evaluateRealtimeDeadline`). Mid-flight reading was 116 tests / 17 files
green, `tsc` clean. Subagent definition written to `.agents/agents/lesson_builder.md`; **fan-out
to `phase1/lesson-NN-<slug>` has not happened yet.**

Still the risk: **`trace`**, because L10, L11 and L12 all depend on it. On L10 specifically —
`crossfade` may not be needed. Round the plate, *where* a friend stands is arbitrary; on the
trace, vertical position becomes *when* they acted and the horizontal split becomes *whose*
register holds the value. Position stops meaning place and starts meaning time, which is a real
carrying property and is the whole lesson of a race condition. Morph first; crossfade honestly
if it will not carry.

**Account switch:** the user moved to a second Google AI Pro account mid-project (quota
exhaustion on the first), same machine. `HANDOFF.md` on `main` is the cold-start brief. No
persisted subagent definitions exist in `.agents/agents/` or `~/.gemini/config/agents/` — new
sessions define their own.

**Still open, do not lose:**
- **Findings from the 2026-09-09 senior review — ALL FIVE NOW FIXED AND VERIFIED.**
  Closed on `phase1/engines-wave2`. Kept here because the *reasons* still bind Wave 2.
  1. **The hardcoded metric is gone.** Lesson 6 displayed `AVG TURNAROUND 26.3 ms` as a typed
     literal. `mlfq()` now computes it: the true figure is **38.7 ms, avg wait 21.0 ms, 3
     demotions** — the published 26.3 was wrong by 47%. Dragging the demotion threshold to 24
     recomputes to 44.0 ms / 1 demotion, verified in a real browser.
  2. **Every prototype patch is deleted** — `grep -rn "prototype as any" src` returns 0.
     Lessons 5, 6, 7 and 8 had been patching `QueueEngine.prototype`, `GanttEngine.prototype`
     (including `render()` itself) and `LessonPlayer.prototype`, each under a different
     first-load-wins guard, so behaviour depended on which lesson the learner opened first.
     Lessons 4 and 6 also called `registerEngine()`, which **globally replaced the shared engine
     for every other lesson**. Replaced by four seams, all on `main`-bound code:
     - `Lesson.engineClass` — a lesson declares its own engine subclass; `mountLesson` prefers
       it over the registry. **Lessons must never call `registerEngine()`.**
     - `PlaygroundCapable.renderPlayground(host, scoreboardHost)` — a lesson draws its own
       playground and scoreboard from inside its engine.
     - `Lesson.lensLabels` — lens-button copy as data, instead of reaching into the player's DOM.
     - `AnimationEngine.setSteps()` + `onStepsRebuilt()` — replacing the timeline notifies the
       player, which resyncs the scrubber, indicator and caption. **Never assign `this.steps`.**
       `svg` is now `protected` on all five engines so subclasses can reach it.
  3. **`morphReveals` rewritten for lessons 4–8** to name a geometric property whose meaning
     changes, not to summarise the topic. Lesson 2 remains the standard.
  4. **Stale references fixed** — `HANDOFF.md` now points at the real lesson-02 path, and the
     `analogyMapping ... as any` casts are gone from every lesson.
  5. **The gate gained three checks per lesson (219 → 243).** It drives up to six playground
     controls and asserts that at least one changes the steps, scoreboard, caption or drawing,
     and that none of them throw. This was added because the refactor introduced a real break
     — an aging handler calling a method that no longer existed — that **all 219 existing checks
     passed over, because nothing in the gate clicked anything.** Verified by re-injecting that
     exact bug and confirming the gate fails on it.
- **`as any` is down to 28 in `src`**, none of them prototype patches: 8 in lesson-05, 3 in
  lesson-04, 5 in `registry.ts` (the engine-constructor map), 2 in `main.ts`, 1 in LessonPlayer,
  plus `window as any` for the `__lesson` debug handle. Not blocking; worth a pass before done.
- **L2 finding 5** — DESIGN.md Part 1 components were only partly applied: buttons are not
  `{rounded.pill}`, cards need `{rounded.lg}` on `{colors.hairline}`, and there is no tile rhythm.
  Cosmetic, not blocking, but it should land before the site is called done.
- **The slide-inconsistency trap.** L6 slide 11 lists SJF arrivals 0/2/4/5 but publishes avg 7,
  only reachable if all arrive at t=0 (honouring arrivals gives 5). L3 keeps the published answer
  for exam alignment and documents it. **Every wave must report any lesson where a slide's stated
  inputs do not reproduce its stated answer** — the gate cannot catch this.

## The gate — use it instead of reviewing by eye

`npm run gate` (needs `npm run build && npm run preview` first, or just `npm run verify`).
27 automated checks per lesson, encoding everything previously caught manually: morph geometry
actually interpolates, isomorphic element ids, no text overflow at any view, no internal
vocabulary in student copy, primary control fully above the fold at 1440×900, no h-scroll at
360/800/1440, WCAG AA in both themes, no console errors. Screenshots land in `./screenshots/`.

**Add each new lesson to the `LESSONS` array at the top of `scripts/gate.mjs`.** Lessons should
expose `[data-view-lens]` and `[data-primary-control]`; the gate falls back to heuristics but the
hooks are more reliable.

**Do not review lessons by reading screenshots.** Run the gate. Spot-check two or three lessons
per wave, not all of them — that was the bottleneck that made L2 take three cycles.

## What happens next

1. **Wave 2** — L9, L10, L11, L12, L13, L14, L15. Seven parallel subagents. Verify with
   `npm test` and `npm run gate` here yourself; spot-check two lessons, not seven.
2. **Wave 3** — L16, L17, L18, L19 (`graph`) · L20, L21 (`matrix`) · L22 (`diagram`). The
   hardest chapter, run last when the patterns are most established.
3. **Finish L2 finding 5** and do a DESIGN.md pass across all 22 lessons.
4. **Reference layer** — the 9 definition-only Atlas units (6, 17, 18, 31, 32, 33, 47, 48, 49) as
   one scrollable page per chapter. Not animations.
5. Final integration, a11y sweep, `dist/` + `DEPLOY.md` handover. **The owner deploys, not us.**

## Log

- **Sep 9, 23:10** — **Closed all five correction items myself** at the user's instruction, then
  verified: 117 tests, `tsc` clean, build clean, **243 gate checks across 8 lessons**. The
  refactor deleted every prototype patch and both `registerEngine()` calls from the lessons.
  Two things worth carrying forward: the hardcoded MLFQ metric was wrong by 47%, not merely
  hardcoded — so "compute it" was not pedantry; and the refactor introduced a real break that
  219 gate checks passed over, which is why the gate now drives the controls. **A check that has
  never been seen to fail is not yet a check** — the new one was proved by re-injecting the bug.
- **Sep 9, 22:00** — **Senior review while Wave 2 was mid-flight.** Verified Wave 1 independently
  (96 tests, 219 gate checks, clean build) rather than trusting the file. Caught the agent writing
  the Wave 2 engine layer live and uncommitted on `main`; sent a five-item correction block —
  branch it, type the capability seam, delete the prototype patches and compute L6's metric, fix
  the stale paths the seven briefs would copy, and restore the `morphReveals` bar. It had already
  found the `LessonPlayer` coupling itself and fixed it with capability checks plus a
  `renderPlayground()` hook; it then typed the seam with `unknown`, not the `any` that was
  specified. Both were better than asked for. **The lesson for the senior seat: the gate covers
  the junior, but nothing covers the senior — every finding above is one the gate passes.**

- **Sep 9** — Scanned the 10 decks. Extracted 89 units from Lectures 6–10; wrote the Atlas.
- **Sep 9** — Researched tooling. Ruled out text-to-video. Chose web-native over Remotion/Manim
  once the user said they wanted a deployable site.
- **Sep 9** — User confirmed on-screen text, not narration. TTS removed from the stack entirely.
- **Sep 9** — Wrote `SPEC.md`, `ATLAS.md`, `KICKOFF-PROMPT.md`. Verdict on Flash: go, conditional
  on the spec removing the open-ended judgment it is weakest at.
- **Sep 9** — Added on user request: chapter nav, responsive, animation integrity, verify-don't-
  recall, OOP + fault isolation, git workflow. Removed deployment from agent scope.
- **Sep 9** — **Phase 0 report #1 rejected.** Deploy not done, restatement gave line numbers
  instead of content, "tests pass" on a likely empty suite. Versions checked and were all correct.
- **Sep 9** — **Wave 1 shipped.** L1–L8 merged to `main`; 96 tests, 219 gate checks, clean build.
  Wrote and pushed `HANDOFF.md` for the account switch.
- **Sep 9** — **Built `scripts/gate.mjs`** (27 checks/lesson) after the user pushed back that the
  pace was unsustainable. Owned the cause: reviewing by eyeball does not scale and I had
  over-specified in prose instead of shipping a reference implementation early. The gate replaced
  human screenshot review and Wave 1 then landed with no review round-trips.
- **Sep 9** — Split L19/L20; 20 → **22 lessons**. Coverage verified 89/89 units, none missing or
  double-counted. Deadlocks was 31% of material on 25% of lessons.
- **Sep 9** — **Replan.** User rejected the design *and* the explanations. Diagnosed the root
  cause as the content model, not the visuals: 89 slide-shaped clips, 36 of them fades on stills,
  analogies stapled on as captions, no interaction. Replaced with 20 interactive lessons plus a
  reference layer. User chose: 20 lessons, playground (no predict/commit), analogy-first-morph.
- **Sep 9** — User supplied an Apple-derived design system. Wrote it to `DESIGN.md` with a Part 0
  adaptation preamble resolving four marketing-site-vs-teaching-tool collisions. Demoted the
  taste-skill to optional. SPEC §5.0 and KICKOFF-PROMPT updated to point at it.
- **Sep 9** — **Phase 0 signed off.** Pause bug fixed properly. `gantt` built with 6 slide-verified
  scheduling algorithms; 5 of 6 hand-checked correct. Sent back on 3 findings — chiefly that GSAP
  was being used as a bare timer, so nothing actually animates.
- **Sep 9** — User rejected the frontend design. Owned it as a spec error and rewrote §5 to hand
  the design language to the `design-taste-frontend` skill under six non-overridable constraints.
- **Sep 9** — Wrote `CONTEXT.md`. Discovered the agent builds in this same folder, so outstanding
  items are now verified by reading code directly rather than by asking.
- **Sep 9** — **Phase 0 report #3 / direct verification:** theme, glob and destroy all correct;
  9 tests green; tsc clean. Found the reduced-motion pause bug in `playNext()`. Sent back as the
  single blocker before `gantt`.
- **Sep 9** — **Phase 0 report #2:** types approved, real browser evidence accepted. Three items
  sent back (§7.1 tests, theme default, glob laziness). Spec gained §7.1 — a genuine omission.
