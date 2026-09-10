import gsap from 'gsap';
import type { Step } from './types.js';

/**
 * SVG attributes interpolated between steps during play() (§4A.3). Geometry
 * first — position and size are what the learner reads as motion — plus
 * `rx`/`ry` (corner radius, which every engine's morph already treats as
 * geometric), `transform` and `opacity` for moves and fades. Paint (`fill`,
 * `stroke`, `stroke-width`) is deliberately excluded: colour encodes state
 * and snaps with it, exactly as render() sets it.
 */
const STEP_TWEEN_ATTRS = [
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2', 'rx', 'ry', 'transform', 'opacity'
];

interface StepGeometryEntry {
  tag: string;
  /** Present SVG attributes from STEP_TWEEN_ATTRS, as strings. */
  attrs: Record<string, string>;
  /** Inline style opacity, '' when unset. */
  styleOpacity: string;
  /** Text content for childless elements, null otherwise. */
  text: string | null;
}

function parsePureNumber(s: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(s.trim())) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function decimalPlaces(s: string): number {
  const dot = s.trim().indexOf('.');
  return dot < 0 ? 0 : s.trim().length - dot - 1;
}

function formatCounted(v: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(v)) : v.toFixed(decimals);
}

export abstract class AnimationEngine<I, S> {
  protected steps: Step<S>[] = [];
  protected timeline: gsap.core.Timeline | null = null;
  protected viewTween: gsap.core.Tween | null = null;
  protected index = 0;
  /** view: 0 = pure analogy, 1 = pure mechanism, fractional = mid-morph (§3C.3) */
  protected currentView = 0;
  private disposed = false;
  private playing = false;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private onStepListeners: ((index: number, step: Step<S>) => void)[] = [];
  private onPlayStateListeners: ((isPlaying: boolean) => void)[] = [];
  private onViewListeners: ((view: number) => void)[] = [];
  private onStepsRebuiltListeners: (() => void)[] = [];

  constructor(protected container: HTMLElement, protected input: I = undefined as I) {}

  /** Pure. Input -> complete step list. Calls into algorithms. */
  protected abstract buildSteps(input: I): Step<S>[];
  /** Build static SVG scaffolding once. */
  protected abstract mount(): void;
  /** Absolute render of one state at view level (0 = analogy, 1 = mechanism). MUST be idempotent (§4A.2). */
  protected abstract render(state: S, view: number): void;

  init(initialView?: number): void {
    if (initialView !== undefined) {
      this.currentView = Math.max(0, Math.min(1, initialView));
    }
    this.steps = this.buildSteps(this.input);
    if (!this.steps || !this.steps.length) throw new Error('Engine produced no steps');
    this.mount();
    this.seek(0);
  }

  getSteps(): Step<S>[] {
    return this.steps;
  }

  getCurrentIndex(): number {
    return this.index;
  }

  getView(): number {
    return this.currentView;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  onStepChange(fn: (index: number, step: Step<S>) => void): () => void {
    this.onStepListeners.push(fn);
    return () => {
      this.onStepListeners = this.onStepListeners.filter(l => l !== fn);
    };
  }

  onPlayStateChange(fn: (isPlaying: boolean) => void): () => void {
    this.onPlayStateListeners.push(fn);
    return () => {
      this.onPlayStateListeners = this.onPlayStateListeners.filter(l => l !== fn);
    };
  }

  /**
   * Fires when the step array is replaced — a playground control changed an
   * input and the timeline was recomputed. Transport UI resyncs from here
   * instead of each lesson reaching into the DOM for the scrubber.
   */
  onStepsRebuilt(fn: () => void): () => void {
    this.onStepsRebuiltListeners.push(fn);
    return () => {
      this.onStepsRebuiltListeners = this.onStepsRebuiltListeners.filter(l => l !== fn);
    };
  }

  /** Replace the timeline and tell every observer. Use this, never `this.steps = …`. */
  protected setSteps(steps: Step<S>[]): void {
    if (this.disposed) return;
    this.steps = steps;
    for (const fn of this.onStepsRebuiltListeners) {
      fn();
    }
  }

  onViewChange(fn: (view: number) => void): () => void {
    this.onViewListeners.push(fn);
    return () => {
      this.onViewListeners = this.onViewListeners.filter(l => l !== fn);
    };
  }

  private notifyStep(): void {
    const currentStep = this.steps[this.index];
    for (const fn of this.onStepListeners) {
      fn(this.index, currentStep);
    }
  }

  private notifyPlayState(isPlaying: boolean): void {
    for (const fn of this.onPlayStateListeners) {
      fn(isPlaying);
    }
  }

  private notifyView(v: number): void {
    for (const fn of this.onViewListeners) {
      fn(v);
    }
  }

  /**
   * Snapshot the tweenable geometry of every element that carries an `id`,
   * keyed by that id. Text children live on the same keyed `<g>` as the rect
   * (per-engine convention), so `<g>` elements snapshot their first child's
   * rect/line/circle geometry too: that is what lets a bar's x/width tween
   * while its label rides along under the same id.
   */
  private snapshotStepGeometry(): Map<string, StepGeometryEntry> {
    const out = new Map<string, StepGeometryEntry>();
    const root = this.container.querySelector('svg');
    if (!root) return out;
    const els = root.querySelectorAll('[id]');
    els.forEach((el) => {
      const id = el.getAttribute('id');
      if (!id || out.has(id)) return;
      // The tween target is the element that actually CARRIES the geometry:
      // for a `<g>` whose rect/line/circle child holds x/width, that child —
      // tweening the `<g>` would set attributes it never had and move nothing.
      const geomEl = el.tagName.toLowerCase() === 'g'
        ? (el.querySelector('rect,line,circle,ellipse') ?? el)
        : el;
      const attrs: Record<string, string> = {};
      for (const name of STEP_TWEEN_ATTRS) {
        const val = geomEl.getAttribute(name);
        if (val !== null) attrs[name] = val;
      }
      const styleOpacity = (el as unknown as { style?: { opacity?: string } }).style?.opacity ?? '';
      let text: string | null = null;
      if (el.children.length === 0 && (el.textContent ?? '') !== '') {
        text = el.textContent;
      }
      out.set(id, { tag: el.tagName.toLowerCase(), attrs, styleOpacity, text });
    });
    return out;
  }

  /**
   * Tween the live DOM from the old snapshot to the state just rendered.
   * Called immediately after render() puts the NEXT step's absolute values
   * in place: for every id present in both snapshots whose attributes differ,
   * the attribute is reset to its OLD value and tweened to the NEW one on a
   * single timeline, so pause()/seek()/destroy() still kill it cleanly. Ids
   * present only in the NEW tree fade in from 0 (opacity attribute or inline
   * style, matching what render() set). Ids present only in the OLD tree are
   * already gone — render() rebuilt the tree — and are left alone. Pure
   * numeric text (counters, metrics) counts up or down instead of jumping.
   * Geometry matters more than numbers: a counter that proves fiddly is
   * left to snap with its step.
   */
  private tweenStepGeometry(oldSnap: Map<string, StepGeometryEntry>, duration: number): void {
    const root = this.container.querySelector('svg');
    if (!root) return;

    type TweenTarget = Record<string, string | number>;
    const tweens: Array<{ el: Element; props: TweenTarget }> = [];
    const counters: Array<{ el: Element; from: number; to: number; decimals: number }> = [];

    oldSnap.forEach((oldEntry, id) => {
      const holder = root.querySelector(`[id="${CSS.escape(id)}"]`);
      if (!holder) return;
      const live = holder.tagName.toLowerCase() === 'g'
        ? (holder.querySelector('rect,line,circle,ellipse') ?? holder)
        : holder;
      for (const [name, oldVal] of Object.entries(oldEntry.attrs)) {
        const newVal = live.getAttribute(name);
        if (newVal === null || newVal === oldVal || name === 'transform') continue;
        const oldNum = parsePureNumber(oldVal);
        const newNum = parsePureNumber(newVal);
        if (oldNum === null || newNum === null) {
          live.setAttribute(name, newVal);
          continue;
        }
        live.setAttribute(name, oldVal);
        let target = tweens.find((t) => t.el === live);
        if (!target) {
          target = { el: live, props: {} };
          tweens.push(target);
        }
        target.props[name] = newNum;
      }
      if (oldEntry.styleOpacity !== '' && (live as unknown as { style?: { opacity?: string } }).style) {
        const liveStyle = (live as unknown as { style: { opacity: string } }).style;
        const newOpacity = liveStyle.opacity;
        if (newOpacity !== oldEntry.styleOpacity) {
          const oldNum = parseFloat(oldEntry.styleOpacity);
          const newNum = parseFloat(newOpacity);
          if (Number.isFinite(oldNum) && Number.isFinite(newNum)) {
            liveStyle.opacity = oldEntry.styleOpacity;
            let target = tweens.find((t) => t.el === (liveStyle as unknown as Element));
            if (!target) {
              target = { el: liveStyle as unknown as Element, props: {} };
              tweens.push(target);
            }
            target.props['opacity'] = newNum;
          }
        }
      }
      if (oldEntry.text !== null && live.children.length === 0 && live.textContent !== null) {
        const newText = live.textContent;
        if (newText !== oldEntry.text) {
          const oldNum = parsePureNumber(oldEntry.text);
          const newNum = parsePureNumber(newText);
          if (oldNum !== null && newNum !== null && Math.abs(newNum - oldNum) < 1e9) {
            const decimals = Math.max(decimalPlaces(oldEntry.text), decimalPlaces(newText));
            live.textContent = oldEntry.text;
            counters.push({ el: live, from: oldNum, to: newNum, decimals });
          }
        }
      }
    });

    root.querySelectorAll('[id]').forEach((el) => {
      const id = el.getAttribute('id');
      if (id === null || oldSnap.has(id as string)) return;
      const rect = el.tagName.toLowerCase() === 'g'
        ? el.querySelector('rect,line,circle,ellipse')
        : null;
      const geomEl = rect ?? el;
      if (geomEl.getAttribute('opacity') !== null) {
        const end = parsePureNumber(geomEl.getAttribute('opacity') as string) ?? 1;
        geomEl.setAttribute('opacity', '0');
        tweens.push({ el: geomEl, props: { opacity: end } });
      } else {
        const style = (el as unknown as { style?: { opacity?: string } }).style;
        if (style && typeof style.opacity === 'string' && style.opacity !== '') {
          const end = parseFloat(style.opacity);
          if (Number.isFinite(end)) {
            style.opacity = '0';
            tweens.push({ el: style as unknown as Element, props: { opacity: end } });
          }
        }
      }
    });

    if (tweens.length === 0 && counters.length === 0) return;

    this.timeline?.kill();
    const tl = gsap.timeline();
    this.timeline = tl;
    for (const { el, props } of tweens) {
      const { opacity, ...attrs } = props;
      if (Object.keys(attrs).length > 0) {
        tl.to(el as unknown as gsap.TweenTarget, { attr: { ...attrs }, duration, ease: 'power1.inOut' }, 0);
      }
      if (opacity !== undefined) {
        tl.to(el as unknown as gsap.TweenTarget, { opacity, duration, ease: 'power1.inOut' }, 0);
      }
    }
    for (const { el, from, to, decimals } of counters) {
      const state = { v: from };
      tl.to(state, {
        v: to,
        duration,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (this.disposed) return;
          el.textContent = formatCounted(state.v, decimals);
        }
      }, 0);
    }
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== null) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  setView(view: number): void {
    if (this.disposed) return;
    this.viewTween?.kill();
    this.viewTween = null;
    this.currentView = Math.max(0, Math.min(1, view));
    if (this.steps.length > 0 && this.index < this.steps.length) {
      this.render(this.steps[this.index].state, this.currentView);
    }
    this.notifyView(this.currentView);
  }

  morphView(targetView: number, duration = 0.8): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const target = Math.max(0, Math.min(1, targetView));
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.setView(target);
      return Promise.resolve();
    }

    this.viewTween?.kill();
    return new Promise<void>((resolve) => {
      const tweenState = { v: this.currentView };
      this.viewTween = gsap.to(tweenState, {
        v: target,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (this.disposed) return;
          this.currentView = tweenState.v;
          if (this.steps.length > 0 && this.index < this.steps.length) {
            this.render(this.steps[this.index].state, this.currentView);
          }
          this.notifyView(this.currentView);
        },
        onComplete: () => {
          this.viewTween = null;
          if (!this.disposed) {
            this.currentView = target;
            if (this.steps.length > 0 && this.index < this.steps.length) {
              this.render(this.steps[this.index].state, this.currentView);
            }
            this.notifyView(this.currentView);
          }
          resolve();
        }
      });
    });
  }

  seek(i: number): void {
    if (this.disposed) return;
    this.playing = false;
    this.clearAdvanceTimer();
    // progress(1) first so attribute tweens land on exact end values before
    // the kill — then render() re-applies the target absolute state (§4A.2).
    if (this.timeline) {
      (this.timeline as unknown as { progress: (v: number) => void }).progress(1);
      this.timeline.kill();
      this.timeline = null;
    }
    this.index = Math.max(0, Math.min(i, this.steps.length - 1));
    this.render(this.steps[this.index].state, this.currentView);
    this.notifyStep();
    this.notifyPlayState(false);
  }

  stepForward(): void {
    if (this.disposed) return;
    if (this.index < this.steps.length - 1) {
      this.seek(this.index + 1);
    }
  }

  stepBack(): void {
    if (this.disposed) return;
    if (this.index > 0) {
      this.seek(this.index - 1);
    }
  }

  play(): void {
    if (this.disposed) return;
    if (this.index >= this.steps.length - 1) {
      this.seek(0);
    }
    this.playing = true;
    this.notifyPlayState(true);
    this.playNext();
  }

  private playNext(): void {
    if (this.disposed || !this.playing) return;
    if (this.index >= this.steps.length - 1) {
      this.playing = false;
      this.notifyPlayState(false);
      return;
    }

    const nextIdx = this.index + 1;
    const currentStep = this.steps[this.index];
    const nextStep = this.steps[nextIdx];
    // SPEC §4A.5 pace (0.6–1.2 s per beat, learner-controlled anyway).
    // Density rises are absorbed by the tween itself — every transition is now
    // motion, not a hold-then-cut — so no per-step scaling is applied: a dense
    // timeline simply plays longer, which is what its events earn.
    const rawGap = nextStep.t - currentStep.t || 1.0;
    const stepDuration = Math.max(0.6, Math.min(1.2, rawGap));

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.clearAdvanceTimer();
      this.advanceTimer = setTimeout(() => {
        this.advanceTimer = null;
        if (this.disposed || !this.playing) return;
        this.index = nextIdx;
        this.render(this.steps[this.index].state, this.currentView);
        this.notifyStep();
        if (this.playing && this.index < this.steps.length - 1) {
          this.playNext();
        } else {
          this.playing = false;
          this.notifyPlayState(false);
        }
      }, stepDuration * 1000);
      return;
    }

    this.timeline?.kill();
    this.timeline = null;

    const oldSnap = this.snapshotStepGeometry();
    // NOTE: index still advances only in onComplete (unchanged lifecycle).
    // The DOM below already shows the next step's absolute end state; the
    // completion handler re-renders it (idempotent) to snap exact values.
    this.render(this.steps[nextIdx].state, this.currentView);
    this.tweenStepGeometry(oldSnap, stepDuration);
    if (!this.timeline) {
      this.timeline = gsap.timeline({
        onComplete: () => {
          if (this.disposed || !this.playing) return;
          this.timeline = null;
          this.index = nextIdx;
          this.render(this.steps[this.index].state, this.currentView);
          this.notifyStep();
          if (this.playing && this.index < this.steps.length - 1) {
            this.playNext();
          } else {
            this.playing = false;
            this.notifyPlayState(false);
          }
        }
      });
      this.timeline.to({}, { duration: stepDuration });
    } else {
      (this.timeline as unknown as { eventCallback: (name: string, fn: () => void) => void }).eventCallback('onComplete', () => {
        if (this.disposed || !this.playing) return;
        this.timeline = null;
        this.index = nextIdx;
        this.render(this.steps[this.index].state, this.currentView);
        this.notifyStep();
        if (this.playing && this.index < this.steps.length - 1) {
          this.playNext();
        } else {
          this.playing = false;
          this.notifyPlayState(false);
        }
      });
    }
  }

  pause(): void {
    if (this.disposed) return;
    this.playing = false;
    this.clearAdvanceTimer();
    // The tween already shows the NEXT step's end state in the DOM while
    // index still points at the current one: pausing KEEPS the step (it must
    // not skip ahead), so re-render the current step's absolute state to
    // restore it exactly, then drop the tween (§4A.2).
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    if (this.steps.length > 0 && this.index < this.steps.length) {
      this.render(this.steps[this.index].state, this.currentView);
    }
    this.notifyPlayState(false);
  }

  destroy(): void {
    this.playing = false;
    this.clearAdvanceTimer();
    if (this.timeline) {
      (this.timeline as unknown as { progress: (v: number) => void }).progress(1);
      this.timeline.kill();
      this.timeline = null;
    }
    this.viewTween?.kill();
    this.viewTween = null;
    this.container.replaceChildren();
    this.onStepListeners = [];
    this.onPlayStateListeners = [];
    this.onViewListeners = [];
    this.onStepsRebuiltListeners = [];
    this.disposed = true;
  }
}
