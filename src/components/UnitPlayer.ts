import { AnimationEngine } from '../core/engine.js';
import { CaptionRail } from './CaptionRail.js';

export class UnitPlayer {
  private container: HTMLElement;
  private animViewport: HTMLElement;
  private transportBar: HTMLElement;
  private playBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  private scrubber: HTMLInputElement;
  private stepIndicator: HTMLElement;
  private captionRail: CaptionRail;
  private unsubscribeStep: (() => void) | null = null;
  private unsubscribePlayState: (() => void) | null = null;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    private engine: AnimationEngine<unknown, unknown>,
    animViewport?: HTMLElement
  ) {
    this.container = document.createElement('div');
    this.container.className = 'unit-player';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = 'calc(var(--step) * 2)';
    this.container.style.width = '100%';

    // Animation viewport
    this.animViewport = animViewport ?? document.createElement('div');
    this.animViewport.classList.add('anim-viewport');
    this.animViewport.style.background = 'var(--surface)';
    this.animViewport.style.border = '1px solid var(--rule)';
    this.animViewport.style.borderRadius = '8px';
    this.animViewport.style.padding = 'calc(var(--step) * 2)';
    this.animViewport.style.display = 'flex';
    this.animViewport.style.flexDirection = 'column';
    this.animViewport.style.justifyContent = 'center';
    this.animViewport.style.alignItems = 'center';
    this.animViewport.style.overflow = 'hidden';
    this.animViewport.style.minHeight = '320px';

    // Transport bar
    this.transportBar = document.createElement('div');
    this.transportBar.className = 'transport-bar sticky-transport';
    this.transportBar.style.display = 'flex';
    this.transportBar.style.alignItems = 'center';
    this.transportBar.style.gap = 'var(--step)';
    this.transportBar.style.padding = 'calc(var(--step) * 1.5)';
    this.transportBar.style.background = 'var(--surface)';
    this.transportBar.style.border = '1px solid var(--rule)';
    this.transportBar.style.borderRadius = '8px';
    this.transportBar.style.flexWrap = 'wrap';

    const btnStyle = (btn: HTMLButtonElement) => {
      btn.style.minWidth = '44px';
      btn.style.minHeight = '44px';
      btn.style.padding = 'var(--step)';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.background = 'var(--surface-alt)';
      btn.style.border = '1px solid var(--rule)';
      btn.style.borderRadius = '6px';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
    };

    this.restartBtn = document.createElement('button');
    this.restartBtn.type = 'button';
    this.restartBtn.innerHTML = '&#8634;';
    this.restartBtn.title = 'Restart (Home)';
    this.restartBtn.setAttribute('aria-label', 'Restart timeline');
    btnStyle(this.restartBtn);

    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.innerHTML = '&#9664;';
    this.prevBtn.title = 'Step Back (Left Arrow)';
    this.prevBtn.setAttribute('aria-label', 'Previous step');
    btnStyle(this.prevBtn);

    this.playBtn = document.createElement('button');
    this.playBtn.type = 'button';
    this.playBtn.innerHTML = '&#9654;';
    this.playBtn.title = 'Play / Pause (Space)';
    this.playBtn.setAttribute('aria-label', 'Play or pause timeline');
    btnStyle(this.playBtn);

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.innerHTML = '&#9654;&#9654;';
    this.nextBtn.title = 'Step Forward (Right Arrow)';
    this.nextBtn.setAttribute('aria-label', 'Next step');
    btnStyle(this.nextBtn);

    this.scrubber = document.createElement('input');
    this.scrubber.type = 'range';
    this.scrubber.min = '0';
    const totalSteps = engine.getSteps().length;
    this.scrubber.max = String(Math.max(0, totalSteps - 1));
    this.scrubber.value = '0';
    this.scrubber.setAttribute('aria-label', 'Timeline scrubber');
    this.scrubber.style.flex = '1';
    this.scrubber.style.minWidth = '120px';
    this.scrubber.style.height = '44px';
    this.scrubber.style.cursor = 'pointer';

    this.stepIndicator = document.createElement('span');
    this.stepIndicator.className = 'step-indicator';
    this.stepIndicator.style.fontFamily = 'var(--font-mono)';
    this.stepIndicator.style.fontSize = '0.85rem';
    this.stepIndicator.style.whiteSpace = 'nowrap';
    this.stepIndicator.style.color = 'var(--ink-2)';
    this.stepIndicator.textContent = `1 / ${totalSteps}`;

    this.transportBar.append(
      this.restartBtn,
      this.prevBtn,
      this.playBtn,
      this.nextBtn,
      this.scrubber,
      this.stepIndicator
    );

    // Caption rail
    const captionRailWrapper = document.createElement('div');
    captionRailWrapper.className = 'caption-rail-wrapper';
    this.captionRail = new CaptionRail(captionRailWrapper, (idx) => {
      this.engine.seek(idx);
    });
    this.captionRail.setSteps(this.engine.getSteps());

    this.container.append(this.animViewport, this.transportBar, captionRailWrapper);
    parent.appendChild(this.container);

    // Event listeners
    this.playBtn.addEventListener('click', () => {
      if (this.engine.isPlaying()) {
        this.engine.pause();
      } else {
        this.engine.play();
      }
    });

    this.prevBtn.addEventListener('click', () => {
      this.engine.stepBack();
    });

    this.nextBtn.addEventListener('click', () => {
      this.engine.stepForward();
    });

    this.restartBtn.addEventListener('click', () => {
      this.engine.seek(0);
    });

    this.scrubber.addEventListener('input', () => {
      this.engine.seek(Number(this.scrubber.value));
    });

    this.unsubscribeStep = this.engine.onStepChange((index) => {
      this.scrubber.value = String(index);
      this.stepIndicator.textContent = `${index + 1} / ${totalSteps}`;
      this.captionRail.setActiveIndex(index);
    });

    this.unsubscribePlayState = this.engine.onPlayStateChange((playing) => {
      this.playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    });

    // Initial state
    this.captionRail.setActiveIndex(0);

    // Keyboard controls
    this.keydownHandler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.engine.isPlaying()) {
          this.engine.pause();
        } else {
          this.engine.play();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.engine.stepBack();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.engine.stepForward();
      } else if (e.code === 'Home') {
        e.preventDefault();
        this.engine.seek(0);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  getViewport(): HTMLElement {
    return this.animViewport;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    if (this.unsubscribeStep) this.unsubscribeStep();
    if (this.unsubscribePlayState) this.unsubscribePlayState();
    this.engine.destroy();
    this.captionRail.destroy();
    this.container.replaceChildren();
    this.container.remove();
  }
}
