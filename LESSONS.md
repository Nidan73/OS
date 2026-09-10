# LESSONS.md — the 24-lesson structure

Replaces the 89-unit model. 24 lessons + a reference layer; all 89 Atlas units accounted for. `ATLAS.md` remains the source inventory; the `units` column below
maps each lesson to the Atlas ids it absorbs.

**Shape of a lesson:** open in the analogy → morph into the mechanism → hand the learner the
controls. No prediction prompt. The morph is the reveal.

---

## Lecture 6 — CPU Scheduling (5 lessons)

**L1 · Why a scheduler exists at all** — units 1–5
Analogy: dinner at home, dish by dish — eat, then wait while mother brings the next.
Morphs into the CPU–I/O burst cycle, the ready queue, and the moment the
dispatcher hands over. Playground: add family members with different
eating/waiting patterns, watch the CPU go idle.

**L2 · First-come, first-served — and the convoy** — units 7, 8
Analogy: a restaurant with one kitchen — a party of forty orders ahead of a couple
who wanted two coffees. Playground: drag to reorder the queue and watch average
wait collapse from 17 to 3.

**L3 · Shortest job first, and why you can't have it** — units 9, 10, 11
Analogy: the kitchen sends quick plates before the big order. Morphs into SJF,
then SRTF when a quick plate arrives mid-cook. Playground: set burst times,
toggle preemption, see optimality — then try to predict a burst.

**L4 · Round robin and the cost of fairness** — units 12, 13
Analogy: turns with the family car, each person a fixed slot. Playground: drag the
quantum from 1 to 30 and watch turnaround time bottom out, then climb as handover
eats the drive.

**L5 · Priority, starvation, and aging** — unit 14
Analogy: who gets served first at dinner — the little cousin keeps getting skipped
until mother steps in. Playground: watch the skipped cousin never get served, then
switch aging on and watch them rise.

## Lecture 7 — Multiprocessor & Real-Time (4 lessons)

**L6 · Queues within queues** — units 15, 16
Analogy: restaurant seating tiers — linger and the host moves you down a tier.
Playground: move a process between queues, tune feedback thresholds.

**L7 · More cores, more problems** — units 19–23
Analogy: one cook versus several, and one cook working several pans. Playground:
add cores and hardware threads, watch stall time get absorbed.

**L8 · Keeping every core busy** — units 24, 25, 26
Analogy: waiters and sections — move a waiter to the busy side, or keep the waiter
who already knows your order. Playground: toggle push/pull migration and affinity,
watch cache warmth trade against balance.

**L9 · When late means failed** — units 27–30
Analogy: the car leaving for school on time, whatever else happens. Playground:
inject an interrupt and drag the latency budget until the deadline misses.

## Lecture 8 — The Critical-Section Problem (3 lessons)

**L10 · The last slice** — units 34–37
Analogy: the last piece of cake in the fridge — mother puts a plate in while father
takes one out; both read the same count, the second write wins. Morphs into
register-level interleaving. Playground: drag the interleaving and find the orders
that corrupt the count.

**L11 · What a correct solution must promise** — units 38–43
Analogy: the one bathroom in the house. Morphs into entry/critical/exit/remainder.
Playground: break one of mutual exclusion, progress, or bounded waiting and watch the failure.

**L12 · Peterson's solution, and why hardware breaks it** — units 44–46
Analogy: mother and father at the narrow kitchen doorway, each waving the other
through. Playground: enable instruction reordering and watch the output flip from
100 to 0.

## Lecture 9 — Synchronization Tools (3 lessons)

**L13 · One indivisible motion** — units 50–55
Analogy: the car key on the hook by the door — looking and grabbing as one motion.
Morphs into test_and_set, then compare_and_swap. Playground: run two threads against a
non-atomic version, then an atomic one.

**L14 · Locks, and the cost of waiting at the door** — units 56, 57
Analogy: waiting outside the bathroom — jiggling the handle versus sitting down.
Playground: drag the critical-section length and watch spinning flip from optimal to wasteful.

**L15 · Semaphores** — units 58–62
Analogy: the building's parking spots, with a live count of what is free.
Playground: set the count, add contenders, switch between spin and block/wakeup —
then forget a signal and deadlock the lot.

## Lecture 10 — Deadlocks (7 lessons)

**L16 · Family dinner, two spoons short** — units 63–68
The founding scene. Morphs from the dinner table into the four necessary conditions, each
highlighted on the same picture. Playground: remove any one condition and watch deadlock become
impossible.

**L17 · Seeing it as a graph** — units 69–71
Analogy: cars blocking each other in the building driveway — who blocks whom, the closed
ring, and which car moves out. Playground: draw edges and watch cycle detection fire —
including the cycle that is *not* a deadlock because a spare slot exists.

**L18 · Making it impossible** — units 72–75
Analogy: four rules at family dinner — share the dish, take all utensils together, put one
down when the next is busy, or always take the lower-numbered utensil first. Playground:
apply each prevention strategy and watch the ring fail to close.

**L19 · Safe, unsafe, and stuck** — units 76–79
Analogy: a group treasurer checking whether there is still *some* order in which everyone can
finish the trip and pay back. Morphs into the safe/unsafe/deadlock regions and the claim-edge
graph. Playground: grant a request and watch the safe region shrink — unsafe is not stuck yet,
but the guarantee is gone.

**L20 · The banker's algorithm** — units 80–83
Analogy: mother's monthly household ledger — cash on hand, each person's declared
ceiling, what they have drawn, what they could still ask for. Morphs into
Available / Max / Allocation / Need. Playground: make P1's request (1,0,2), watch
the safety sweep run cell by cell, then push it until it is refused.

**L21 · Spotting a deadlock** — units 84–87
Analogy: a traffic officer collapsing the map down to "who is blocking whom" and looking for a
closed loop. Playground: run the detection sweep on the slide-39 snapshot, then add P2's request
for one more C and watch the same system tip into deadlock.

**L22 · Getting out** — units 88, 89
Analogy: choosing whose trip to cancel, or moving one car out to the last gap it was safe
at. Playground: pick a victim by different criteria and watch the cost — then pick the same one
repeatedly and watch it starve.

---

## New lessons (promoted from the reference layer)

Both are built. What shipped differs from the sketch below in one place, noted inline.

**L23 · Guessing before you build** — units 31–33 (Lecture 7 slides 24–30)
Deterministic modelling → queueing models → simulation. Playground: n = lambda x W
computed in all three directions, drag any two and the third settles; then change
the snapshot and watch the deterministic winner change with it. The point is that a
fast exact answer only holds for one snapshot.

**L24 · The barrier** — units 47–49 (Lecture 9 slides 3–5) — engine is `trace`, not `diagram`:
the whole lesson is slide 5's two-thread program, and units 47/48 are carried by the playground
and the concept rather than forced into the timeline.
Strongly vs weakly ordered memory, then the barrier. Playground: toggle ordering,
watch two stores land shuffled, insert a barrier, watch it stop. PAIRS WITH L12 —
L12 already owns the broken case, reference it, do not duplicate its trace. Unit 49
is already mapped to the trace engine.

---

## Reference layer

Not lessons. One scrollable reference page per chapter, holding the slide-level facts that are
definitions rather than mechanisms. Rendered as clean typographic content with small static
diagrams — **not** forced into animations.

- **Ch 6:** scheduling criteria (unit 6) — also rendered as the persistent scoreboard beside every
  scheduling playground.
- **Ch 7:** thread scheduling PCS/SCS (17, 18).
- **Ch 9:** nothing retained — units 47, 48, 49 are now L24.
- **Unmapped slides (no Atlas unit):** Lecture 7 slide 23, "Operating System Examples:
  Linux / Windows / Solaris scheduling" — a survey slide, not a mechanism; Lecture 10
  slide 33, "Deadlock Detection: allow system to enter deadlock state / detection
  algorithm / recovery scheme" — a section header whose content L21 and L22 already
  teach. Everything else uncovered is boilerplate: slide 1 title, slide 2 Lecture
  Outline, last two of every deck Books and References.

Anything else that resists a playground goes here rather than becoming a weak animation.
