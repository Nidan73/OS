# LESSONS.md — the 22-lesson structure

Replaces the 89-unit model. 22 lessons + a reference layer; all 89 Atlas units accounted for. `ATLAS.md` remains the source inventory; the `units` column below
maps each lesson to the Atlas ids it absorbs.

**Shape of a lesson:** open in the analogy → morph into the mechanism → hand the learner the
controls. No prediction prompt. The morph is the reveal.

---

## Lecture 6 — CPU Scheduling (5 lessons)

**L1 · Why a scheduler exists at all** — units 1–5
Analogy: a café where you eat, then wait for the next course. Morphs into the CPU–I/O burst
cycle, the ready queue, and the moment the dispatcher hands over. Playground: add diners with
different eating/waiting patterns, watch the counter go idle.

**L2 · First-come, first-served — and the convoy** — units 7, 8
Analogy: single-file food truck queue, one person ordering for a party of forty.
Playground: drag to reorder the queue and watch average wait collapse from 17 to 3.

**L3 · Shortest job first, and why you can't have it** — units 9, 10, 11
Analogy: the express lane. Morphs into SJF, then SRTF when a smaller order walks up mid-service.
Playground: set burst times, toggle preemption, see optimality — then try to predict a burst.

**L4 · Round robin and the cost of fairness** — units 12, 13
Analogy: karaoke night with a timer. Playground: drag the quantum from 1 to 30 and watch
turnaround time bottom out, then climb as switching eats the night.

**L5 · Priority, starvation, and aging** — unit 14
Analogy: airport boarding groups. Playground: watch a Group 9 passenger never board, then switch
aging on and watch them rise.

## Lecture 7 — Multiprocessor & Real-Time (4 lessons)

**L6 · Queues within queues** — units 15, 16
Analogy: airport lanes by class, then a restaurant that demotes you for dithering.
Playground: move a process between queues, tune feedback thresholds.

**L7 · More cores, more problems** — units 19–23
Analogy: one kitchen versus several; a chef idle at the pass waiting on the storeroom.
Playground: add cores and hardware threads, watch stall time get absorbed.

**L8 · Keeping every core busy** — units 24, 25, 26
Analogy: the staffer waving people to an empty desk; your regular waiter who knows your order.
Playground: toggle push/pull migration and affinity, watch cache warmth trade against balance.

**L9 · When late means failed** — units 27–30
Analogy: a delivery ETA versus a closing gate. Playground: inject an interrupt and drag the
latency budget until the deadline misses.

## Lecture 8 — The Critical-Section Problem (3 lessons)

**L10 · The last slice** — units 34–37
Analogy: one friend puts a slice back while the other takes one off — both read "3 slices left,"
one writes "4," the other writes "2," and the second write wins.
Morphs into register-level interleaving. Playground: drag the interleaving and find the orders
that corrupt the count.

**L11 · What a correct solution must promise** — units 38–43
Analogy: the single toilet on a long-haul coach. Morphs into entry/critical/exit/remainder.
Playground: break one of mutual exclusion, progress, or bounded waiting and watch the failure.

**L12 · Peterson's solution, and why hardware breaks it** — units 44–46
Analogy: two friends at a door, each waving the other through.
Playground: enable instruction reordering and watch the output flip from 100 to 0.

## Lecture 9 — Synchronization Tools (3 lessons)

**L13 · One indivisible motion** — units 50–55
Analogy: the restroom key on a hook — looking and grabbing as one act.
Morphs into test_and_set, then compare_and_swap. Playground: run two threads against a
non-atomic version, then an atomic one.

**L14 · Locks, and the cost of waiting at the door** — units 56, 57
Analogy: one hotel key; jiggling the handle versus sitting down.
Playground: drag the critical-section length and watch spinning flip from optimal to wasteful.

**L15 · Semaphores** — units 58–62
Analogy: five airport charging ports and a live count. Playground: set the count, add contenders,
switch between spin and block/wakeup — then forget a signal and deadlock the room.

## Lecture 10 — Deadlocks (7 lessons)

**L16 · Two friends, two chopsticks** — units 63–68
The founding scene. Morphs from the dinner table into the four necessary conditions, each
highlighted on the same picture. Playground: remove any one condition and watch deadlock become
impossible.

**L17 · Seeing it as a graph** — units 69–71
Analogy: a map of who holds which car key. Playground: draw edges and watch cycle detection fire —
including the cycle that is *not* a deadlock because spare instances exist.

**L18 · Making it impossible** — units 72–75
Analogy: numbering the chopsticks so one person reaches right instead of left.
Playground: apply each prevention strategy and watch the ring fail to close.

**L19 · Safe, unsafe, and stuck** — units 76–79
Analogy: a group treasurer checking whether there is still *some* order in which everyone can
finish the trip and pay back. Morphs into the safe/unsafe/deadlock regions and the claim-edge
graph. Playground: grant a request and watch the safe region shrink — unsafe is not stuck yet,
but the guarantee is gone.

**L20 · The banker's algorithm** — units 80–83
Analogy: the treasurer's actual ledger — cash on hand, each person's declared ceiling, what they
have drawn, what they could still ask for. Morphs into Available / Max / Allocation / Need.
Playground: make P1's request (1,0,2), watch the safety sweep run cell by cell, then push it
until it is refused.

**L21 · Spotting a deadlock** — units 84–87
Analogy: a traffic officer collapsing the map down to "who is blocking whom" and looking for a
closed loop. Playground: run the detection sweep on the slide-39 snapshot, then add P2's request
for one more C and watch the same system tip into deadlock.

**L22 · Getting out** — units 88, 89
Analogy: choosing whose trip to cancel, or towing one car back to the last junction it was safe
at. Playground: pick a victim by different criteria and watch the cost — then pick the same one
repeatedly and watch it starve.

---

## Reference layer

Not lessons. One scrollable reference page per chapter, holding the slide-level facts that are
definitions rather than mechanisms. Rendered as clean typographic content with small static
diagrams — **not** forced into animations.

- **Ch 6:** scheduling criteria (unit 6) — also rendered as the persistent scoreboard beside every
  scheduling playground.
- **Ch 7:** thread scheduling PCS/SCS (17, 18); algorithm evaluation — deterministic modelling,
  queueing models and Little's formula, simulation (31, 32, 33).
- **Ch 9:** disabling interrupts (47); memory models and barriers (48, 49).

Anything else that resists a playground goes here rather than becoming a weak animation.
