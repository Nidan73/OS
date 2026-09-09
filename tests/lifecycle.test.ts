import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationEngine } from '../src/core/engine.js';
import { mountUnit, registerEngine } from '../src/core/registry.js';
import type { Unit } from '../src/core/types.js';

class FakeEngine extends AnimationEngine<void, { n: number }> {
  renders: number[] = [];
  protected buildSteps() {
    return [0, 1, 2].map(n => ({ t: n, caption: `step ${n}`, state: { n } }));
  }
  protected mount() { /* no-op */ }
  protected render(st: { n: number }) { this.renders.push(st.n); }
}

const UNIT_STUB: Unit<void, { n: number }> = {
  id: 999,
  lecture: 6,
  slug: 'test-unit',
  title: 'Test Unit',
  slides: 'slide 1',
  engine: 'diagram',
  analogy: { domain: 'friends', text: 'test analogy' },
  concept: 'test concept',
  input: undefined
};

function matchMediaMock(query: string, matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q === query ? matches : false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('AnimationEngine Lifecycle (§7.1)', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('seek is idempotent — §4A.2', () => {
    const e = new FakeEngine(el); e.init();
    e.seek(2); const a = e.renders.at(-1);
    e.seek(2); const b = e.renders.at(-1);
    expect(a).toBe(b);
  });

  test('seek backwards equals seek forwards — §4A.3', () => {
    const fwd = new FakeEngine(el); fwd.init(); fwd.seek(0); fwd.seek(2);
    const back = new FakeEngine(el); back.init(); back.seek(2); back.seek(0); back.seek(2);
    expect(fwd.renders.at(-1)).toBe(back.renders.at(-1));
  });

  test('seek clamps out-of-range indices', () => {
    const e = new FakeEngine(el); e.init();
    e.seek(99); expect(e.getCurrentIndex()).toBe(2);
    e.seek(-5); expect(e.getCurrentIndex()).toBe(0);
  });

  test('destroy is safe twice and no-ops afterwards — §3A.2', () => {
    const e = new FakeEngine(el); e.init();
    expect(() => { e.destroy(); e.destroy(); }).not.toThrow();
    const before = e.renders.length;
    e.seek(1);
    expect(e.renders.length).toBe(before); // disposed engines do nothing
  });

  test('destroy removes subscriptions', () => {
    const e = new FakeEngine(el); e.init();
    let calls = 0;
    e.onStepChange(() => { calls++; });
    e.destroy();
    e.seek(1);
    expect(calls).toBe(0);
  });

  test('unsubscribe function detaches a single listener', () => {
    const e = new FakeEngine(el); e.init();
    let calls = 0;
    const off = e.onStepChange(() => { calls++; });
    e.seek(1); const after = calls;
    off(); e.seek(2);
    expect(calls).toBe(after);
  });

  test('an engine that throws renders the fallback and does not escape — §3A.3', () => {
    class Broken extends FakeEngine { protected mount() { throw new Error('boom'); } }
    registerEngine('broken' as any, Broken as any);
    const host = document.createElement('div');
    expect(() => mountUnit({ ...UNIT_STUB, engine: 'broken' as any }, host)).not.toThrow();
    expect(host.textContent).toMatch(/failed to load/i);
  });

  test('an empty step list is rejected loudly', () => {
    class Empty extends FakeEngine { protected buildSteps() { return []; } }
    expect(() => new Empty(el).init()).toThrow();
  });

  test('pause() stops playback under reduced motion — regression', () => {
    vi.useFakeTimers();
    matchMediaMock('(prefers-reduced-motion: reduce)', true);
    const e = new FakeEngine(el); e.init();
    e.play();
    e.pause();
    const idx = e.getCurrentIndex();
    vi.advanceTimersByTime(5000);
    expect(e.getCurrentIndex()).toBe(idx); // must NOT have advanced
  });

  test('pause() stops playback with motion enabled', () => {
    vi.useFakeTimers();
    matchMediaMock('(prefers-reduced-motion: reduce)', false);
    const e = new FakeEngine(el); e.init();
    e.play(); e.pause();
    const idx = e.getCurrentIndex();
    vi.advanceTimersByTime(5000);
    expect(e.getCurrentIndex()).toBe(idx);
  });

  test('destroy() during playback cancels pending advances', () => {
    vi.useFakeTimers();
    const e = new FakeEngine(el); e.init();
    e.play(); e.destroy();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(e.getCurrentIndex()).toBe(0);
  });
});
