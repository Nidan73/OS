import { describe, test, expect, beforeEach } from "vitest";
import { QueueEngine } from "../../src/engines/queue.js";
import { lesson07 } from "../../src/lessons/lecture-07/lesson-07.js";

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
    const wT1 = parseFloat(host.querySelector("#bar-T1 rect")!.getAttribute("width")!);
    // Mechanism layout encodes burst duration (burst 12 -> 60)
    expect(wT1).toBe(60);
    expect(wT1).toBeGreaterThan(50);
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
});
