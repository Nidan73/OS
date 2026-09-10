import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import gsap from 'gsap';
import { AnimationEngine } from '../src/core/engine.js';

/**
 * Part 1 proof: play() tweens attributes BETWEEN absolute snapshots (§4A.3).
 * A two-step engine whose bar moves x 0 → 100 must show x ≈ 50 mid-tween, * not a hold-then-hard-cut, while seek() stays instant and destroy() kills
 * the tween timeline.
 */
class SlidingBarEngine extends AnimationEngine<void, { x: number; label: string }> {
  protected buildSteps() {
    return [
      { t: 0, caption: 'step 0', state: { x: 0, label: '0' } },
      { t: 1, caption: 'step 1', state: { x: 100, label: '7' } }
    ];
  }
  protected mount() {
    this.container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 60');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'bar-slide');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '40');
    rect.setAttribute('height', '20');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('id', 'count-slide');
    label.textContent = '0';
    g.append(rect);
    svg.append(g, label);
    this.container.appendChild(svg);
  }
  protected render(st: { x: number; label: string }) {
    const svg = this.container.querySelector('svg');
    if (!svg) return;
    svg.querySelector('rect')?.setAttribute('x', String(st.x));
    const label = svg.querySelector('#count-slide');
    if (label) label.textContent = st.label;
  }
}

function matchMediaMock(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

describe('Part 1 · play() tweens attributes between snapshots (§4A.3)', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    matchMediaMock(false);
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.useRealTimers();
    gsap.globalTimeline.clear();
  });

  test('geometry is mid-way at mid-tween, bars slide, not snap', () => {
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    const rect = () => el.querySelector('rect') as SVGRectElement;

    expect(rect().getAttribute('x')).toBe('0');
    e.play();
    const tl = (e as unknown as { timeline: gsap.core.Timeline | null }).timeline;
    expect(tl).not.toBeNull();
    // Halfway through the step tween the bar must be between the snapshots.
    tl?.progress(0.5);
    const mid = parseFloat(rect().getAttribute('x') as string);
    expect(mid).toBeGreaterThan(5);
    expect(mid).toBeLessThan(95);
    // Completing the tween lands exactly on the next absolute state.
    tl?.progress(1);
    expect(rect().getAttribute('x')).toBe('100');
    e.destroy();
  });

  test('numeric text counts rather than jumps mid-tween', () => {
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    const label = () => el.querySelector('#count-slide') as SVGTextElement;
    expect(label().textContent).toBe('0');
    e.play();
    const tl = (e as unknown as { timeline: gsap.core.Timeline | null }).timeline;
    tl?.progress(0.5);
    const mid = Number(label().textContent);
    expect(Number.isFinite(mid)).toBe(true);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(7);
    tl?.progress(1);
    expect(label().textContent).toBe('7');
    e.destroy();
  });

  test('seek() stays instant, no tweening on scrub', () => {
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    e.seek(1);
    expect((el.querySelector('rect') as SVGRectElement).getAttribute('x')).toBe('100');
    expect((e as unknown as { timeline: gsap.core.Timeline | null }).timeline).toBeNull();
    e.destroy();
  });

  test('prefers-reduced-motion keeps the snap path, no tween timeline', () => {
    matchMediaMock(true);
    vi.useFakeTimers();
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    e.play();
    expect((e as unknown as { timeline: gsap.core.Timeline | null }).timeline).toBeNull();
    vi.advanceTimersByTime(2000);
    expect((el.querySelector('rect') as SVGRectElement).getAttribute('x')).toBe('100');
    e.destroy();
  });

  test('destroy() kills the tween timeline mid-flight', () => {
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    e.play();
    const tl = (e as unknown as { timeline: gsap.core.Timeline | null }).timeline;
    expect(tl).not.toBeNull();
    // The tween is on the step timeline: killing it must stop all progress.
    tl?.progress(0.25);
    const atQuarter = (el.querySelector('rect') as SVGRectElement).getAttribute('x');
    e.destroy();
    expect(tl?.isActive()).toBe(false);
    expect(tl?.progress()).toBe(1);
    expect((e as unknown as { timeline: gsap.core.Timeline | null }).timeline).toBeNull();
    void atQuarter;
  });

  test('pause() restores the current step exactly, the DOM never rests between snapshots', () => {
    const e = new SlidingBarEngine(el);
    e.init();
    e.seek(0);
    e.play();
    const tl = (e as unknown as { timeline: gsap.core.Timeline | null }).timeline;
    tl?.progress(0.5);
    e.pause();
    // Pause keeps the step (§4A.3: index advances only on tween completion),
    // so the bar is back on step 0's absolute values, not stranded mid-way.
    expect((el.querySelector('rect') as SVGRectElement).getAttribute('x')).toBe('0');
    expect((el.querySelector('#count-slide') as SVGTextElement).textContent).toBe('0');
    expect(e.getCurrentIndex()).toBe(0);
    // Resuming re-plays the same transition to its exact end state.
    e.play();
    const tl2 = (e as unknown as { timeline: gsap.core.Timeline | null }).timeline;
    tl2?.progress(1);
    expect((el.querySelector('rect') as SVGRectElement).getAttribute('x')).toBe('100');
    expect((el.querySelector('#count-slide') as SVGTextElement).textContent).toBe('7');
    e.destroy();
  });
});
