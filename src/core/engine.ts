import gsap from 'gsap';
import type { Step } from './types.js';

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
    this.timeline?.kill();
    this.timeline = null;
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
    const stepDuration = Math.max(0.6, Math.min(1.5, nextStep.t - currentStep.t || 1.0));

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
    this.timeline = gsap.timeline({
      onComplete: () => {
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
      }
    });

    this.timeline.to({}, { duration: stepDuration });
  }

  pause(): void {
    if (this.disposed) return;
    this.playing = false;
    this.clearAdvanceTimer();
    this.timeline?.kill();
    this.timeline = null;
    this.notifyPlayState(false);
  }

  destroy(): void {
    this.playing = false;
    this.clearAdvanceTimer();
    this.timeline?.kill();
    this.timeline = null;
    this.viewTween?.kill();
    this.viewTween = null;
    this.container.replaceChildren();
    this.onStepListeners = [];
    this.onPlayStateListeners = [];
    this.onViewListeners = [];
    this.disposed = true;
  }
}
