# ATLAS — 89 animation units

Backlog for CSC 2209 Operating Systems, Lectures 6-10. Ids are stable; do not renumber.
`engine` values map to `src/engines/`. See SPEC.md §4.


## Lecture 06 — CPU Scheduling — Foundations

| id | engine | topic | slides | domain | analogy |
|---|---|---|---|---|---|
| 1 | `gantt` | CPU–I/O Burst Cycle | slide 3 | food | You eat a course, then sit waiting while the kitchen prepares the next. Eating is the CPU burst; waiting is the I/O burst. Nobody eats continuously for two hours. |
| 2 | `diagram` | Histogram of CPU-Burst Times | slide 4 | food | Count everyone's orders at a café: hundreds of quick espressos, a handful of full tasting menus. Short bursts dominate — which is exactly why short-job-first works. |
| 3 | `queue` | The CPU Scheduler & Ready Queue | slide 5 | food | The cashier choosing who to serve next from the crowd at the counter. The crowd is the ready queue; how it's ordered is the whole subject. |
| 4 | `queue` | Preemptive vs Non-preemptive — the four decision points | slide 5 | friends | Passing the aux cable on a road trip. Non-preemptive: you keep it until your song ends or you hand it over. Preemptive: anyone can grab it mid-chorus. |
| 5 | `queue` | The Dispatcher & Dispatch Latency | slide 5 | friends | The dead air while the cable is physically unplugged, handed over, and the next song loads. Pure overhead — nobody is listening to music during it. |
| 6 | `diagram` | Scheduling Criteria — the five metrics | slides 6–7 | travel | How you'd rate an airport: how busy the gates stay, flights cleared per hour, your total door-to-gate time, minutes stuck in line, and how fast someone first acknowledges you. |
| 7 | `gantt` | First-Come, First-Served (FCFS) | slide 8 | food | A single-file food truck queue. Fair, simple, and occasionally terrible — the animation runs the P1/P2/P3 Gantt chart and computes the 17 ms average wait live. |
| 8 | `gantt` | The Convoy Effect | slide 9 | travel | One overloaded truck on a single-lane mountain road with forty cars behind it. Reorder the same three processes and the average wait drops from 17 ms to 3 ms. |
| 9 | `gantt` | Shortest-Job-First (SJF) | slides 10–11 | food | The supermarket express lane — "10 items or fewer." Provably optimal for average waiting time, and provably impossible, because nobody knows their basket size in advance. |
| 10 | `diagram` | Predicting the Next Burst — exponential averaging | slides 12–14 | food | The barista who guesses your order from your last few visits, weighting yesterday more than last month. Slide α from 0 to 1 and watch the prediction curve stiffen or twitch. |
| 11 | `gantt` | Shortest-Remaining-Time-First (preemptive SJF) | slide 15 | food | The cashier stops mid-order because a friend walks up wanting only a coffee. Arrival times now matter — the four-process worked example runs step by step. |
| 12 | `gantt` | Round Robin & the Time Quantum | slides 16–17 | friends | Karaoke night with a hard four-minute limit. Everyone sings, nobody hogs the mic, and everyone gets their turn within (n−1)q. |
| 13 | `gantt` | Quantum vs Context-Switch Cost | slides 18–19 | friends | Drop the karaoke limit to ten seconds and the whole night becomes mic-swapping. A drag-the-quantum slider shows turnaround time bottoming out and then climbing. |
| 14 | `gantt` | Priority Scheduling, Starvation & Aging | slides 20–22 | travel | Airport boarding groups. The Group 9 passenger who watches four flights board ahead of them is starving — aging is the gate agent quietly bumping them up per hour waited. |

## Lecture 07 — CPU Scheduling — Multiprocessor & Real-Time

| id | engine | topic | slides | domain | analogy |
|---|---|---|---|---|---|
| 15 | `queue` | Multilevel Queue | slides 3–4 | travel | Airport check-in with permanently separate lines for first, business, and economy — and economy simply doesn't move while anyone stands in first. |
| 16 | `queue` | Multilevel Feedback Queue | slides 5–6 | food | Order fast and you keep the express counter. Dither and you're moved to the slow counter with a longer slot. Wait too long down there and aging promotes you back up. |
| 17 | `queue` | Thread Scheduling — PCS vs SCS | slide 7 | friends | Your table decides who speaks within your group; the venue decides which table gets the microphone. Two competitions, two different scopes. |
| 18 | `queue` | Pthread Scheduling API — SCOPE_PROCESS vs SCOPE_SYSTEM | slide 8 | friends | Declaring the rule up front when you book: "we compete within our table" or "we compete against the whole restaurant." |
| 19 | `diagram` | Multiprocessor Architectures — multicore, NUMA, heterogeneous | slide 9 | food | One kitchen versus several kitchens in one building versus kitchens in different buildings. Same restaurant, very different routing problems. |
| 20 | `queue` | Common Ready Queue vs Per-Processor Queues | slide 10 | food | One shared order rail every chef pulls from — with contention at the rail — versus each chef having their own ticket spike, and some going idle. |
| 21 | `diagram` | Multicore Processors & the Memory Stall | slide 11 | food | The chef sends for an ingredient from the storeroom and stands there doing nothing. That dead time at the station is the memory stall. |
| 22 | `diagram` | Chip Multithreading / Hyperthreading | slides 12–13 | food | One chef working two pans. When one needs to simmer, they turn to the other. Four cores × two hardware threads = eight logical stations the OS can see. |
| 23 | `diagram` | Two Levels of Scheduling | slide 14 | food | The head chef assigns dishes to stations; each station independently decides which pan to touch next. The OS controls one level, the hardware the other. |
| 24 | `queue` | Load Balancing — Push vs Pull Migration | slide 15 | travel | A staffer waving people from the long line over to an empty desk (push), versus the bored agent leaning out and calling people over themselves (pull). |
| 25 | `queue` | Processor Affinity — soft and hard | slide 16 | food | Your regular waiter already knows your table and your usual order. Move to another section and all of that warm context is thrown away — that's the cold cache. |
| 26 | `diagram` | NUMA-Aware Scheduling | slide 17 | food | Seat the diner at the table nearest the kitchen that actually cooks their dish. Same building, but the walk still costs you. |
| 27 | `diagram` | Real-Time Scheduling — Soft vs Hard | slide 18 | travel | A delivery ETA slipping by ten minutes is annoying. A flight's door closing ten seconds early means you do not fly. Soft misses degrade; hard misses fail. |
| 28 | `diagram` | Interrupt Latency | slides 19–20 | travel | The fire alarm sounds. How long before anyone actually moves? That gap — recognise, save state, start handling — is interrupt latency. |
| 29 | `diagram` | Dispatch Latency & the Conflict Phase | slide 21 | travel | The crew can't reach the exit until the passengers blocking the aisle clear it. Preemption and resource release are that aisle-clearing phase. |
| 30 | `diagram` | Priority-Based Real-Time Scheduling | slide 22 | travel | The ambulance gets a green wave and everything else yields. Preemptive priority alone buys you soft real-time; hard real-time needs deadline guarantees on top. |
| 31 | `gantt` | Algorithm Evaluation — Deterministic Modelling | slides 24–25 | travel | Compare three routes against one fixed traffic snapshot. Fast and exact, but the answer only holds for that snapshot — the FCFS 28 ms comparison runs here. |
| 32 | `diagram` | Queueing Models & Little's Formula | slides 26–27 | food | n = λ × W. The ramen queue is fourteen people long because seven arrive per minute and each waits two. Change one term, watch the other two settle. |
| 33 | `diagram` | Simulation vs Real Implementation | slides 28–30 | travel | A traffic simulator versus actually driving the route at rush hour. More accurate, far more expensive, and the environment changes under you. |

## Lecture 08 — Synchronization — The Critical-Section Problem

| id | engine | topic | slides | domain | analogy |
|---|---|---|---|---|---|
| 34 | `trace` | Concurrency & Data Inconsistency | slide 3 | friends | Three friends editing the same shared trip budget at the same time. Everyone's edit is reasonable; the final total is wrong. |
| 35 | `trace` | Producer–Consumer & the Bounded Buffer | slides 4–5 | food | The chef puts plates on the pass; waiters take them away. The pass holds only so many, so the chef blocks when it's full and waiters block when it's empty. |
| 36 | `trace` | Race Condition — counter++ / counter-- | slides 6–7 | friends | Two friends both read "3 slices left," both take one, both write back "2." One slice vanishes from the ledger. The animation interleaves the register-level steps. |
| 37 | `trace` | Race Condition on fork() — next_available_pid | slide 8 | travel | Two check-in desks read the same "next free seat" and issue 14A to two different passengers. Both boarding passes look perfectly valid. |
| 38 | `diagram` | The Critical-Section Problem | slide 9 | travel | The single toilet on a twelve-hour coach. One occupant at a time, and everything about the problem follows from that. |
| 39 | `diagram` | Entry, Critical, Exit & Remainder Sections | slide 10 | travel | Queue at the door, go in, slide the lock back on the way out, return to your seat. Four named phases every process moves through. |
| 40 | `diagram` | Requirement 1 — Mutual Exclusion | slide 11 | travel | Never two people inside at once. The animation shows the violation first, then the fix. |
| 41 | `diagram` | Requirement 2 — Progress | slide 11 | travel | If the toilet is empty and people are waiting, somebody must get in. A lock left engaged over an empty room fails progress. |
| 42 | `diagram` | Requirement 3 — Bounded Waiting | slide 11 | travel | There's a limit to how many people can cut in front of you. Without it you're technically making progress and still never getting in. |
| 43 | `diagram` | Preemptive vs Non-preemptive Kernels | slide 12 | travel | Can the driver stop you mid-aisle, or do you always get to finish what you started? Non-preemptive kernels are race-free by construction — and less responsive. |
| 44 | `trace` | Peterson's Solution | slides 13–14 | friends | Two friends at one doorway. Each raises a flag meaning "I want in," then says "you first." Politeness, encoded — flag[i] and turn, animated together. |
| 45 | `trace` | Proving the Three Requirements Hold | slide 15 | friends | Walk every interleaving and show nobody collides, nobody stalls in an empty doorway, and nobody is skipped twice. |
| 46 | `trace` | Why Instruction Reordering Breaks It | slides 16–18 | friends | Your friend texts "I'm packed!" before actually packing. You act on the announcement, not the fact. Expected output 100, actual output 0. |

## Lecture 09 — Synchronization — Hardware, Mutexes & Semaphores

| id | engine | topic | slides | domain | analogy |
|---|---|---|---|---|---|
| 47 | `diagram` | Disabling Interrupts | slide 3 | travel | Put the single coach into "do not disturb." Works fine for one vehicle; useless the moment you have a fleet running in parallel. |
| 48 | `diagram` | Memory Models — Strongly vs Weakly Ordered | slide 4 | friends | A group chat where everyone sees messages in the same order, versus one where your friends see them shuffled. Both are "delivered." |
| 49 | `trace` | Memory Barriers | slide 5 | friends | "Nobody sends anything else until everyone confirms they've read this one." A hard line in the message stream that nothing crosses. |
| 50 | `counter` | test_and_set | slides 6–7 | travel | The petrol-station restroom key on a hook. Looking and grabbing happen in one indivisible motion, so two people can't both come away holding it. |
| 51 | `counter` | Building a Lock with test_and_set | slide 8 | travel | Stand at the hook and check it every second until the key reappears. Correct, and completely wasteful. |
| 52 | `counter` | compare_and_swap | slide 9 | food | "If the tag still says $5, charge $5." Checking the expected value and replacing it happen as one move, so a price change mid-transaction can't slip through. |
| 53 | `counter` | Building a Lock with compare_and_swap | slide 10 | food | Same doorway, different mechanism — swap 0 for 1 and you're in. Shown side by side with the test-and-set version. |
| 54 | `counter` | Bounded-Waiting Mutual Exclusion with CAS | slide 11 | travel | Instead of returning the key to the hook, you hand it directly to the next person in line. Now nobody can be skipped indefinitely. |
| 55 | `counter` | Atomic Variables | slides 12–13 | friends | A shared tally counter that physically cannot be corrupted by two people pressing at once — CAS wrapped into something you'd actually use. |
| 56 | `counter` | Mutex Locks — acquire() / release() | slides 14–16 | travel | One hotel room, one key. Take it, use the room, put it back. The whole point is that application programmers stop thinking about hardware. |
| 57 | `counter` | Busy Waiting & Spinlocks | slide 16 | travel | Standing outside the room jiggling the handle. Wasteful if the wait is long — genuinely optimal if the occupant leaves in two seconds. |
| 58 | `counter` | Semaphores — wait() and signal() | slide 17 | travel | Five charging ports at the airport gate and a live count of what's free. Take one, the count drops; leave, it rises. |
| 59 | `counter` | Counting vs Binary Semaphores | slide 18 | travel | Five rental bikes at the dock versus one toilet on the platform. Same tool; the initial count is the whole difference. |
| 60 | `counter` | Semaphore Implementation & Its Own Critical Section | slide 19 | travel | The board showing free ports is itself a shared resource two people can corrupt. The tool that solves the problem has the problem. |
| 61 | `counter` | Semaphores Without Busy Waiting — block() and wakeup() | slides 20–21 | travel | Take a ticket number and sit down. You're woken when it's your turn instead of hovering. A negative count now means "this many people are seated, waiting." |
| 62 | `counter` | Problems with Semaphores | slide 22 | friends | One friend forgets to text "I'm out" and the whole group waits all night. Swap the calls, omit one, or double up — each mistake shown as its own failure. |

## Lecture 10 — Deadlocks

| id | engine | topic | slides | domain | analogy |
|---|---|---|---|---|---|
| 63 | `diagram` | System Model — request, use, release | slide 3 | food | Ask for the salt, use the salt, put the salt back. Every resource interaction in the course is these three steps. |
| 64 | `graph` | Deadlock in a Multithreaded Application | slides 4–6 | food | Two friends, two chopsticks, one each. Both are polite, both are patient, and neither will ever eat. The two-mutex code runs alongside the scene. |
| 65 | `diagram` | Condition 1 — Mutual Exclusion | slide 7 | food | A chopstick can't be split in half. Non-shareable by nature — this is the condition you almost never get to remove. |
| 66 | `diagram` | Condition 2 — Hold and Wait | slide 7 | food | Gripping one chopstick while waiting for the second. Nobody gives anything up while they wait — that's what turns waiting into deadlock. |
| 67 | `diagram` | Condition 3 — No Preemption | slide 7 | food | You can't snatch the chopstick out of your friend's hand. It's released voluntarily or not at all. |
| 68 | `diagram` | Condition 4 — Circular Wait | slide 7 | food | A round table where every person waits on the one to their left. Trace the ring and it closes — all four conditions must hold at once. |
| 69 | `graph` | Resource-Allocation Graph | slides 8–9 | travel | A map of who's holding which car key and who's waiting on it. Request edges point one way, assignment edges the other. |
| 70 | `graph` | A Graph With a Deadlock | slide 10 | travel | The cycle lights up on the map as you trace it. Single instance per resource type, so the cycle is conclusive. |
| 71 | `graph` | A Cycle With No Deadlock | slides 11–12 | travel | The same ring, but there are two spare cars in the lot — someone finishes, releases, and the ring dissolves. Cycles are necessary, not sufficient. |
| 72 | `diagram` | Four Ways to Handle Deadlocks | slide 13 | travel | Prevent it, avoid it, detect and recover, or ignore it and reboot — which is what Linux and Windows actually do. |
| 73 | `diagram` | Prevention — Attacking Mutual Exclusion & Hold-and-Wait | slide 14 | food | Shareable dishes need no lock. Or: take all your cutlery in one grab or none at all — which starves you if the table is busy. |
| 74 | `diagram` | Prevention — Attacking No-Preemption | slide 15 | food | If you can't get the second chopstick, put the first one back down and start over. Progress at the cost of repeated work. |
| 75 | `diagram` | Prevention — Circular Wait via Lock Ordering | slide 16 | food | Number every chopstick and require everyone to pick up the lower number first. One person reaches right instead of left — and the ring can never close. |
| 76 | `diagram` | Deadlock Avoidance & Maximum Claims | slide 17 | travel | Everyone declares their maximum trip budget before departure. The treasurer uses those ceilings to decide what's safe to lend. |
| 77 | `matrix` | Safe State & Safe Sequences | slides 18–19 | travel | There exists some order in which you can fund every friend to the end of the trip and get repaid. Find one sequence and you're safe. |
| 78 | `diagram` | Safe, Unsafe & Deadlock Regions | slide 20 | travel | Unsafe doesn't mean stranded — it means you've lost the guarantee. Three nested regions, animated as the state moves between them. |
| 79 | `graph` | Resource-Allocation Graph Algorithm & Claim Edges | slides 21–25 | travel | Dotted lines for "I might need this car later." Granting a request is only allowed if the solid line it creates doesn't close a ring. |
| 80 | `matrix` | Banker's Algorithm — Available, Max, Allocation, Need | slides 26–27 | travel | The group treasurer's ledger: cash on hand, each person's declared ceiling, what they've drawn, and what they could still ask for. |
| 81 | `matrix` | The Safety Algorithm | slide 28 | travel | Sweep the ledger looking for anyone you can fully fund right now. Fund them, collect everything back, repeat. If everyone finishes, the state is safe. |
| 82 | `matrix` | Resource-Request Algorithm | slide 29 | travel | Pretend to grant the loan, run the safety check on the imaginary ledger, then either commit or hand the money back and say wait. |
| 83 | `matrix` | Banker's Worked Example — P1 requests (1,0,2) | slides 30–32 | travel | The full five-process, three-resource ledger from the deck, stepped through cell by cell, ending on the safe sequence ⟨P1, P3, P4, P0, P2⟩. |
| 84 | `graph` | Detection — the Wait-For Graph | slides 34–35 | travel | The traffic officer collapses the map down to "who is blocking whom" and looks for a loop. Resources drop out; only the waiting matters. |
| 85 | `matrix` | Detection Algorithm for Multiple Instances | slides 36–38 | travel | The same ledger sweep as the safety check, but using what people are actually asking for right now instead of their declared ceilings. |
| 86 | `matrix` | Detection Worked Example | slides 39–40 | travel | Reclaim what P0 holds and everyone still finishes — until P2 asks for one more C, and the same system tips into deadlock. Both runs animate side by side. |
| 87 | `diagram` | When and How Often to Run Detection | slide 41 | travel | How often should the officer check the roundabout? Check constantly and you burn the whole shift; check rarely and cars sit locked for an hour. |
| 88 | `diagram` | Recovery — Process Termination | slide 42 | travel | Somebody's trip gets cancelled. Abort everyone, or abort one at a time until the ring breaks — and the ordering criteria decide who loses. |
| 89 | `diagram` | Recovery — Resource Preemption, Rollback & Starvation | slide 43 | travel | Tow one car out and send it back to the last junction it was safe at. Pick the cheapest victim — but never the same car every time, or it never arrives. |
