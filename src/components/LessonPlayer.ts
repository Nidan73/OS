import { AnimationEngine } from '../core/engine.js';
import type { PlaygroundCapable } from '../core/types.js';
import type { Process } from '../algorithms/scheduling.js';

export class LessonPlayer {
  private container: HTMLElement;
  private animViewport: HTMLElement;
  private lensController: HTMLElement;
  private transportBar: HTMLElement;
  private playgroundSection: HTMLElement;
  private scoreboardSection: HTMLElement;
  private captionBanner: HTMLElement;

  private playBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  private scrubber: HTMLInputElement;
  private stepIndicator: HTMLElement;

  private viewSlider: HTMLInputElement;
  private viewPercentLabel: HTMLElement;
  private morphBtn: HTMLButtonElement;
  private analogyBtn: HTMLButtonElement;
  private mechBtn: HTMLButtonElement;

  private unsubscribeStep: (() => void) | null = null;
  private unsubscribePlayState: (() => void) | null = null;
  private unsubscribeView: (() => void) | null = null;
  private unsubscribeStepsRebuilt: (() => void) | null = null;
  private keydownHandler!: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    private engine: AnimationEngine<unknown, unknown> & PlaygroundCapable,
    animViewport?: HTMLElement,
    private morphMode?: 'morph' | 'crossfade',
    private lensLabels?: { analogy: string; mechanism: string; analogyTitle?: string; mechanismTitle?: string }
  ) {
    // The player owns structure and behavior only; every visual decision
    // lives in the shell classes in base.css so all 24 lessons stay coherent.
    this.container = document.createElement('div');
    this.container.className = 'lesson-player';

    // 1. Lens Switcher Header (Analogy <-> Morph <-> Mechanism)
    this.lensController = document.createElement('div');
    this.lensController.className = 'lens-controller';

    const topControlsRow = document.createElement('div');
    topControlsRow.style.display = 'contents';
    this.lensController.appendChild(topControlsRow);

    const lensButtons = document.createElement('div');
    lensButtons.className = 'lens-buttons';

    const pillBtn = (text: string, title: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.title = title;
      b.className = 'pill-btn';
      return b;
    };

    this.analogyBtn = pillBtn('🏠 Family Analogy', 'View as the family scene');
    this.morphBtn = pillBtn('⟷ Morph View', 'Smoothly animate between analogy and mechanism');
    this.mechBtn = pillBtn('📊 OS Mechanism', 'View as the OS mechanism');

    // Lessons relabel the lenses through data, never by reaching into the DOM.
    if (this.lensLabels) {
      this.analogyBtn.textContent = this.lensLabels.analogy;
      this.mechBtn.textContent = this.lensLabels.mechanism;
      if (this.lensLabels.analogyTitle) this.analogyBtn.title = this.lensLabels.analogyTitle;
      if (this.lensLabels.mechanismTitle) this.mechBtn.title = this.lensLabels.mechanismTitle;
    }

    lensButtons.append(this.analogyBtn, this.morphBtn, this.mechBtn);

    const sliderWrap = document.createElement('div');
    sliderWrap.style.display = 'flex';
    sliderWrap.style.alignItems = 'center';
    sliderWrap.style.gap = 'var(--step)';

    const sliderLabel = document.createElement('span');
    sliderLabel.style.fontSize = '0.85rem';
    sliderLabel.style.color = 'var(--muted)';
    sliderLabel.textContent = 'View Lens:';

    this.viewSlider = document.createElement('input');
    this.viewSlider.type = 'range';
    this.viewSlider.min = '0';
    this.viewSlider.max = '1';
    this.viewSlider.step = '0.01';
    this.viewSlider.value = String(engine.getView());
    this.viewSlider.id = 'view-lens';
    this.viewSlider.className = 'view-slider';
    this.viewSlider.setAttribute('data-view', 'true');
    this.viewSlider.setAttribute('data-view-lens', 'true');
    this.viewSlider.setAttribute('aria-label', 'View axis blend between analogy and mechanism');

    this.viewPercentLabel = document.createElement('span');
    this.viewPercentLabel.className = 'view-percent';
    this.viewPercentLabel.textContent = `${Math.round(engine.getView() * 100)}%`;

    sliderWrap.append(sliderLabel, this.viewSlider, this.viewPercentLabel);
    topControlsRow.append(lensButtons, sliderWrap);

    // 2. Animation Viewport
    this.animViewport = animViewport ?? document.createElement('div');
    this.animViewport.classList.add('anim-viewport');

    // 3. Interactive Playground (Positioned directly under canvas per §0.1)
    this.playgroundSection = document.createElement('section');
    this.playgroundSection.className = 'lesson-playground-control playground playground-panel';
    this.playgroundSection.id = 'playground';
    this.playgroundSection.setAttribute('data-primary-control', 'true');

    // 4. Live Scoreboard (Positioned directly with playground above the fold)
    this.scoreboardSection = document.createElement('section');
    this.scoreboardSection.className = 'lesson-scoreboard scoreboard-panel';

    // 5. Caption Banner
    this.captionBanner = document.createElement('div');
    this.captionBanner.className = 'caption-banner';

    // 6. Transport Bar
    this.transportBar = document.createElement('div');
    this.transportBar.className = 'transport-bar sticky-transport';

    const mkBtn = (html: string, title: string, label: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = html;
      b.title = title;
      b.setAttribute('aria-label', label);
      b.className = 'transport-btn';
      return b;
    };

    this.restartBtn = mkBtn('&#8634;', 'Restart (Home)', 'Restart timeline');
    this.prevBtn = mkBtn('&#9664;', 'Step Back (Left Arrow)', 'Previous step');
    this.playBtn = mkBtn('&#9654;', 'Play / Pause (Space)', 'Play or pause timeline');
    this.playBtn.classList.add('primary');
    this.nextBtn = mkBtn('&#9654;&#9654;', 'Step Forward (Right Arrow)', 'Next step');

    this.scrubber = document.createElement('input');
    this.scrubber.type = 'range';
    this.scrubber.min = '0';
    this.scrubber.max = String(Math.max(0, engine.getSteps().length - 1));
    this.scrubber.value = '0';
    this.scrubber.className = 'scrubber';
    this.scrubber.setAttribute('aria-label', 'Timeline scrubber');

    this.stepIndicator = document.createElement('span');
    this.stepIndicator.className = 'step-indicator';
    this.stepIndicator.textContent = `1 / ${engine.getSteps().length}`;

    this.transportBar.append(
      this.restartBtn,
      this.prevBtn,
      this.playBtn,
      this.nextBtn,
      this.scrubber,
      this.stepIndicator
    );

    this.renderPlaygroundAndScoreboard();

    const interactiveGrid = document.createElement('div');
    interactiveGrid.className = 'lesson-interactive-grid';
    interactiveGrid.append(this.playgroundSection, this.scoreboardSection);

    // Compact layout: Canvas -> Interactive Grid (Playground + Scoreboard) -> Caption -> Transport
    this.container.append(
      this.lensController,
      this.animViewport,
      interactiveGrid,
      this.captionBanner,
      this.transportBar
    );
    parent.appendChild(this.container);

    this.setupEventListeners();
    this.updateCaption();

    if (typeof window !== 'undefined') {
      (window as any).__lesson = {
        setView: (v: number) => this.setView(v),
        getView: () => this.engine.getView(),
        getProcesses: () => this.engine.getProcesses?.() ?? [],
        ...(this.engine.debugHooks?.() ?? {}),
        reorderTo: (procs: Process[]) => this.reorderTo(procs),
        morphMode: this.morphMode ?? 'morph',
        engine: this.engine
      };
    }
  }

  public setView(v: number): void {
    this.viewSlider.value = String(v);
    this.viewPercentLabel.textContent = `${Math.round(v * 100)}%`;
    this.engine.setView(v);
  }

  private renderPlaygroundAndScoreboard(): void {
    if (this.engine.renderPlayground) {
      this.engine.renderPlayground(this.playgroundSection, this.scoreboardSection);
      return;
    }
    const processes: Process[] = this.engine.getProcesses?.() ?? [];
    const schedule = this.engine.getScheduleResult?.() ?? null;
    if (!schedule) {
      this.playgroundSection.innerHTML = `
        <div style="font-size: 0.92rem; font-weight: 600; color: var(--ink);">Interactive Controls</div>
        <div style="font-size: 0.82rem; color: var(--muted); margin-top: 4px;">Use the view lens slider and transport controls above to inspect the execution frames.</div>
      `;
      this.scoreboardSection.innerHTML = `
        <div style="font-size: 0.92rem; font-weight: 600; color: var(--ink);">Live Status</div>
        <div style="font-size: 0.82rem; color: var(--muted); margin-top: 4px;">Simulation active. Step through to follow state transitions.</div>
      `;
      return;
    }

    // Render Playground controls
    this.playgroundSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Interactive Playground</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button id="btn-convoy-preset" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--waiting); color: var(--waiting); cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            🔴 Convoy Order (P1 → P2 → P3)
          </button>
          <button id="btn-optimal-preset" type="button" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 600; border-radius: var(--rounded-pill, 9999px); background: var(--surface-alt); border: 1px solid var(--running); color: var(--running); cursor: pointer; transition: all var(--dur-fast) var(--ease);">
            🟢 Optimal Order (P2 → P3 → P1)
          </button>
        </div>
      </div>
      <div id="queue-order-strip" style="display: flex; gap: 6px; margin-top: 4px;">
        ${processes.map((p, idx) => `
          <div class="process-order-card" data-proc="${p.id}" style="flex: 1; min-width: 80px; padding: 4px 6px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px); display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.9rem; color: var(--accent);">${p.id}</span>
              <span style="font-size: 0.7rem; padding: 1px 4px; border-radius: var(--rounded-pill, 9999px); background: var(--surface); border: 1px solid var(--hairline); font-family: var(--font-mono); font-weight: 600;">${p.burst}ms</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${p.burst >= 20 ? '🍽️ Full plate' : '🥗 Side dish'} (${p.burst}m)
            </div>
            <div style="display: flex; gap: 4px; margin-top: 2px;">
              <button type="button" class="btn-move-left" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding: 2px 4px; border: 1px solid var(--hairline); border-radius: var(--rounded-pill, 9999px); background: var(--surface); font-size: 0.72rem; font-weight: 600;">
                &larr; Left
              </button>
              <button type="button" class="btn-move-right" data-idx="${idx}" ${idx === processes.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding: 2px 4px; border: 1px solid var(--hairline); border-radius: var(--rounded-pill, 9999px); background: var(--surface); font-size: 0.72rem; font-weight: 600;">
                Right &rarr;
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Render Scoreboard
    const isOptimal = schedule.avgWaiting <= 3;
    this.scoreboardSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <div>
          <h3 style="font-size: 0.92rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: var(--ink);">Live Scoreboard</h3>
        </div>
        <div style="padding: 2px 8px; border-radius: var(--rounded-pill, 9999px); font-weight: 600; font-size: 0.72rem; ${isOptimal ? 'background: rgba(8, 127, 91, 0.12); color: var(--running); border: 1px solid var(--running);' : 'background: rgba(217, 119, 6, 0.12); color: var(--waiting); border: 1px solid var(--waiting);'}">
          ${isOptimal ? '⚡ Convoy Reversed: 82% Wait Reduction!' : '⚠️ Convoy Effect Active'}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 6px;">
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Avg Waiting</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: ${isOptimal ? 'var(--running)' : 'var(--waiting)'}; margin: 2px 0;">
            ${schedule.avgWaiting} ms
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${isOptimal ? '(0+3+6)/3 = 3 ms' : '(0+24+27)/3 = 17 ms'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Turnaround</div>
          <div style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.374px; color: var(--ink); margin: 2px 0;">
            ${schedule.avgTurnaround} ms
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--font-mono);">${isOptimal ? '(3+6+30)/3 = 13 ms' : '(24+27+30)/3 = 27 ms'}</div>
        </div>
        <div style="padding: 6px 8px; background: var(--canvas-parchment, #f5f5f7); border: 1px solid var(--hairline); border-radius: var(--rounded-lg, 18px);">
          <div style="font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Breakdown</div>
          <div style="font-family: var(--font-mono); font-size: 0.75rem; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
            ${processes.map(p => `
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600;">${p.id}:</span>
                <span style="color: var(--waiting); font-weight: 600;">wait ${schedule.metrics[p.id]?.waiting ?? 0} ms</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Hook up buttons in playground
    const convoyBtn = this.playgroundSection.querySelector('#btn-convoy-preset');
    convoyBtn?.addEventListener('click', () => {
      this.reorderTo([
        { id: 'P1', arrival: 0, burst: 24 },
        { id: 'P2', arrival: 0, burst: 3 },
        { id: 'P3', arrival: 0, burst: 3 }
      ]);
    });

    const optimalBtn = this.playgroundSection.querySelector('#btn-optimal-preset');
    optimalBtn?.addEventListener('click', () => {
      this.reorderTo([
        { id: 'P2', arrival: 0, burst: 3 },
        { id: 'P3', arrival: 0, burst: 3 },
        { id: 'P1', arrival: 0, burst: 24 }
      ]);
    });

    const leftButtons = this.playgroundSection.querySelectorAll('.btn-move-left');
    leftButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-idx'));
        if (idx > 0) {
          const currentProcs: Process[] = this.engine.getProcesses?.() ?? [];
          const temp = currentProcs[idx];
          currentProcs[idx] = currentProcs[idx - 1];
          currentProcs[idx - 1] = temp;
          this.reorderTo(currentProcs);
        }
      });
    });

    const rightButtons = this.playgroundSection.querySelectorAll('.btn-move-right');
    rightButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-idx'));
        const currentProcs: Process[] = this.engine.getProcesses?.() ?? [];
        if (idx < currentProcs.length - 1) {
          const temp = currentProcs[idx];
          currentProcs[idx] = currentProcs[idx + 1];
          currentProcs[idx + 1] = temp;
          this.reorderTo(currentProcs);
        }
      });
    });
  }

  private reorderTo(newProcs: Process[]): void {
    this.engine.reorderProcesses?.(newProcs);
    this.scrubber.max = String(Math.max(0, this.engine.getSteps().length - 1));
    this.scrubber.value = '0';
    this.stepIndicator.textContent = `1 / ${this.engine.getSteps().length}`;
    this.renderPlaygroundAndScoreboard();
    this.updateCaption();
  }

  /**
   * The caption follows the lens. Below the halfway point she is looking at
   * the scene, so she reads the scene; above it she is looking at the
   * mechanism, so she reads the mechanism. Same beat, same event, two
   * vocabularies. Lessons that supply only `caption` show it in both views.
   */
  private updateCaption(): void {
    const steps = this.engine.getSteps();
    const step = steps[this.engine.getCurrentIndex()];
    if (!step) return;
    const analogy = step.analogyCaption;
    this.captionBanner.textContent =
      analogy && this.engine.getView() < 0.5 ? analogy : step.caption;
  }

  private setupEventListeners(): void {
    // Playback
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

    // View Axis Controls
    this.viewSlider.addEventListener('input', () => {
      const v = Number(this.viewSlider.value);
      this.engine.setView(v);
    });

    this.analogyBtn.addEventListener('click', () => {
      this.engine.morphView(0.0);
    });

    this.mechBtn.addEventListener('click', () => {
      this.engine.morphView(1.0);
    });

    this.morphBtn.addEventListener('click', () => {
      const cur = this.engine.getView();
      const target = cur > 0.5 ? 0.0 : 1.0;
      this.engine.morphView(target);
    });

    // Engine subscriptions
    this.unsubscribeStep = this.engine.onStepChange((index) => {
      this.scrubber.value = String(index);
      this.stepIndicator.textContent = `${index + 1} / ${this.engine.getSteps().length}`;
      this.updateCaption();
    });

    this.unsubscribeStepsRebuilt = this.engine.onStepsRebuilt(() => {
      const total = this.engine.getSteps().length;
      this.scrubber.max = String(Math.max(0, total - 1));
      this.scrubber.value = String(this.engine.getCurrentIndex());
      this.stepIndicator.textContent = `${this.engine.getCurrentIndex() + 1} / ${total}`;
      this.updateCaption();
    });

    this.unsubscribePlayState = this.engine.onPlayStateChange((playing) => {
      this.playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    });

    this.unsubscribeView = this.engine.onViewChange((v) => {
      this.updateCaption();
      this.viewSlider.value = String(v);
      this.viewPercentLabel.textContent = `${Math.round(v * 100)}%`;
      this.analogyBtn.classList.toggle('active', v <= 0.1);
      this.mechBtn.classList.toggle('active', v >= 0.9);
      this.morphBtn.classList.toggle('active', v > 0.1 && v < 0.9);
    });

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

  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    if (this.unsubscribeStep) this.unsubscribeStep();
    if (this.unsubscribePlayState) this.unsubscribePlayState();
    if (this.unsubscribeView) this.unsubscribeView();
    if (this.unsubscribeStepsRebuilt) this.unsubscribeStepsRebuilt();
    this.engine.destroy();
    this.container.replaceChildren();
    this.container.remove();
  }
}
