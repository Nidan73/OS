# CONTEXT — session handoff

**Purpose:** read this first in a new session and you have everything. No prior conversation needed.
**Last updated:** 2026-09-09, after Phase 0 report #3 review.
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
| `SPEC.md` | 900 lines. Authoritative. Architecture, 7 engines, contracts, tests, traps. |
| `ATLAS.md` | 89-unit backlog: id, engine, topic, slides, analogy domain, analogy text. |
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
6. **Seven engines** — gantt 9, queue 10, trace 8, counter 13, graph 6, matrix 7, diagram 36
   units. All 89 mapped in `ATLAS.md`.
7. **Text-to-video AI was ruled out** and should stay ruled out: Sora-2 renders accurate on-screen
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

---

## State

**Phase 0 APPROVED except one base-class bug. Phase 1 NOT started.**

Verified directly by reading the repo (the agent builds in this same folder — inspect the code
rather than relaying questions):
- `core/types.ts` matches SPEC §3.1 exactly. Contract frozen.
- `AnimationEngine` additions accepted: `stepForward`/`stepBack`, `onStepChange`/
  `onPlayStateChange`, `getSteps`/`getCurrentIndex`.
- **Theme default correct** — `initTheme()` removes `data-theme` when nothing is stored, and
  `toggleTheme()` resolves the effective theme via `matchMedia` so the first click flips away
  from the system theme. Earlier concern was unfounded; its report described this imprecisely.
- **`import.meta.glob` is lazy** — no `{ eager: true }`. §3A.3 isolation intact.
- **`destroy()` clears both subscriber lists**, the timeline, and the container.
- `npm test` → **9 passed** (8 lifecycle from §7.1 + 1 sanity). `tsc --noEmit` clean.

**Open bug — blocking Phase 1:**
`playNext()` schedules the reduced-motion advance with a bare `setTimeout` guarded on
`!this.disposed && this.timeline === null`. But `pause()` also sets `timeline = null`, so after
pause the pending timer's guard passes and playback resumes. **Pause is broken under
`prefers-reduced-motion`.** It is in the base class, so all seven engines would inherit it.

Fix: add an explicit `private playing = false` flag, store the timeout handle, and clear both in
`pause()` and `destroy()`. Never infer playing state from `timeline === null`.
SPEC §7.1 gained three regression tests for this (now eleven total).

## What happens next

1. User pastes Phase 0 report #3. Verify the three items above.
2. On pass → **Phase 1 begins with `gantt` alone.** It must be built and reviewed before the other
   six start. It is the most complex renderer and sets the step/caption/scrub patterns the other
   six copy; getting it wrong six times in parallel is the main way this project fails.
3. Review `gantt` hard — this is the highest-leverage review in the project.
4. Then fan out the remaining six engines on `phase1/engine-<name>` branches.
5. Phase 2: five agents, one per lecture, `phase2/lecture-<nn>`.
6. Phase 3: index/routing + analogy scenes. Phase 4: integration, a11y, responsive sweep, handover.

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
- **Sep 9** — Wrote `CONTEXT.md`. Discovered the agent builds in this same folder, so outstanding
  items are now verified by reading code directly rather than by asking.
- **Sep 9** — **Phase 0 report #3 / direct verification:** theme, glob and destroy all correct;
  9 tests green; tsc clean. Found the reduced-motion pause bug in `playNext()`. Sent back as the
  single blocker before `gantt`.
- **Sep 9** — **Phase 0 report #2:** types approved, real browser evidence accepted. Three items
  sent back (§7.1 tests, theme default, glob laziness). Spec gained §7.1 — a genuine omission.
