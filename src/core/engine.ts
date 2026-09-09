import gsap from 'gsap';
import type { Step } from './types.js';

export abstract class AnimationEngine<I, S> {
  protected steps: Step<S>[] = [];
  protected timeline: gsap.core.Timeline | null = null;
  protected index = 0;
  private disposed = false;
  private onStepListeners: ((index: number, step: Step<S>) => void)[] = [];
  private onPlayStateListeners: ((isPlaying: boolean) => void)[] = [];

  constructor(protected container: HTMLElement, protected input: I = undefined as I) {}

  /** Pure. Input -> complete step list. Calls into algorithms. */
  protected abstract buildSteps(input: I): Step<S>[];
  /** Build static SVG scaffolding once. */
  protected abstract mount(): void;
  /** Absolute render of one state. MUST be idempotent (§4A.2). */
  protected abstract render(state: S): void;

  init(): void {
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

  seek(i: number): void {
    if (this.disposed) return;
    this.timeline?.kill();
    this.timeline = null;
    this.index = Math.max(0, Math.min(i, this.steps.length - 1));
    this.render(this.steps[this.index].state);
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
    this.notifyPlayState(true);
    this.playNext();
  }

  private playNext(): void {
    if (this.disposed) return;
    if (this.index >= this.steps.length - 1) {
      this.notifyPlayState(false);
      return;
    }

    const nextIdx = this.index + 1;
    const currentStep = this.steps[this.index];
    const nextStep = this.steps[nextIdx];
    const stepDuration = Math.max(0.6, Math.min(1.5, nextStep.t - currentStep.t || 1.0));

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.seek(nextIdx);
      setTimeout(() => {
        if (!this.disposed && this.timeline === null) {
          this.playNext();
        }
      }, stepDuration * 1000);
      return;
    }

    this.timeline?.kill();
    this.timeline = gsap.timeline({
      onComplete: () => {
        if (this.disposed) return;
        this.index = nextIdx;
        this.render(this.steps[this.index].state);
        this.notifyStep();
        if (this.index < this.steps.length - 1) {
          this.playNext();
        } else {
          this.notifyPlayState(false);
        }
      }
    });

    this.timeline.to({}, { duration: stepDuration });
  }

  pause(): void {
    if (this.disposed) return;
    this.timeline?.kill();
    this.timeline = null;
    this.notifyPlayState(false);
  }

  destroy(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.container.replaceChildren();
    this.onStepListeners = [];
    this.onPlayStateListeners = [];
    this.disposed = true;
  }
}
