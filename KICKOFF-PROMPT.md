# Kickoff prompt — paste into Antigravity

> Copy everything below the line into Antigravity as your first message.
> Put `SPEC.md` and `ATLAS.md` in the workspace root before you start.

---

You are the lead implementing engineer on a build that is already fully specified. Read
`SPEC.md` in the workspace root before doing anything else. It is authoritative — the
architecture decisions in it are settled, and your job is to execute them precisely, not to
redesign them. `ATLAS.md` is the 89-unit backlog.

**Project:** a deployable static site that teaches 89 Operating Systems concepts through
interactive 2D animations. Vite + TypeScript + GSAP + inline SVG. No audio, no narration —
explanation is on-screen text. Deploys to Netlify.

## The three rules that matter most

1. **Compute every number; never type one.** Gantt charts, waiting times, safe sequences, and
   detection results are produced by pure functions in `src/algorithms/`, tested against the
   lecture slides. A hardcoded Gantt bar is a defect even when the number happens to be right.
   This is §2.1 of the spec and it is the whole point of the project.
2. **Captions are fields on timeline steps**, never a separate script. Same array drives motion
   and text, so they cannot drift apart.
3. **All colour and spacing lives in `tokens.css`.** 89 units must feel like one product.

## Verify, do not recall

**Assume your training data is stale about tooling.** Your knowledge cutoff predates current
releases of most of this stack. Before writing code against GSAP, Vite, Vitest, TypeScript,
Netlify, or Antigravity's own subagent API, fetch the current documentation — delegate it to
the `research` subagent so it does not eat your context. Pin the exact versions you verified in
`package.json` and record them in `DECISIONS.md`.

Check what the harness already gives you — skills, plugins, built-in subagents, MCP servers, CLI
tools — before hand-rolling infrastructure. Antigravity ships `research` and `browser` subagents;
use them.

When documentation and memory disagree, documentation wins, without exception. See SPEC.md §0A.

And verify visually: use the `browser` subagent to actually load pages and confirm animations run
and layouts hold at 360 px and 1440 px. "It should render correctly" is not evidence.

## Three requirements that are easy to under-deliver on

1. **Chapter navigation.** The site is a five-chapter book, one per lecture. A persistent top nav
   with all five chapters, the active one marked `aria-current`, a unit list for the active
   chapter, and prev/next that stops at chapter boundaries. SPEC.md §4B.
2. **Responsive is not optional.** Mobile is the primary revision context. Three columns at
   ≥1100 px, two at 760–1099, single column with a sticky transport bar below 760. Hard floor
   360 px. All SVG uses `viewBox`, never fixed pixels. Verify every unit at 360 / 800 / 1440.
   SPEC.md §4C.
3. **Animation must demonstrate, and must not break.** Every step carries a complete state
   snapshot, never a delta; `render(state)` is pure and idempotent; GSAP only tweens between
   snapshots and is never the source of truth. That is what makes scrubbing backwards safe and
   teardown clean. Every moving element must mean something — pause anywhere and each thing on
   screen must be explainable. SPEC.md §4A.

## Object model and fault isolation

Use classes where there is a lifecycle, functions where there is not.

- `src/algorithms/` stays **pure functions** — `fcfs()`, `safeSequence()`, `detect()`. No classes.
  They map input to output and must stay trivially testable.
- `src/engines/` are **classes extending `AnimationEngine<I, S>`** (SPEC.md §3A.2), a
  template-method base that owns the timeline lifecycle. Subclasses implement exactly three
  methods — `buildSteps`, `mount`, `render` — and never override `seek`, `init`, or `destroy`.
- An engine touches **only its own container**. No `querySelector` reaching outside it. This is
  what stops one engine corrupting another's DOM.

Encapsulation alone does not stop a thrown exception blanking the page, so add an explicit
**error boundary** at the mount site: a failing unit renders a fallback card naming the unit and
the error, chapter navigation keeps working, and unit modules load dynamically so one bad data
file cannot break the index. A student hitting a bug on unit 63 must still be able to use the
other 88. SPEC.md §3A.3.

## How to use subagents

Parallelise aggressively, but **only inside a phase**. The phase boundaries are hard gates.

Phase 0 defines the interfaces every other file is written against. If you fan out before it is
done, you get seven incompatible engines and a rewrite. Do Phase 0 yourself, serially.

| Phase | Work | Agents |
|---|---|---|
| 0 | Scaffold, `core/types.ts`, `tokens.css`, `UnitPlayer`, deploy empty site to Netlify | **you, alone** |
| 1 | 7 engines + their algorithms + Vitest suites | **7 in parallel** |
| 2 | 89 unit data files | **5 in parallel**, one per lecture |
| 3 | Index page + routing; analogy scene layer | 2 in parallel |
| 4 | Integration, a11y audit, responsive pass, deploy | you, alone |

Define subagents as `.agents/agents/<name>.md` with YAML frontmatter, and spawn them with
`invoke_subagent`. Use `branch` isolation for Phase 1 so the seven engines cannot collide in the
working tree; `inherit` is fine for Phase 2, since each agent writes to its own lecture folder.

**Critical: a subagent does not inherit your conversation history.** Every brief you write must
stand completely on its own. A brief that says "build the engine we discussed" produces garbage.
Each one must contain:

- the exact file paths it owns, and a statement that it must touch nothing else
- the `Engine<I, S>` signature it implements, copied literally from `core/types.ts`
- the spec sections that apply (quote them — do not assume it will read the file)
- the exact test assertions it must satisfy, with the slide-derived numbers
- the §8 definition-of-done checklist
- "if the spec is ambiguous, stop and report — do not invent"

Between phases, verify before proceeding: `npm run build` clean, `npm test` green, and spot-check
two units in the browser in both light and dark theme. A phase gate that passes on assertion
rather than inspection is not a gate.

## Order within Phase 1

Build `gantt` first and review it yourself before the other six start, even though they could all
run at once. It is the most complex renderer, and the patterns you settle there — how a step
advances, how the caption rail binds, how the playhead scrubs — are the patterns the other six
copy. Getting that wrong six times in parallel is the main way this project fails.

Then fan out the remaining six.

## Order within Phase 2

One agent per lecture. Each writes only `src/units/lecture-NN/`. Give each the relevant Atlas
rows verbatim in its brief — id, title, slide reference, engine, and analogy — so it never has
to guess at content that is already decided.

## When you are uncertain

The answer is almost always in `SPEC.md`. If it genuinely is not — stop and ask. Do not invent an
approach that conflicts with the spec; unwinding that costs far more than asking.

Report honestly. If a test fails, say so and show the output. If you skipped something, say
which and why. Do not report a phase complete until it actually is.

## Start now

Begin Phase 0. Before writing code, restate in three or four sentences: what you are building,
what `core/types.ts` will contain, and what your Phase 1 subagent split will be. Then build it,
deploy the empty site, and report back before starting Phase 1.
