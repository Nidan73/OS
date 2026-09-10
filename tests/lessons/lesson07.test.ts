import { describe, test, expect, beforeEach } from "vitest";
import { QueueEngine } from "../../src/engines/queue.js";
import { SMTQueueEngine, lesson07 } from "../../src/lessons/lecture-07/lesson-07.js";

describe("Lesson 7: More cores, more problems (§3C)", () => {
  let host: HTMLElement;
  let engine: QueueEngine;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    engine = new QueueEngine(host, JSON.parse(JSON.stringify(lesson07.input)));
    engine.init(0); // Opens at view = 0 per §3C.3
  });

  test("lesson definition matches LESSONS.md and absorbs units 19–23", () => {
    expect(lesson07.id).toBe(7);
    expect(lesson07.lecture).toBe(7);
    expect(lesson07.slug).toBe("lesson-07");
    expect(lesson07.title).toBe("More cores, more problems");
    expect(lesson07.absorbsUnits).toEqual([19, 20, 21, 22, 23]);
    expect(lesson07.slides).toBe("slides 9–14");
    expect(lesson07.engine).toBe("queue");
    expect(lesson07.analogy.domain).toBe("food");
    expect(lesson07.concept).toContain("Multiprocessor");
    expect(lesson07.morphMode).toBe("morph");
    expect(lesson07.morphReveals).toBe(
      "In the kitchen a gap at the cook's counter is plain dead time, nobody is cooking and the width is simply waste. On the core that same gap is a memory stall, and a second pan slides straight into it. Empty width stops meaning wasted and starts meaning available to somebody else."
    );
  });

  test("structural isomorphism rule (§3C.2): identical element IDs in view 0, 0.5, and 1", () => {
    const ids = ["bar-T1", "bar-T2", "bar-T3", "bar-T4"];

    // At view = 0 (analogy)
    engine.setView(0);
    for (const id of ids) {
      expect(host.querySelector(`#${id}`), `element #${id} missing in view=0`).not.toBeNull();
    }

    // At view = 0.5 (mid-morph)
    engine.setView(0.5);
    for (const id of ids) {
      expect(host.querySelector(`#${id}`), `element #${id} missing in view=0.5`).not.toBeNull();
    }

    // At view = 1 (mechanism)
    engine.setView(1);
    for (const id of ids) {
      expect(host.querySelector(`#${id}`), `element #${id} missing in view=1`).not.toBeNull();
    }
  });

  test("render is absolute and idempotent (§4A.2)", () => {
    engine.seek(1);
    const html1 = host.innerHTML;
    engine.seek(1);
    const html2 = host.innerHTML;
    expect(html1).toBe(html2);
  });

  // §3C.2c Required tests per lesson
  test("analogy layout is native, not the mechanism restyled (§3C.2c)", () => {
    engine.setView(0);
    const widths = ["T1", "T2", "T3", "T4"].map(id =>
      parseFloat(host.querySelector(`#bar-${id} rect`)!.getAttribute("width")!)
    );
    // Equal footprints in a queue (width = 50)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    expect(widths[0]).toBe(50);
  });

  test("mechanism layout encodes the quantity (§3C.2c)", () => {
    engine.setView(1);
    const w = (id: string) =>
      parseFloat(host.querySelector(`#bar-${id} rect`)!.getAttribute("width")!);
    const box = (id: string) => {
      const r = host.querySelector(`#bar-${id} rect`)!;
      return { x: parseFloat(r.getAttribute("x")!), w: parseFloat(r.getAttribute("width")!) };
    };

    // This used to assert an exact 60px for burst 12. That pinned an
    // implementation detail rather than the property, and it hid a real bug:
    // nothing checked that the row of burst-proportional items fits inside
    // its lane, so a long queue ran off the right edge and sat on top of the
    // core boxes. The engine now scales a row to fit, which is correct and
    // changes the pixel while preserving what the pixel was there to prove.
    const bursts: Record<string, number> = { T1: 12, T2: 8, T3: 16 };
    const ids = Object.keys(bursts);

    // width still encodes burst: the ratio between any two matches their bursts
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        expect(w(a) / w(b)).toBeCloseTo(bursts[a] / bursts[b], 2);
      }
    }
    // and a longer burst is still visibly wider than the equal-footprint slot
    expect(w("T3")).toBeGreaterThan(w("T1"));

    // the property whose absence caused the bug: every item stays in its lane
    const laneRight = 16 + 440;
    for (const id of ids) {
      const bx = box(id);
      expect(bx.x + bx.w, `${id} runs past the lane`).toBeLessThanOrEqual(laneRight);
    }
  });

  test("geometry interpolates, the morph is real (§3C.2c)", () => {
    const ids = ["T1", "T2", "T3", "T4"];
    const widthAt = (view: number, id: string) => {
      engine.setView(view);
      return parseFloat(host.querySelector(`#bar-${id} rect`)!.getAttribute("width")!);
    };

    for (const id of ids) {
      const [a, mid, b] = [widthAt(0, id), widthAt(0.5, id), widthAt(1, id)];
      // strictly between endpoints: 50 < 55 < 60
      expect(mid).toBeGreaterThan(Math.min(a, b));
      expect(mid).toBeLessThan(Math.max(a, b));
    }
  });

  test("every event in every reachable configuration speaks both lenses", () => {
    // The playground can reach four configurations. Each event must carry the
    // mechanism sentence and the kitchen sentence for the same beat, within
    // the caption rail, in both of them.
    const configs = [
      { coresCount: 1, smtEnabled: false },
      { coresCount: 1, smtEnabled: true },
      { coresCount: 2, smtEnabled: false },
      { coresCount: 2, smtEnabled: true }
    ];

    const host = document.createElement("div");
    document.body.appendChild(host);
    const engine = new SMTQueueEngine(
      host,
      JSON.parse(JSON.stringify(lesson07.input))
    );
    engine.init(0);

    const playground = document.createElement("section");
    const scoreboard = document.createElement("section");
    engine.renderPlayground(playground, scoreboard);

    for (const { coresCount, smtEnabled } of configs) {
      // Every control interaction re-renders the playground, so re-query the
      // controls each round: a stale reference would silently stop driving
      // the configuration and weaken this guard to a single-branch test.
      const slider = playground.querySelector("#core-count-slider") as HTMLInputElement;
      const toggle = playground.querySelector("#btn-toggle-smt") as HTMLButtonElement;
      expect(slider).not.toBeNull();
      expect(toggle).not.toBeNull();

      slider.value = String(coresCount);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      // Only flip the toggle when the current state differs from the target,
      // the button toggles rather than sets.
      if (
        (toggle.textContent?.includes("Active") ?? false) !== smtEnabled
      ) {
        playground.querySelector<HTMLButtonElement>("#btn-toggle-smt")!.click();
      }
      const steps = engine.getSteps();
      expect(steps.length).toBeGreaterThan(4);
      for (const step of steps) {
        expect(step.caption.length, step.caption).toBeLessThanOrEqual(320);
        expect(step.caption.length, step.caption).toBeGreaterThan(0);
        expect(
          (step.analogyCaption ?? "").length,
          step.analogyCaption ?? step.caption
        ).toBeGreaterThan(0);
        expect(
          (step.analogyCaption ?? "").length,
          step.analogyCaption ?? step.caption
        ).toBeLessThanOrEqual(320);
        // The analogy voice speaks of the kitchen, never of cores: a missing
        // analogyCaption falls back to the mechanism caption, which this
        // guard exists to catch.
        expect(step.analogyCaption, step.caption).toBeDefined();
      }
    }
    engine.destroy();
    host.remove();
  });

  test("the static lesson input carries both voices on every event", () => {
    for (const ev of lesson07.input.events ?? []) {
      expect(ev.analogyCaption, ev.caption).toBeDefined();
      expect(ev.caption.length, ev.caption).toBeLessThanOrEqual(320);
      expect((ev.analogyCaption ?? "").length, ev.caption).toBeLessThanOrEqual(320);
    }
  });
});
