# Phase 5 · Task A: Independent Review & Audit Report (Lessons 21–24)

**Document Version:** 1.0  
**Date:** 2026-09-10  
**Author:** Antigravity (Implementation Agent)  
**Target Audience:** Senior Engineering & Course Staff  
**Branch:** `phase5/task-A-review-l21-l24` (Merged into `main` at `d1adea5`, pushed to `origin/main`)  
**Status:** **PASSED & VERIFIED** (All tests green, gate verified: 815/815 checks)

---

## Executive Summary

Task A mandated an independent, deep-dive review of four previously unreviewed lessons—**Lesson 21, Lesson 22, Lesson 23, and Lesson 24**—which had silently passed the automated gate despite serious visual and factual discrepancies on screen. 

Four parallel, isolated reviewer subagents audited each lesson against four rigorous quality vectors:
1. **Analogy & Register:** Register check against the specified upper-middle-class family world (Ammu, Abbu, cars, dining out) and determination of genuine re-cast vs. 1:1 noun-swap.
2. **`morphReveals` Carrying Property:** Naming of a specific geometric property whose *meaning* changes between views, with quantified coordinate movement.
3. **Words vs. Mechanism:** Student-facing prose, scoreboard cards, captions, and step beats checked against pure algorithm outputs.
4. **Visual & Layout Audit:** Text box bounding, SVG clipping vulnerabilities, and canvas dimensions.

Unambiguous defects (factual errors, mathematical inversions, text box overflows, broken state synchronization) were fixed on the spot. Subjective judgment calls (metaphor register and physical plausibility) were preserved as instructed and documented below for senior review.

---

## 1. Quality Gate & Test Verification

### 1.1 `npm test`
```
Test Files  41 passed (41)
     Tests  505 passed (505)
  Start at  21:39:22
  Duration  3.21s (environment 42%, tests 35%, transform 15%, import 7%, worker 1%)
```
*All 41 test suites pass with zero failures.*

### 1.2 `npx tsc --noEmit`
```
Exit code: 0
Diagnostic output: (none — 100% type clean across all src/ and tests/)
```

### 1.3 `GATE_PORT=5301 npm run verify`
```
vite v8.2.2 building client environment for production...
✓ 51 modules transformed.
dist-verify-233009-1789054771281/index.html                            0.95 kB │ gzip:  0.55 kB
dist-verify-233009-1789054771281/assets/index-CWv2ZgKt.css             5.36 kB │ gzip:  1.82 kB
dist-verify-233009-1789054771281/assets/fcfs-CgKuNiR1.js               0.68 kB │ gzip:  0.43 kB
dist-verify-233009-1789054771281/assets/lesson-02-UaF3mrvs.js          1.79 kB │ gzip:  0.92 kB
dist-verify-233009-1789054771281/assets/lesson-01-CCEyjF4r.js          2.26 kB │ gzip:  1.11 kB
dist-verify-233009-1789054771281/assets/lesson-03-C1Rgrfr0.js          2.41 kB │ gzip:  1.24 kB
dist-verify-233009-1789054771281/assets/deadlock-SkvNAlcp.js           4.25 kB │ gzip:  1.89 kB
dist-verify-233009-1789054771281/assets/lesson-18-B6elQ-Ln.js          9.45 kB │ gzip:  3.49 kB
dist-verify-233009-1789054771281/assets/lesson-22-CeVSfeZw.js          9.70 kB │ gzip:  4.04 kB
dist-verify-233009-1789054771281/assets/lesson-13-Cd8s6oGt.js         10.95 kB │ gzip:  3.84 kB
dist-verify-233009-1789054771281/assets/lesson-11-BdGyuQii.js         11.19 kB │ gzip:  4.16 kB
dist-verify-233009-1789054771281/assets/lesson-20-Dwwxby5h.js         11.53 kB │ gzip:  4.26 kB
dist-verify-233009-1789054771281/assets/lesson-08-BrD3Ltbj.js         11.77 kB │ gzip:  3.55 kB
dist-verify-233009-1789054771281/assets/lesson-04-CpedDXkT.js         11.92 kB │ gzip:  3.83 kB
dist-verify-233009-1789054771281/assets/lesson-05-DqSeQacA.js         12.05 kB │ gzip:  3.70 kB
dist-verify-233009-1789054771281/assets/lesson-15-C3xSaIpY.js         12.39 kB │ gzip:  4.18 kB
dist-verify-233009-1789054771281/assets/lesson-21-DTmDv1Wh.js         12.52 kB │ gzip:  4.94 kB
dist-verify-233009-1789054771281/assets/lesson-17-DvpL13Lp.js         12.58 kB │ gzip:  3.81 kB
dist-verify-233009-1789054771281/assets/synchronization-DTBR4adN.js   12.66 kB │ gzip:  4.54 kB
dist-verify-233009-1789054771281/assets/lesson-12-DOd0KrOo.js         12.83 kB │ gzip:  4.41 kB
dist-verify-233009-1789054771281/assets/lesson-23-DKy2U233.js         13.37 kB │ gzip:  5.06 kB
dist-verify-233009-1789054771281/assets/lesson-24-DRInm7cK.js         13.57 kB │ gzip:  5.30 kB
dist-verify-233009-1789054771281/assets/lesson-07-QsQ6vZx2.js         13.68 kB │ gzip:  3.48 kB
dist-verify-233009-1789054771281/assets/lesson-14-Fx6VN6em.js         14.07 kB │ gzip:  4.14 kB
dist-verify-233009-1789054771281/assets/lesson-09-CyBLEg0s.js         14.15 kB │ gzip:  4.62 kB
dist-verify-233009-1789054771281/assets/lesson-19-BGwgcecX.js         14.23 kB │ gzip:  5.02 kB
dist-verify-233009-1789054771281/assets/lesson-16-CkUd5aLV.js         14.97 kB │ gzip:  4.45 kB
dist-verify-233009-1789054771281/assets/lesson-06-GegFK9uF.js         17.02 kB │ gzip:  4.84 kB
dist-verify-233009-1789054771281/assets/lesson-10-A_fd7jJz.js         18.24 kB │ gzip:  5.92 kB
dist-verify-233009-1789054771281/assets/lecture-06-Czy654Iz.js        33.07 kB │ gzip:  6.84 kB
dist-verify-233009-1789054771281/assets/lecture-07--OMAd5vi.js        59.05 kB │ gzip: 12.42 kB
dist-verify-233009-1789054771281/assets/index-fQGJJ7P6.js            198.94 kB │ gzip: 57.09 kB

✓ built in 126ms

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
── lesson-18 · Making it impossible
── lesson-19 · Safe, unsafe, and stuck
── lesson-20 · The banker's algorithm
── lesson-21 · Spotting a deadlock
── lesson-22 · Getting out
── lesson-23 · Guessing before you build
── lesson-24 · The barrier
── lecture-06/reference · Scheduling criteria & five metrics
── lecture-07/reference · Thread scheduling PCS/SCS & schedulers
────────────────────────────────────────────────────────────
GATE PASSED — 815 checks across 24 lesson(s) and 2 reference page(s).
```

---

## 2. Detailed File-by-File Changes

### 2.1 `src/lessons/lecture-10/lesson-21.ts` (Deadlock Detection · Slide 39)

1. **Defect Fixed — Multiple Reclaims in Sweep Algorithm:**
   - *Problem:* In `sweepEvents()`, the simulation iterates through passes until no further process can be satisfied. In the existing code, processes that finished in Pass 1 (e.g. Flat 2 and Flat 3) were evaluated again in Passes 2 and 3 and repeatedly marked as having their resources reclaimed. Step captions asserted: *"Flat 2... has finished and freed all its spots"* across multiple passes.
   - *Fix:* Added a persistent `completed` set and evaluated candidates per pass. The first time a candidate satisfies $Request \le Available$, `isWinner` is set and resources are reclaimed once. In later passes, already completed processes are skipped and deferred satisfiable candidates are reported clearly.
2. **Defect Fixed — ViewBox Coordinate Overflow:**
   - *Problem:* `analogyX` was calculated as `50 + i * 165`. For process index $i = 4$ ($P_4$), $x = 710\text{px}$. With width $88\text{px}$, the right edge extended to $798\text{px}$, breaching the $720\text{px}$ SVG canvas boundary by $78\text{px}$.
   - *Fix:* Tightened `stride` to `135px`. $P_4$ now renders at $x = 590\text{px}$, right edge $678\text{px} \le 720\text{px}$.
3. **Analogy Mode Declaration:** Added `// ANALOGY: mechanism-fixed`.

### 2.2 `src/lessons/lecture-10/lesson-22.ts` (Deadlock Recovery · Slide 40)

1. **Defect Fixed — Prose vs. Mechanism Contradiction in Rollback:**
   - *Problem:* `morphReveals` asserted:
     > *"the tow truck's bill grows with each car towed: the card gets visibly wider the longer the recovery takes (23, 52, 91, 143, 183)..."*
     However, the engine pre-baked all five rollbacks into the data structure at Step 0. At Step 0 and Step 1 (Night 1), the card already rendered at full width ($183\text{px}$) with cost 183, directly contradicting the step caption claiming a cost of 23.
   - *Fix:* Overrode `render()` in `Lesson22DiagramEngine` to compute running cumulative tows and cost up to the current step index $t$. The card width ($60 + \text{cost} \times 0.65\text{px}$) and displayed cost now dynamically update on each tow step, matching the exact prose claim.
2. **Defect Fixed — Scoreboard Inconsistency in `abort-all` Mode:**
   - *Problem:* In the `abort-all` playground mode, the scoreboard displayed a single victim name (`Flat 1`) and spots freed (`2`), contradicting the scenario where all deadlocked processes are aborted.
   - *Fix:* Added mode branching in `paintScoreboard()` for `abort-all` to show aggregate impact across all deadlocked entities: `"All 3 flats"`, `"abort cost 183"`, and `"6 spots freed"`.
3. **Analogy Mode Declaration:** Added `// ANALOGY: mechanism-fixed`.

### 2.3 `src/lessons/lecture-07/lesson-23.ts` (Predicting Burst Times & SJF · Slides 13–15)

1. **Defect Fixed — Arithmetic Error in `morphReveals`:**
   - *Problem:* The prose stated:
     > *"the engagement party alone is wider than the other four together (29 vs 32 minutes)"*
     Mathematically, $29 < 32$. The engagement party was 29 minutes, and the remaining four jobs totaled $6 + 8 + 7 + 11 = 32$ minutes.
   - *Fix:* Corrected to:
     > *"the engagement party alone is almost as wide as the other four together (29 vs 32 minutes)"*
2. **Defect Fixed — Timeline Hopping in SJF Execution Sequence:**
   - *Problem:* The step generator iterated over the input process array order $[P_1, P_2, P_3, P_4, P_5]$ rather than the scheduled execution order $[P_3, P_1, P_4, P_5, P_2]$. Consequently, the visual highlights jumped erratically back and forth across the Gantt chart rather than advancing left-to-right along the timeline.
   - *Fix:* Ordered tally steps according to the computed schedule order (`result.bars`).
3. **Defect Fixed — UI Active Button Styling & Zero Protection:**
   - *Problem:* Playground scenario and solve-target buttons lacked active highlight styles upon user interaction. In `setSolveFor`, division by zero could occur if average wait was 0.
   - *Fix:* Injected dynamic border and text color updates for `.l23-scenario` and `.l23-solve` buttons, and added numerical guards.
4. **Analogy Mode Declaration:** Added `// ANALOGY: mechanism-fixed`.

### 2.4 `src/lessons/lecture-09/lesson-24.ts` (Memory Barriers · Slides 3–5)

1. **Defects Fixed — SVG Text Box Overflows:**
   - *Problem 1:* In `T2_ANALOGY`, line text strings `"put the biryani in the dish"` (27 chars $\approx 173\text{px}$) and `"wait till it is really out there"` (31 chars $\approx 197\text{px}$) overflowed the $144\text{px}$ line background rect.
   - *Fix 1:* Shortened to `"dish the biryani"` (16 chars) and `"wait for the room"` (17 chars).
   - *Problem 2:* In `TOKEN_ANALOGY`, `"the dish, still coming"` (22 chars) and `"the call, still carrying"` (24 chars) overflowed the in-flight token bounding rect as it interpolated toward $92\text{px}$ in the mid-morph ($0.2 < v < 0.5$).
   - *Fix 2:* Shortened to `"dish on its way"` (15 chars) and `"call on its way"` (15 chars), ensuring $\le 99.5\text{px}$ budget across all morph states.
2. **Defects Fixed — Analogy Leaking into Mechanism View ($v=1$):**
   - *Problem 1:* Thread column titles displayed `ACTOR_NAMES.T1` ("At the table") and `ACTOR_NAMES.T2` ("In the kitchen") even at $v=1$.
   - *Fix 1:* Updated `ACTOR_NAMES` to `"Thread 1"` and `"Thread 2"`, keeping `"At the table"` and `"In the kitchen"` strictly in `ACTOR_ANALOGY` ($v < 0.5$).
   - *Problem 2:* In-flight lane header at $v \ge 0.5$ displayed `"THE KITCHEN'S STORE BUFFER"`.
   - *Fix 2:* Changed mechanism title to `"T2 STORE BUFFER"`.
   - *Problem 3:* Scoreboard output metric was labeled `"She serves"`.
   - *Fix 3:* Changed label to `"Output (T1)"`.
3. **Dead Code Removed:** Removed duplicate stale JSDoc block referring to the deprecated 4px column gap morph.
4. **Analogy Mode Declaration:** Added `// ANALOGY: re-cast`.

---

## 3. Findings NOT Fixed (Subjective Judgment Calls)

In strict accordance with the brief instructions (*"Do NOT rewrite someone's analogy on your own judgment; report it and stop"*), the following pedagogical and thematic observations are submitted for editorial review:

| Lesson | Category | Observation & Evidence | Rationale for Not Modifying |
|---|---|---|---|
| **L21** | Analogy Register / Noun-Swap | Entities are called "Flat 1" through "Flat 5" using "parking spots" and "driveways" alongside warehouse nouns ("crates", "trolleys"). No named family members appear. The lesson functions as a 1:1 noun-swap over Slide 39 matrices rather than an organic family re-cast. | The algorithm and matrix math are completely accurate. Rewriting the entire domain would discard functional code without staff consensus. |
| **L22** | Metaphor Coherence | The narrative conflates an apartment building parking garage deadlock with highway road trips ("out 40 minutes", "towed back to junction"). In mechanism view, entities remain labeled "Flat 1 / Flat 2 / Flat 3". | The cost-proportional morph and victim selection algorithms operate correctly. Metaphor reconciliation is an authorial decision. |
| **L23** | Narrative Register & Units | The analogy casts the family running a restaurant kitchen fulfilling tickets, inverting the established motif of the family dining out together. Additionally, narrative prose refers to "minutes" while Gantt bars display "ms". | The Little's Law computation ($N = \lambda \cdot W$) and SJF calculations are verified. Converting units or rewriting the narrative role requires course lead approval. |
| **L24** | Physical Intuition | The analogy models sound ("call") and physical food ("dish") travelling down a hallway, where food overtakes sound on "lucky" nights. While mathematically isomorphic to out-of-order store draining, sound overtaking physical food violates real-world physics. | The weak memory ordering trace and barrier mechanisms are rigorously tested. Altering the core conceit would invalidate established lesson assets. |

---

## 4. Contradictions & Discrepancies Found in Project Docs

1. **Arithmetic Inversion in L23 `morphReveals`:**
   - *Deck Data:* Slide 14 presents job durations $P_1=6, P_2=29, P_3=8, P_4=7, P_5=11$.
   - *Doc Claim:* Project notes asserted that the long burst (29) was larger than the sum of all other jobs ($6 + 8 + 7 + 11 = 32$). This was mathematically false ($29 < 32$). The copy was corrected to *"almost as wide as the other four together"*.
2. **Automated Gate Blind Spot on SVG Text Overflow:**
   - *Previous Gate Implementation:* `scripts/gate.mjs:203` evaluated text overflow via `el.closest('g')`. In SVG, a `<g>` container derives its bounding box from the union of its children, meaning child elements never cause `scrollWidth > clientWidth` on the group.
   - *Impact:* Severe visual overflows in L21 and L24 passed the gate with a 29/29 score. This proves the brief's premise for Task B: the gate check must compare text against enclosing `<rect>` boundaries or SVG viewport dimensions.

---

## 5. Next Steps

- **Task A Complete:** Branch `phase5/task-A-review-l21-l24` merged to `main` and pushed.
- **Ready for Task B:** Checkout branch `phase5/task-B-gate-defects` to:
  1. Widen the geometry read in `scripts/gate.mjs` and `src/engines/gantt.ts` to `{x, y, width, height, transform}`.
  2. Implement negative detection test (temporary reskin failure -> revert).
  3. Fix SVG text overflow check in `scripts/gate.mjs:203` to catch enclosing `<rect>` bounds.
