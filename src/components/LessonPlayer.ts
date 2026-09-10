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
    private morphReveals?: string,
    private morphMode?: 'morph' | 'crossfade',
    private lensLabels?: { analogy: string; mechanism: string; analogyTitle?: string; mechanismTitle?: string }
  ) {
    this.container = document.createElement('div');
    this.container.className = 'lesson-player';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = 'calc(var(--step) * 1)';
    this.container.style.width = '100%';

    // 1. Lens Switcher Header (Analogy <-> Morph <-> Mechanism)
    this.lensController = document.createElement('div');
    this.lensController.className = 'lens-controller';
    this.lensController.style.display = 'flex';
    this.lensController.style.flexDirection = 'column';
    this.lensController.style.gap = '6px';
    this.lensController.style.padding = 'calc(var(--step) * 0.9) calc(var(--step) * 1.25)';
    this.lensController.style.background = 'var(--surface)';
    this.lensController.style.border = '1px solid var(--hairline)';
    this.lensController.style.borderRadius = 'var(--rounded-lg, 18px)';

    const topControlsRow = document.createElement('div');
    topControlsRow.style.display = 'flex';
    topControlsRow.style.alignItems = 'center';
    topControlsRow.style.justifyContent = 'space-between';
    topControlsRow.style.flexWrap = 'wrap';
    topControlsRow.style.gap = 'var(--step)';

    const lensButtons = document.createElement('div');
    lensButtons.style.display = 'flex';
    lensButtons.style.alignItems = 'center';
    lensButtons.style.gap = 'var(--step)';

    const pillBtn = (text: string, title: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.title = title;
      b.style.padding = '7px 16px';
      b.style.fontSize = '0.85rem';
      b.style.fontWeight = '600';
      b.style.borderRadius = 'var(--rounded-pill, 9999px)';
      b.style.border = '1px solid var(--hairline)';
      b.style.background = 'var(--surface-alt)';
      b.style.color = 'var(--ink)';
      b.style.cursor = 'pointer';
      b.style.transition = 'all var(--dur-fast) var(--ease)';
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
    this.viewSlider.setAttribute('data-view', 'true');
    this.viewSlider.setAttribute('data-view-lens', 'true');
    this.viewSlider.setAttribute('aria-label', 'View axis blend between analogy and mechanism');
    this.viewSlider.style.width = '120px';
    this.viewSlider.style.cursor = 'pointer';

    this.viewPercentLabel = document.createElement('span');
    this.viewPercentLabel.style.fontFamily = 'var(--font-mono)';
    this.viewPercentLabel.style.fontSize = '0.85rem';
    this.viewPercentLabel.style.minWidth = '45px';
    this.viewPercentLabel.style.color = 'var(--accent)';
    this.viewPercentLabel.textContent = `${Math.round(engine.getView() * 100)}%`;

    sliderWrap.append(sliderLabel, this.viewSlider, this.viewPercentLabel);
    topControlsRow.append(lensButtons, sliderWrap);
    this.lensController.appendChild(topControlsRow);

    if (this.morphReveals) {
      const morphBanner = document.createElement('div');
      morphBanner.className = 'morph-reveals-banner';
      morphBanner.style.fontSize = '0.85rem';
      morphBanner.style.color = 'var(--muted)';
      morphBanner.style.lineHeight = '1.45';
      morphBanner.style.paddingTop = '6px';
      morphBanner.style.borderTop = '1px solid var(--hairline)';
      morphBanner.textContent = this.morphReveals;
      this.lensController.appendChild(morphBanner);
    }

    // 2. Animation Viewport
    this.animViewport = animViewport ?? document.createElement('div');
    this.animViewport.classList.add('anim-viewport');
    this.animViewport.style.background = 'var(--surface)';
    this.animViewport.style.border = '1px solid var(--hairline)';
    this.animViewport.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.animViewport.style.padding = 'calc(var(--step) * 0.9) calc(var(--step) * 1.2)';
    this.animViewport.style.boxShadow = 'none';
    this.animViewport.style.overflow = 'hidden';

    // 3. Interactive Playground (Positioned directly under canvas per §0.1)
    this.playgroundSection = document.createElement('section');
    this.playgroundSection.className = 'lesson-playground-control playground';
    this.playgroundSection.id = 'playground';
    this.playgroundSection.setAttribute('data-primary-control', 'true');
    this.playgroundSection.style.padding = 'calc(var(--step) * 0.9) calc(var(--step) * 1.2)';
    this.playgroundSection.style.background = 'var(--surface)';
    this.playgroundSection.style.border = '1px solid var(--hairline)';
    this.playgroundSection.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.playgroundSection.style.display = 'flex';
    this.playgroundSection.style.flexDirection = 'column';
    this.playgroundSection.style.gap = '8px';

    // 4. Live Scoreboard (Positioned directly with playground above the fold)
    this.scoreboardSection = document.createElement('section');
    this.scoreboardSection.className = 'lesson-scoreboard';
    this.scoreboardSection.style.padding = 'calc(var(--step) * 0.9) calc(var(--step) * 1.2)';
    this.scoreboardSection.style.background = 'var(--surface)';
    this.scoreboardSection.style.border = '1px solid var(--hairline)';
    this.scoreboardSection.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.scoreboardSection.style.display = 'flex';
    this.scoreboardSection.style.flexDirection = 'column';
    this.scoreboardSection.style.gap = '8px';

    // 5. Caption Banner
    this.captionBanner = document.createElement('div');
    this.captionBanner.className = 'caption-banner';
    this.captionBanner.style.padding = 'calc(var(--step) * 0.7) calc(var(--step) * 1.2)';
    this.captionBanner.style.background = 'var(--surface-alt)';
    this.captionBanner.style.border = '1px solid var(--hairline)';
    this.captionBanner.style.borderLeft = '4px solid var(--accent)';
    this.captionBanner.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.captionBanner.style.fontFamily = 'var(--font-ui)';
    this.captionBanner.style.fontSize = '15.5px';
    this.captionBanner.style.lineHeight = '1.4';
    this.captionBanner.style.letterSpacing = '-0.374px';
    this.captionBanner.style.color = 'var(--ink)';

    // 6. Transport Bar
    this.transportBar = document.createElement('div');
    this.transportBar.className = 'transport-bar sticky-transport';
    this.transportBar.style.display = 'flex';
    this.transportBar.style.alignItems = 'center';
    this.transportBar.style.gap = 'var(--step)';
    this.transportBar.style.padding = 'calc(var(--step) * 0.75) calc(var(--step) * 1.2)';
    this.transportBar.style.background = 'var(--surface)';
    this.transportBar.style.border = '1px solid var(--hairline)';
    this.transportBar.style.borderRadius = 'var(--rounded-lg, 18px)';
    this.transportBar.style.flexWrap = 'wrap';

    const btnStyle = (btn: HTMLButtonElement) => {
      btn.style.minWidth = '44px';
      btn.style.minHeight = '44px';
      btn.style.padding = '8px 14px';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.background = 'var(--surface-alt)';
      btn.style.border = '1px solid var(--hairline)';
      btn.style.borderRadius = 'var(--rounded-pill, 9999px)';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all var(--dur-fast) var(--ease)';
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
    this.playBtn.style.background = 'var(--accent)';
    this.playBtn.style.color = '#FFFFFF';
    this.playBtn.style.borderColor = 'var(--accent)';

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.innerHTML = '&#9654;&#9654;';
    this.nextBtn.title = 'Step Forward (Right Arrow)';
    this.nextBtn.setAttribute('aria-label', 'Next step');
    btnStyle(this.nextBtn);

    this.scrubber = document.createElement('input');
    this.scrubber.type = 'range';
    this.scrubber.min = '0';
    this.scrubber.max = String(Math.max(0, engine.getSteps().length - 1));
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

    // Compact layout: Canvas -> Interactive Grid (Playground + Scoreboard) -> Caption -> Transport (All above fold on 1440x900)
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

  private updateCaption(): void {
    const steps = this.engine.getSteps();
    const idx = this.engine.getCurrentIndex();
    const step = steps[idx];
    if (step) {
      this.captionBanner.textContent = step.caption;
    }
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
      this.viewSlider.value = String(v);
      this.viewPercentLabel.textContent = `${Math.round(v * 100)}%`;
      if (v <= 0.1) {
        this.analogyBtn.style.borderColor = 'var(--accent)';
        this.mechBtn.style.borderColor = 'var(--rule)';
      } else if (v >= 0.9) {
        this.mechBtn.style.borderColor = 'var(--accent)';
        this.analogyBtn.style.borderColor = 'var(--rule)';
      } else {
        this.analogyBtn.style.borderColor = 'var(--rule)';
        this.mechBtn.style.borderColor = 'var(--rule)';
      }
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
