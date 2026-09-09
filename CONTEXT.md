# CONTEXT — session handoff

**Purpose:** read this first in a new session and you have everything. No prior conversation needed.
**Last updated:** 2026-09-09, after the Lesson 2 review (sent back, morph not real).
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
| `KICKOFF-PROMPT.md` | The opening message pasted into Antigravity. |
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

**Phase 0 signed off. Phase 1 in progress — `gantt` built, reviewed, SENT BACK with 3 findings.**
Branch `phase1/engine-gantt`, commit `dbad354`. **The other six engines have NOT been started and
must not be until these are resolved** — gantt is the reference implementation they copy.

Verified directly (always run these yourself, do not trust the report):
- `npx vitest run` → **21 passed / 4 files**. `tsc --noEmit` clean.
- Pause bug fixed correctly: explicit `private playing`, stored `advanceTimer`, both cleared in
  `pause()`/`destroy()`/`seek()`. All 11 §7.1 tests green.
- Scheduling numbers hand-checked against the decks: FCFS slide 8 ✓, convoy slide 9 ✓,
  SRTF slide 15 ✓ (avg 6.5 / 13), RR q=4 slide 17 ✓ (5.67), Priority slide 21 ✓ (8.2).
- `render()` is genuinely idempotent — full `replaceChildren()` rebuild from state. Correct.
- Design skill applied: token names all preserved, semantic states kept distinct, both themes
  structured per §5.2, no scroll-jacking or parallax in the canvas.

**Lesson 2 reviewed and SENT BACK.** Branch `phase1/lesson-02-fcfs`, commit `a3dabed`.
30 tests pass, tsc clean, Playwright verification real. **No other lesson starts until this is
resolved.**

Screenshots live in `~/.gemini/antigravity-cli/brain/<session>/lesson02_*.png` — the agent saves
them outside the repo. **Always open them; the report and the pixels disagreed.**

1. **CRITICAL — the morph does not morph.** `view` appears at only four lines in `gantt.ts`
   (clamp at 496–497, a fill/label branch at 567/572). **It never touches width or x.** view=0 and
   view=0.5 screenshots have identical geometry; only fill, label text and sprite opacity change.
   `validateIsomorphism()` passes trivially because the analogy was authored in the mechanism's
   coordinate space from the start. **Shared IDs were necessary, not sufficient — a gap in my
   §3C.2, not just the implementation. §3C.2 has since been tightened**: new §3C.2a (author the
   analogy layout independently; every lesson declares a `morphReveals` carrying property;
   geometry must measurably interpolate), §3C.2b (`morphMode: 'crossfade'` is the honest fallback
   — expect ~a quarter of lessons there), §3C.2c (three required tests per lesson). The payload was watching equal-width queue members
   become duration-proportional bars; at view=0 the answer is already drawn, so there is no
   insight. Fix is two lerps on width and x between an equal-footprint queue layout and the
   Gantt layout.
2. **Scoreboard reads 0 ms on arrival** (step 1/8, live-accumulation semantics). The lesson's
   headline is 17→3 and the student lands on zeros. Show final computed metrics for the current
   order.
3. **Playground below the fold at 1440×900** — violates DESIGN.md §0.1 and buries the centrepiece
   reorder interaction.
4. **Spec jargon rendering as UI:** "ABSORBS UNITS 7, 8", "Absorbs Atlas units 7, 8", "Isomorphic
   Lens (§3C.2)", "Structural Mapping (§3C.2)". Keep the mapping content, drop the citations.
5. **DESIGN.md reached tokens but not components.** Action Blue and `--completed` correct; cards
   are default bordered rectangles, table generic, buttons not pills, no tile rhythm.

**Still open from earlier, do not lose:** the SJF arrival-time discrepancy belongs to Lesson 3
(slide 11 lists arrivals 0/2/4/5 but publishes avg 7, only reachable if all arrive at t=0).

## What happens next

1. **Immediate:** agent resolves the three gantt findings above, especially #1 (real
   interpolation). Re-review before anything fans out.
2. Then fan out the remaining six engines on `phase1/engine-<name>` branches.
5. Phase 2: five agents, one per lecture, `phase2/lecture-<nn>`.
6. **Run `design-taste-frontend` and review the design language it produces against the six §5.0
   constraints BEFORE it is applied across all units.** Applying a bad direction to 89 units is
   expensive to undo.
7. Phase 3: index/routing + analogy scenes. Phase 4: integration, a11y, responsive sweep, handover.

**Estimate:** ~9–15 h agent time; realistically 3–4 sessions, or ~2 weeks if pacing against the
Pro weekly quota alone.

---

## Log

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
