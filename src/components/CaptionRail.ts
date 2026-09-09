import type { Step } from '../core/types.js';

export class CaptionRail {
  private container: HTMLElement;
  private stepElements: HTMLElement[] = [];
  private onSeek: (index: number) => void;

  constructor(parent: HTMLElement, onSeek: (index: number) => void) {
    this.container = document.createElement('div');
    this.container.className = 'caption-rail';
    this.container.setAttribute('aria-label', 'Timeline captions');
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = 'var(--step)';
    this.container.style.overflowY = 'auto';
    this.container.style.maxHeight = '420px';
    this.onSeek = onSeek;
    parent.appendChild(this.container);
  }

  setSteps(steps: Step<unknown>[]): void {
    this.container.replaceChildren();
    this.stepElements = [];

    steps.forEach((step, idx) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'caption-item';
      item.setAttribute('data-step-index', String(idx));
      item.style.textAlign = 'left';
      item.style.padding = 'calc(var(--step) * 1.5)';
      item.style.borderRadius = '6px';
      item.style.border = '1px solid var(--rule)';
      item.style.background = 'var(--surface)';
      item.style.color = 'var(--ink)';
      item.style.cursor = 'pointer';
      item.style.transition = 'border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)';

      const timeSpan = document.createElement('span');
      timeSpan.style.display = 'inline-block';
      timeSpan.style.fontFamily = 'var(--font-mono)';
      timeSpan.style.fontSize = '0.8rem';
      timeSpan.style.color = 'var(--muted)';
      timeSpan.style.marginRight = 'var(--step)';
      timeSpan.textContent = `[${step.t.toFixed(1)}s]`;

      const textSpan = document.createElement('span');
      textSpan.style.fontSize = '0.9rem';
      textSpan.textContent = step.caption;

      item.append(timeSpan, textSpan);
      item.addEventListener('click', () => {
        this.onSeek(idx);
      });

      this.container.appendChild(item);
      this.stepElements.push(item);
    });
  }

  setActiveIndex(activeIndex: number): void {
    this.stepElements.forEach((el, idx) => {
      if (idx === activeIndex) {
        el.style.borderColor = 'var(--accent)';
        el.style.background = 'var(--surface-alt)';
        el.setAttribute('aria-current', 'step');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.style.borderColor = 'var(--rule)';
        el.style.background = 'var(--surface)';
        el.removeAttribute('aria-current');
      }
    });
  }

  destroy(): void {
    this.container.replaceChildren();
    this.container.remove();
    this.stepElements = [];
  }
}
