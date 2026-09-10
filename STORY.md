# STORY.md — the world these 24 lessons happen in

One family. Three places. Twenty four chapters that remember each other.

This file exists so that 24 lessons do not drift into 24 different families. Before writing or
changing any lesson copy, read this. If a lesson needs someone or something that is not here,
add it here first, then use it.

**This does not replace SPEC §3C.2a.** The analogy must still be structurally isomorphic to the
mechanism: same element set, same ids, same coordinate space. Story is what makes the structure
land. It is never a substitute for the structure being right. A beautiful scene that maps badly
is worse than a plain one that maps exactly.

---

## Who reads this

One learner. A Bangladeshi undergraduate, upper middle class, preparing for a CSC 2209 exam.
She is not a character in the story. She is the one watching, and the writing speaks to her
directly. The family in these lessons is hers.

---

## The cast

**Ammu.** The mother. Ammu and mother are interchangeable, and so are Abbu and father. Use
whichever reads better in the sentence. She runs the household and she runs the restaurant's
books. In most
lessons she is the one deciding: who gets served, who gets lent to, who waits. When a lesson
needs a scheduler, an allocator, or someone holding a resource that everyone wants, it is
usually her. She is careful with money and she counts things twice.

**Abbu.** The father. He drives, he fetches, he does things at the same time as Ammu without
checking with her first. When a lesson needs two people acting concurrently and colliding, it
is Ammu and Abbu. He is not careless. He simply does not know what she is doing at that moment,
which is the entire point of every race condition in this course.

**Arijit.** The brother. When a lesson needs someone who asks for more than he has, it is
Arijit.

**Afra.** The sister. When a lesson needs a small request that keeps losing to bigger ones, it
is Afra. Starvation and aging are her lessons.

**Do not invent biography for these two.** No ages, no university, no school, no personality
beyond the role the mechanism needs. The owner gave two names, and everything else about them
is a detail this project does not need and should not make up. Say what they do in the scene,
not who they are.

**Kabir chacha.** The building's night guard. He sits at a desk by the driveway with a register
and a torch. He does not own anything in the story. He observes, he writes down who is blocking
whom, and when it goes wrong he is the one who has to sort it out. Detection and recovery are
his.

**Pechu.** The cat. She is not a mechanism. She is there because a house has a cat in it, and
because one warm detail in a paragraph about matrices is worth a great deal.

---

## The three places

### 1. The flat

Third floor, Dhanmondi. Where most of the course happens.

The kitchen with one stove. The narrow doorway between the kitchen and the dining room, wide
enough for one person. The dining table. The fridge. The almirah in the bedroom, where the
envelope lives. The one bathroom, with a little latch on the inside. The hook by the front door
where the car key hangs.

These objects are fixed. The bathroom has one latch, not two. There is one stove and one car
key. If a lesson needs a second bathroom, the lesson is wrong, not the flat.

### 2. Yum Cha

The family's Chinese restaurant, twenty minutes away. One kitchen, one stove, one cook at the
pass. Tables out front, a takeaway counter downstairs on the street.

**The dish this place is known for is chicken nanban.** Fried chicken, sweet vinegar, tartar
sauce over the top. It is what people come for, it is what the kitchen is judged on, and it is
what most of the tickets in these lessons are for. Around it sit the ordinary things a pan
Asian place in Dhaka serves: ramen, gyoza, fried rice, miso soup, edamame.

**Home is Bengali and the restaurant is Asian**, which is ordinary for a family like this one
and is also useful. The food tells her which place she is standing in without a word of
explanation: chicken nanban means Yum Cha, biryani means the flat.

Ammu decides the serving rule. Friday night is the busy night, and there is a spike of tickets
from last Friday that she keeps in a drawer, which is how the course gets a fixed workload to
argue about.

### 3. The building

The driveway is narrow and cars park in behind one another, so the car at the back cannot leave
until the one in front moves. There are numbered spots. Kabir chacha's desk is by the gate.

This is where every deadlock lesson happens, because a driveway is the one place in ordinary
life where holding what you have and waiting for what you need traps everybody at once.

---

## How the chapters connect

| Lesson | Where | Who | The situation |
|---|---|---|---|
| L1 | flat | Ammu, everyone | Dinner arrives dish by dish. You eat, then you wait. |
| L2 | Yum Cha | the kitchen | A party of forty ordered ahead of two coffees. |
| L3 | Yum Cha | the cook | Quick plates go out before the big order is ready. |
| L4 | flat, car | Abbu, Arijit, Afra | Turns with the car, a fixed slot each. |
| L5 | flat | Afra | She keeps getting skipped at dinner until Ammu notices. |
| L6 | Yum Cha | the host | Linger over your plate and you get moved to a back tier. |
| L7 | Yum Cha | the cooks | One cook, then two, then one cook with two pans. |
| L8 | Yum Cha | the waiters | Move a waiter to the busy side and he forgets your table. |
| L9 | flat, car | Abbu | The doorbell, the corridor, and the car still leaves on time. |
| L10 | flat, fridge | Ammu, Abbu | Both count the plates. One count is lost. |
| L11 | flat, bathroom | everyone | One bathroom, one latch, and what a correct rule must promise. |
| L12 | flat, doorway | Ammu, Abbu | Each waves the other through the narrow doorway. |
| L13 | flat, key hook | Ammu, Abbu | Looking at the hook and taking the key is one motion. |
| L14 | flat, bathroom | Arijit waiting | Jiggle the handle, or sit on the bench and be called. |
| L15 | building | the family | Five spots, a live count, and what happens below zero. |
| L16 | flat, table | Ammu, Abbu | Two serving spoons, both polite, neither eats. |
| L17 | building | Kabir chacha | Draw who blocks whom, and find the closed ring. |
| L18 | flat, table | Ammu | Four ways to stop the ring from ever closing. |
| L19 | flat, almirah | Ammu, Arijit, Afra | The trip envelope, and lending only while everyone can still finish. |
| L20 | flat, almirah | Ammu | She lends to one, refuses another, and counts it out cell by cell. |
| L21 | building | Kabir chacha | He rubs out the cars and keeps only who waits on whom. |
| L22 | building | Kabir chacha | Move the cheapest car, then watch it be the same car every night. |
| L23 | Yum Cha | Ammu | Last Friday's tickets, three serving rules, and one answer that only held for that Friday. |
| L24 | flat, kitchen | the kitchen, Ammu | The call of "ready" travels faster than the dish does. |

**Food placement is a continuity check, not decoration.** Yum Cha serves chicken nanban, the
flat cooks Bengali. L24's biryani is in the flat's kitchen and stays exactly as it is. L23's
orders are at Yum Cha and are built around the nanban. If a lesson set at Yum Cha mentions
kacchi, it has drifted.

**Callbacks are allowed and encouraged where they are true.** L20 is the same envelope as L19.
L21 and L22 are the same driveway as L17. L14 is the same bathroom as L11. L24 is the same
kitchen doorway as L12, seen from the other side. Say so when it helps her, because the second
time she sees a place she is not learning a new scene, she is learning a new idea.

**Do not invent a callback that is not true of the mechanism.** L16's two spoons are not L13's
one car key. They look similar and they teach different things.

---

## The voice

Second person where it helps, present tense, warm and close. Someone sitting beside her and
explaining, not a textbook and not a friend being cute about it.

Write it like this:

> Ammu has been saving for the trip since Eid. Twelve thousand taka, folded in an envelope at
> the back of the almirah.
>
> Now three people want to borrow from it, and each of them swears they will pay her back
> before the trip. She has to decide who gets what, and in what order, without ever reaching
> the point where nobody can finish and the trip is off.
>
> That is the whole problem. Watch her do it.

### The rule that matters most: she must learn both

The story is how she gets in. **It is not what she is examined on.**

Every lesson must leave her able to say two things:

1. What happened in the flat, in the driveway, at Yum Cha. The scene.
2. **What it is actually called, and how the real mechanism works, in the words her exam will
   use.** Banker's algorithm. Wait-for graph. Store buffer. Time quantum. Little's formula.
   Available, Max, Allocation, Need.

If she finishes a lesson able to retell the story but unable to define the term, the lesson has
failed her, and it has failed her in the way that is hardest to notice, because it felt good
while she was reading it.

**So every lesson names the thing, explicitly.** Not hidden in a caption, not left implied by
the mechanism view. The `concept` field is where this lives, and it is not a summary. It is the
real explanation, with the real vocabulary, written as carefully as the story is:

> What Ammu is doing has a name. It is the **banker's algorithm**, and a bank is exactly where
> it comes from: never lend so much that you cannot cover everyone who might still come asking.
>
> The system keeps four things. **Available** is what is free right now, the notes still in the
> envelope. **Max** is the most each process could ever ask for, which is what everyone
> declared before the trip. **Allocation** is what each one is holding already. **Need** is Max
> minus Allocation, what they could still come back for.
>
> When a request arrives, the system does not ask "can I afford this". It asks something
> stricter: **if I grant this, is there still some order in which every process could finish?**
> That order is called a **safe sequence**...

Notice what that does. It keeps the envelope in view while teaching her the four matrix names
she will be asked to fill in. The story is not decoration and it is not a replacement. It is
the thing that makes the vocabulary stick to something.

**The `analogyMapping` field is the explicit bridge** and every lesson must have one that is
complete, in the form `scene thing ➔ mechanism thing`. That is the list she revises from the
night before the exam.

**Where a term has a standard name, use it in full at least once**, even if the scene has a
nicer word for it. Say "this is the critical section" and then go back to calling it the
bathroom. She needs to have read the real phrase.

### Rules

**Length is not a virtue and neither is brevity.** Write what it takes for her to understand,
and then stop. If a mechanism needs four hundred words, use four hundred. If it needs sixty,
using four hundred is padding and padding reads as noise. The old copy was too short because a
density rule and a caption cap were quietly shaping it. Neither is a reason to under explain.

**No em dashes. Ever.** Not in analogy text, not in concept text, not in captions, not in
`morphReveals`, not in the reference pages, not in code comments. Use a full stop, a comma, a
colon, or two sentences. This is enforced by a test, not by good intentions.

En dashes in numeric ranges are fine and are a different character: `slides 3–5`, `units 47–49`.

**Every number in a sentence must be computed or asserted.** This is not a style rule, it is
the standing rule of the project and story writing makes it easier to break, not harder. If a
paragraph says the engagement party is bigger than the other four together, a test must check
that against the data. That exact sentence was wrong for a week because nothing checked it.

**Captions are story beats now, not state labels.** "P1 requests (1,0,2). Safe." becomes
something that tells her what just happened and why it mattered. But a caption still has to be
true of the step it sits on, and the same test discipline applies. A caption that reads
beautifully and misstates the order is the worst defect this project produces, and it has
happened seven times.

**Never write a sentence that the playground can make false.** She can reorder the queue and
change the quantum. If the prose says "the count ends at 3", she can make it end at 4 and the
lesson has lied to her.

---

## What must not change

The mechanism. The computed numbers. The isomorphism between the two views. The element ids.
The deck fidelity: every figure still comes from `src/algorithms/` and still matches the
lecture slides.

If a story would be better with different numbers, the story is wrong. She has an exam on
these numbers.
