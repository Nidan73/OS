import { fcfs, type Process } from '../algorithms/scheduling.js';

/**
 * Renders the reference page for Lecture 6: Scheduling Criteria.
 *
 * Topic: Scheduling Criteria. The Five Metrics & Optimization Criteria.
 * Follows full density standards from DESIGN.md: generous typography,
 * alternating section surfaces, 80px vertical rhythm, and pure-algorithm backing.
 */
export function renderLecture06Reference(): HTMLElement {
  // Pure algorithm computation for the worked reference example (Slide 8 process set)
  const canonicalProcesses: Process[] = [
    { id: 'P1', arrival: 0, burst: 24 },
    { id: 'P2', arrival: 0, burst: 3 },
    { id: 'P3', arrival: 0, burst: 3 }
  ];

  const schedule = fcfs(canonicalProcesses);
  const totalBurst = canonicalProcesses.reduce((acc, p) => acc + p.burst, 0);
  const cpuUtilization = schedule.totalTime > 0 ? (totalBurst / schedule.totalTime) * 100 : 0;
  const throughput = schedule.totalTime > 0 ? canonicalProcesses.length / schedule.totalTime : 0;

  // SVG dimensions and layout calculations for Gantt chart
  // SVG dimensions and layout calculations for Gantt chart
  const svgWidth = 840;
  const svgHeight = 295;
  const chartStartX = 55;
  const chartWidth = 720;
  const scale = schedule.totalTime > 0 ? chartWidth / schedule.totalTime : 1;

  // Build Gantt bars markup
  const barElements = schedule.bars.map((bar) => {
    const x = chartStartX + bar.start * scale;
    const width = (bar.end - bar.start) * scale;
    const midX = x + width / 2;
    const duration = bar.end - bar.start;
    const colors: Record<string, { fill: string; stroke: string }> = {
      P1: { fill: 'rgba(8, 127, 91, 0.16)', stroke: 'var(--running)' },
      P2: { fill: 'rgba(0, 102, 204, 0.16)', stroke: 'var(--accent)' },
      P3: { fill: 'rgba(162, 28, 175, 0.16)', stroke: 'var(--blocked)' }
    };
    const c = colors[bar.id] || { fill: 'var(--surface-alt)', stroke: 'var(--rule)' };

    const labelContent = width >= 90
      ? `<text x="${midX.toFixed(1)}" y="73" text-anchor="middle" dominant-baseline="central"
              fill="var(--ink)" font-family="var(--font-mono)" font-size="14" font-weight="600">
          ${bar.id} (${duration} ms)
        </text>`
      : `<text x="${midX.toFixed(1)}" y="73" text-anchor="middle" dominant-baseline="central"
              fill="var(--ink)" font-family="var(--font-mono)" font-size="13" font-weight="700">
          ${bar.id}
        </text>
        <text x="${midX.toFixed(1)}" y="40" text-anchor="middle"
              fill="var(--muted)" font-family="var(--font-mono)" font-size="11" font-weight="500">
          ${duration} ms
        </text>`;

    return `
      <g class="gantt-bar-group" data-process="${bar.id}">
        <rect x="${x.toFixed(1)}" y="50" width="${width.toFixed(1)}" height="46" rx="6"
              fill="${c.fill}" stroke="${c.stroke}" stroke-width="2" />
        ${labelContent}
      </g>
    `;
  }).join('');

  // Build timeline tick marks
  const tickTimes = [0, ...schedule.bars.map(b => b.end)];
  const tickElements = tickTimes.map((time) => {
    const x = chartStartX + time * scale;
    return `
      <g class="timeline-tick" transform="translate(${x.toFixed(1)}, 0)">
        <line x1="0" y1="96" x2="0" y2="104" stroke="var(--rule)" stroke-width="1.5" />
        <text x="0" y="120" text-anchor="middle" font-family="var(--font-mono)" font-size="13" font-weight="500" fill="var(--muted)">
          ${time}
        </text>
      </g>
    `;
  }).join('');

  // Visual breakdown rows for P1, P2, P3
  const p1 = canonicalProcesses[0];
  const p2 = canonicalProcesses[1];
  const p3 = canonicalProcesses[2];

  const p1Wait = schedule.waiting[p1.id];
  const p1Tat = schedule.turnaround[p1.id];

  const p2Wait = schedule.waiting[p2.id];
  const p3Wait = schedule.waiting[p3.id];

  const root = document.createElement('main');
  root.className = 'reference-page';

  root.innerHTML = `
    <style>
      .reference-page {
        width: 100%;
        color: var(--ink);
        background-color: var(--ground);
        font-family: var(--font-ui);
        font-size: 17px;
        line-height: 1.47;
        letter-spacing: -0.374px;
        -webkit-font-smoothing: antialiased;
      }
      .reference-page * {
        box-sizing: border-box;
      }
      .ref-section {
        width: 100%;
        padding: calc(var(--step) * 10) calc(var(--step) * 3);
        border-bottom: 1px solid var(--divider-soft);
      }
      .ref-section.bg-surface {
        background-color: var(--surface);
      }
      .ref-section.bg-surface-alt {
        background-color: var(--surface-alt);
      }
      .ref-container {
        max-width: 980px;
        margin: 0 auto;
        width: 100%;
      }
      .ref-eyebrow {
        display: inline-block;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: calc(var(--step) * 1.5);
      }
      .ref-hero-title {
        font-family: var(--font-display);
        font-size: clamp(34px, 5vw, 48px);
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.28px;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 2);
      }
      .ref-section-title {
        font-family: var(--font-display);
        font-size: clamp(26px, 3.5vw, 34px);
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: -0.374px;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 1.5);
      }
      .ref-lead {
        font-size: 19px;
        line-height: 1.5;
        color: var(--ink-2);
        margin-bottom: calc(var(--step) * 3.5);
      }
      .ref-body {
        font-size: 17px;
        line-height: 1.55;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 2);
      }
      .ref-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: calc(var(--step) * 3);
        margin-top: calc(var(--step) * 3);
      }
      .ref-metric-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        padding: calc(var(--step) * 3.5);
        display: flex;
        flex-direction: column;
        gap: calc(var(--step) * 1.5);
      }
      .ref-metric-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--step);
        flex-wrap: wrap;
      }
      .ref-metric-name {
        font-family: var(--font-display);
        font-size: 21px;
        font-weight: 600;
        letter-spacing: -0.28px;
        color: var(--ink);
      }
      .ref-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: var(--rounded-pill);
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .ref-badge-max {
        background: rgba(8, 127, 91, 0.12);
        color: var(--running);
      }
      .ref-badge-min {
        background: rgba(217, 119, 6, 0.12);
        color: var(--waiting);
      }
      .ref-badge-food {
        background: rgba(217, 119, 6, 0.12);
        color: var(--food);
      }
      .ref-analogy-quote {
        background: rgba(217, 119, 6, 0.07);
        border-left: 3px solid var(--food);
        border-radius: 0 var(--rounded-sm) var(--rounded-sm) 0;
        padding: calc(var(--step) * 1.5) calc(var(--step) * 2);
        font-size: 15px;
        line-height: 1.45;
        color: var(--ink-2);
        margin-top: auto;
      }
      .ref-analogy-quote strong {
        color: var(--ink);
      }
      .ref-callout-box {
        background: var(--canvas-parchment);
        border-left: 3px solid var(--accent);
        border-radius: 0 var(--rounded-sm) var(--rounded-sm) 0;
        padding: calc(var(--step) * 2.5) calc(var(--step) * 3);
        margin: calc(var(--step) * 3) 0;
        font-size: 16px;
        line-height: 1.5;
      }
      .ref-table-wrapper {
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--rule);
        border-radius: var(--rounded-lg);
        background: var(--surface);
        margin: calc(var(--step) * 3) 0;
      }
      .ref-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 15px;
        text-align: left;
        min-width: 620px;
      }
      .ref-table th, .ref-table td {
        padding: calc(var(--step) * 1.5) calc(var(--step) * 2);
        border-bottom: 1px solid var(--divider-soft);
      }
      .ref-table th {
        background: var(--surface-alt);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
      }
      .ref-table tr:last-child td {
        border-bottom: none;
      }
      .ref-table td code, .ref-table td .tabular {
        font-family: var(--font-mono);
        font-variant-numeric: tabular-nums;
        font-weight: 500;
      }
      .ref-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: calc(var(--step) * 2);
        margin-top: calc(var(--step) * 3);
      }
      .ref-stat-card {
        background: var(--surface-alt);
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-md);
        padding: calc(var(--step) * 2.5);
        text-align: center;
      }
      .ref-stat-val {
        font-family: var(--font-mono);
        font-size: 26px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--ink);
        line-height: 1.2;
        margin-bottom: 4px;
      }
      .ref-stat-lbl {
        font-size: 13px;
        color: var(--muted);
        font-weight: 500;
      }
      .ref-svg-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        padding: calc(var(--step) * 3);
        margin: calc(var(--step) * 3) 0;
        overflow-x: auto;
      }
      .ref-svg-card svg {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        height: auto;
      }
      .ref-tradeoff-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: calc(var(--step) * 3);
        margin-top: calc(var(--step) * 2.5);
      }
      .ref-tradeoff-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        padding: calc(var(--step) * 3.5);
      }
      .ref-tradeoff-title {
        font-family: var(--font-display);
        font-size: 20px;
        font-weight: 600;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 1.5);
      }
    </style>

    <!-- SECTION 1: HERO OVERVIEW -->
    <section class="ref-section bg-surface" id="overview">
      <div class="ref-container">
        <span class="ref-eyebrow">CSC 2209 · Operating Systems · Lecture 6 Reference</span>
        <h1 class="ref-hero-title">Scheduling Criteria</h1>
        <p class="ref-lead">
          When multiple tasks compete for CPU processing time, the short-term scheduler must choose which process executes next.
          Operating systems evaluate and compare scheduling algorithms across five foundational criteria: CPU Utilisation, Throughput, Turnaround Time, Waiting Time, and Response Time.
        </p>
        <p class="ref-body">
          No single scheduling algorithm excels across every workload. Maximizing throughput for large batch computations often conflicts with providing lightning-fast response times for interactive applications. System designers balance these five metrics based on target hardware and user expectations.
        </p>
      </div>
    </section>

    <!-- SECTION 2: HOUSEHOLD & DINING ANALOGY REGISTER -->
    <section class="ref-section bg-surface-alt" id="household-analogy">
      <div class="ref-container">
        <span class="ref-eyebrow">Analogy Framework</span>
        <h2 class="ref-section-title">The Household Kitchen & Dinner Service</h2>
        <p class="ref-lead">
          To build an intuitive grasp of CPU scheduling, picture an evening family dinner in a busy household.
          The kitchen cooktop and oven represent the CPU cores, while family members placing meal orders represent incoming processes.
        </p>

        <div class="ref-card-grid">
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Stove & Oven Utilisation</span>
              <span class="ref-badge ref-badge-food">CPU Utilisation</span>
            </div>
            <p class="ref-body">
              How continuously the kitchen stove and oven are actively cooking dinner rather than sitting cold and unlit while people decide what to eat (aiming for 40%–90% utilization).
            </p>
          </div>

          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Courses Delivered</span>
              <span class="ref-badge ref-badge-food">Throughput</span>
            </div>
            <p class="ref-body">
              How many complete dinner courses or family plates are completed and delivered from the kitchen per hour.
            </p>
          </div>

          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Order to Clean Plate</span>
              <span class="ref-badge ref-badge-food">Turnaround Time</span>
            </div>
            <p class="ref-body">
              Total elapsed time from when Abbu or Arijit asks for a meal until the plate is completely finished and cleared.
            </p>
          </div>

          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Fork-in-Hand Wait</span>
              <span class="ref-badge ref-badge-food">Waiting Time</span>
            </div>
            <p class="ref-body">
              Total minutes spent sitting at the dining table with an empty fork, waiting for the dish to be prepared (excluding the time spent eating).
            </p>
          </div>

          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Appetizer Arrival</span>
              <span class="ref-badge ref-badge-food">Response Time</span>
            </div>
            <p class="ref-body">
              Time elapsed from placing the dinner order until the first cup of soup, appetizer, or warm bread is served to the table.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: THE FIVE METRICS DEEP DIVE -->
    <section class="ref-section bg-surface" id="five-metrics">
      <div class="ref-container">
        <span class="ref-eyebrow">Slide-Level Reference</span>
        <h2 class="ref-section-title">The Five Metrics in Detail</h2>
        <p class="ref-lead">
          Formal definitions, typical operational ranges, and mathematical relationships as covered in Lecture 6, slides 6–7.
        </p>

        <div class="ref-card-grid">
          <!-- Metric 1: CPU Utilisation -->
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">CPU Utilisation</span>
              <span class="ref-badge ref-badge-max">Goal: Maximize</span>
            </div>
            <p class="ref-body">
              <strong>Definition:</strong> Percentage of time the CPU is actively executing user or system processes.
            </p>
            <p class="ref-body">
              <strong>Range:</strong> 0% to 100%. In production systems, CPU utilisation generally ranges from <strong>40% (light load)</strong> to <strong>90% (heavy load)</strong>.
            </p>
            <div class="ref-analogy-quote">
              <strong>Dinner Analogy:</strong> How continuously the kitchen stove and oven are actively cooking dinner rather than sitting cold and unlit while people decide what to eat (aiming for 40%–90% utilization).
            </div>
          </div>

          <!-- Metric 2: Throughput -->
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Throughput</span>
              <span class="ref-badge ref-badge-max">Goal: Maximize</span>
            </div>
            <p class="ref-body">
              <strong>Definition:</strong> Number of processes completed per unit time.
            </p>
            <p class="ref-body">
              <strong>Scale:</strong> From 1 process/hour for long computation tasks to 10 processes/sec (or higher) for short transactional requests.
            </p>
            <div class="ref-analogy-quote">
              <strong>Dinner Analogy:</strong> How many complete dinner courses or family plates are completed and delivered from the kitchen per hour.
            </div>
          </div>

          <!-- Metric 3: Turnaround Time -->
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Turnaround Time</span>
              <span class="ref-badge ref-badge-min">Goal: Minimize</span>
            </div>
            <p class="ref-body">
              <strong>Definition:</strong> Total elapsed interval from submission of a process to completion.
            </p>
            <p class="ref-body">
              <strong>Components:</strong> Sum of ready queue waiting time + CPU execution burst + I/O execution time.
            </p>
            <div class="ref-analogy-quote">
              <strong>Dinner Analogy:</strong> Total elapsed time from when Abbu or Arijit asks for a meal until the plate is completely finished and cleared.
            </div>
          </div>

          <!-- Metric 4: Waiting Time -->
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Waiting Time</span>
              <span class="ref-badge ref-badge-min">Goal: Minimize</span>
            </div>
            <p class="ref-body">
              <strong>Definition:</strong> Sum of periods spent waiting in the ready queue.
            </p>
            <p class="ref-body">
              <strong>Critical OS Property:</strong> Scheduling algorithms do NOT affect CPU execution time or I/O time; they directly affect waiting time.
            </p>
            <div class="ref-analogy-quote">
              <strong>Dinner Analogy:</strong> Total minutes spent sitting at the dining table with an empty fork, waiting for the dish to be prepared (excluding the time spent eating).
            </div>
          </div>

          <!-- Metric 5: Response Time -->
          <div class="ref-metric-card">
            <div class="ref-metric-card-header">
              <span class="ref-metric-name">Response Time</span>
              <span class="ref-badge ref-badge-min">Goal: Minimize</span>
            </div>
            <p class="ref-body">
              <strong>Definition:</strong> Time from submission of a request until the first response is produced (time to start responding, not time to output full response).
            </p>
            <p class="ref-body">
              <strong>Context:</strong> Crucial in interactive and timesharing environments where users judge system speed by initial feedback rather than total completion.
            </p>
            <div class="ref-analogy-quote">
              <strong>Dinner Analogy:</strong> Time elapsed from placing the dinner order until the first cup of soup, appetizer, or warm bread is served to the table.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: OPTIMIZATION CRITERIA & REAL-WORLD TRADE-OFFS -->
    <section class="ref-section bg-surface-alt" id="optimization-criteria">
      <div class="ref-container">
        <span class="ref-eyebrow">Optimization Principles</span>
        <h2 class="ref-section-title">Optimization Criteria & Real-World Trade-Offs</h2>
        <p class="ref-lead">
          The overarching optimization target is straightforward: maximize CPU Utilisation and Throughput, while minimizing Turnaround Time, Waiting Time, and Response Time.
        </p>

        <div class="ref-tradeoff-grid">
          <div class="ref-tradeoff-card">
            <h3 class="ref-tradeoff-title">Average vs Extremes</h3>
            <p class="ref-body">
              While mathematical models typically optimize the average (such as minimizing average waiting time or average turnaround time), production operating systems must guarantee fair service across all users.
            </p>
            <p class="ref-body">
              In real systems, <strong>minimizing maximum response time</strong> guarantees all users get fair service and prevents individual processes from suffering catastrophic starvation.
            </p>
          </div>

          <div class="ref-tradeoff-card">
            <h3 class="ref-tradeoff-title">Predictability & Variance</h3>
            <p class="ref-body">
              In interactive desktop and mobile environments, human perception is exquisitely sensitive to jitter.
            </p>
            <p class="ref-body">
              For interactive desktop/mobile systems, <strong>low variance in response time</strong> is often prized higher than low average response time. A user prefers an interface that consistently responds within 50 milliseconds over one that usually responds in 10 milliseconds but randomly freezes for two seconds.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 5: WORKED REFERENCE EXAMPLE (SLIDE 8 PROCESS SET) -->
    <section class="ref-section bg-surface" id="worked-example">
      <div class="ref-container">
        <span class="ref-eyebrow">Dynamic Algorithm Verification</span>
        <h2 class="ref-section-title">Worked Example: First-Come, First-Served (FCFS)</h2>
        <p class="ref-lead">
          The figures below are derived dynamically by evaluating the canonical Lecture 6 slide 8 process set with the pure scheduling implementation:
        </p>

        <!-- STATIC SVG GANTT TIMELINE -->
        <div class="ref-svg-card">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" role="img" aria-label="FCFS Gantt Timeline Diagram" style="display: block; width: 100%; height: auto;">
            <!-- Background panel -->
            <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="10" fill="var(--surface-alt)" stroke="var(--hairline)" />

            <!-- Title & Duration -->
            <text x="30" y="30" font-family="var(--font-display)" font-size="14" font-weight="600" fill="var(--ink)">
              Gantt Chart Timeline (P1 = ${p1.burst} ms, P2 = ${p2.burst} ms, P3 = ${p3.burst} ms · Total Duration = ${schedule.totalTime} ms)
            </text>

            <!-- Top Gantt Bars -->
            ${barElements}

            <!-- Axis Line -->
            <line x1="${chartStartX}" y1="96" x2="${(chartStartX + chartWidth).toFixed(1)}" y2="96" stroke="var(--rule)" stroke-width="1.5" />

            <!-- Axis Ticks & Time Labels -->
            ${tickElements}

            <!-- Axis Label -->
            <text x="${(chartStartX + chartWidth + 14).toFixed(1)}" y="120" font-family="var(--font-ui)" font-size="12" fill="var(--muted)">
              ms
            </text>

            <!-- Vertical Timeline Alignment Guide Lines -->
            ${tickTimes.map(t => {
              const x = chartStartX + t * scale;
              return `<line x1="${x.toFixed(1)}" y1="130" x2="${x.toFixed(1)}" y2="280" stroke="var(--rule)" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />`;
            }).join('')}

            <!-- Section Header for Process Lifecycle Breakdown -->
            <text x="30" y="148" font-family="var(--font-display)" font-size="13" font-weight="600" fill="var(--ink)">
              Process Execution &amp; Waiting Breakdown (Aligned to Timeline)
            </text>

            <!-- Legend -->
            <g transform="translate(540, 137)">
              <rect x="0" y="0" width="12" height="12" rx="3" fill="var(--running)" />
              <text x="16" y="10" font-size="11" fill="var(--muted)" font-family="var(--font-ui)">CPU Burst</text>
              <rect x="92" y="0" width="12" height="12" rx="3" fill="rgba(217, 119, 6, 0.25)" stroke="var(--waiting)" stroke-width="1" stroke-dasharray="2 2" />
              <text x="110" y="10" font-size="11" fill="var(--muted)" font-family="var(--font-ui)">Queue Wait</text>
            </g>

            <!-- P1 Breakdown Track -->
            <g transform="translate(0, 164)">
              <text x="25" y="15" font-family="var(--font-mono)" font-size="13" font-weight="700" fill="var(--running)">P1</text>
              <rect x="${chartStartX}" y="0" width="${(p1.burst * scale).toFixed(1)}" height="22" rx="4"
                    fill="rgba(8, 127, 91, 0.2)" stroke="var(--running)" stroke-width="1.5" />
              <text x="${(chartStartX + (p1.burst * scale) / 2).toFixed(1)}" y="15" text-anchor="middle"
                    font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--running)">
                Active CPU Burst: ${p1.burst} ms (Wait: ${p1Wait} ms · Turnaround: ${p1Tat} ms)
              </text>
            </g>

            <!-- P2 Breakdown Track -->
            <g transform="translate(0, 204)">
              <text x="25" y="15" font-family="var(--font-mono)" font-size="13" font-weight="700" fill="var(--accent)">P2</text>
              <!-- Wait bar: 0 to 24 ms -->
              <rect x="${chartStartX}" y="0" width="${(p2Wait * scale).toFixed(1)}" height="22" rx="4"
                    fill="rgba(217, 119, 6, 0.12)" stroke="var(--waiting)" stroke-width="1.2" stroke-dasharray="4 3" />
              <text x="${(chartStartX + (p2Wait * scale) / 2).toFixed(1)}" y="15" text-anchor="middle"
                    font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--waiting)">
                Waiting in Ready Queue: ${p2Wait} ms (Convoy Delay)
              </text>
              <!-- Burst bar: 24 to 27 ms -->
              <rect x="${(chartStartX + p2Wait * scale).toFixed(1)}" y="0" width="${(p2.burst * scale).toFixed(1)}" height="22" rx="4"
                    fill="rgba(0, 102, 204, 0.25)" stroke="var(--accent)" stroke-width="1.5" />
              <text x="${(chartStartX + p2Wait * scale + (p2.burst * scale) / 2).toFixed(1)}" y="15" text-anchor="middle"
                    font-family="var(--font-mono)" font-size="11" font-weight="700" fill="var(--accent)">
                ${p2.burst} ms
              </text>
            </g>

            <!-- P3 Breakdown Track -->
            <g transform="translate(0, 244)">
              <text x="25" y="15" font-family="var(--font-mono)" font-size="13" font-weight="700" fill="var(--blocked)">P3</text>
              <!-- Wait bar: 0 to 27 ms -->
              <rect x="${chartStartX}" y="0" width="${(p3Wait * scale).toFixed(1)}" height="22" rx="4"
                    fill="rgba(217, 119, 6, 0.12)" stroke="var(--waiting)" stroke-width="1.2" stroke-dasharray="4 3" />
              <text x="${(chartStartX + (p3Wait * scale) / 2).toFixed(1)}" y="15" text-anchor="middle"
                    font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--waiting)">
                Waiting in Ready Queue: ${p3Wait} ms (Convoy Delay)
              </text>
              <!-- Burst bar: 27 to 30 ms -->
              <rect x="${(chartStartX + p3Wait * scale).toFixed(1)}" y="0" width="${(p3.burst * scale).toFixed(1)}" height="22" rx="4"
                    fill="rgba(162, 28, 175, 0.25)" stroke="var(--blocked)" stroke-width="1.5" />
              <text x="${(chartStartX + p3Wait * scale + (p3.burst * scale) / 2).toFixed(1)}" y="15" text-anchor="middle"
                    font-family="var(--font-mono)" font-size="11" font-weight="700" fill="var(--blocked)">
                ${p3.burst} ms
              </text>
            </g>
          </svg>
        </div>

        <!-- COMPUTED METRICS TABLE -->
        <div class="ref-table-wrapper">
          <table class="ref-table" aria-label="Computed Scheduling Metrics for Canonical Process Set">
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival Time</th>
                <th>Burst Time</th>
                <th>Start Time</th>
                <th>Completion Time</th>
                <th>Waiting Time</th>
                <th>Turnaround Time</th>
                <th>Response Time</th>
              </tr>
            </thead>
            <tbody>
              ${canonicalProcesses.map((p) => {
                const m = schedule.metrics[p.id];
                const bar = schedule.bars.find(b => b.id === p.id);
                const startTime = bar ? bar.start : 0;
                return `
                  <tr>
                    <td><strong>${p.id}</strong></td>
                    <td class="tabular">${p.arrival} ms</td>
                    <td class="tabular">${p.burst} ms</td>
                    <td class="tabular">${startTime} ms</td>
                    <td class="tabular">${m.completion} ms</td>
                    <td class="tabular"><strong>${m.waiting} ms</strong></td>
                    <td class="tabular"><strong>${m.turnaround} ms</strong></td>
                    <td class="tabular">${m.response} ms</td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: var(--surface-alt); font-weight: 600;">
                <td colspan="5"><strong>Mean / Average Values</strong></td>
                <td class="tabular" style="color: var(--waiting);"><strong>${schedule.avgWaiting.toFixed(2)} ms</strong></td>
                <td class="tabular" style="color: var(--accent);"><strong>${schedule.avgTurnaround.toFixed(2)} ms</strong></td>
                <td class="tabular"><strong>${schedule.avgResponse.toFixed(2)} ms</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- STAT KPI CARDS -->
        <div class="ref-stat-grid">
          <div class="ref-stat-card">
            <div class="ref-stat-val">${cpuUtilization.toFixed(1)}%</div>
            <div class="ref-stat-lbl">CPU Utilisation</div>
          </div>
          <div class="ref-stat-card">
            <div class="ref-stat-val">${throughput.toFixed(2)}</div>
            <div class="ref-stat-lbl">Throughput (proc/ms)</div>
          </div>
          <div class="ref-stat-card">
            <div class="ref-stat-val">${schedule.avgWaiting.toFixed(1)} ms</div>
            <div class="ref-stat-lbl">Average Waiting Time</div>
          </div>
          <div class="ref-stat-card">
            <div class="ref-stat-val">${schedule.avgTurnaround.toFixed(1)} ms</div>
            <div class="ref-stat-lbl">Average Turnaround Time</div>
          </div>
          <div class="ref-stat-card">
            <div class="ref-stat-val">${schedule.avgResponse.toFixed(1)} ms</div>
            <div class="ref-stat-lbl">Average Response Time</div>
          </div>
        </div>

        <div class="ref-callout-box">
          <strong>Key Takeaway from FCFS:</strong>
          Process P1 occupies the CPU for ${p1.burst} ms. Even though P2 and P3 have tiny bursts of only ${p2.burst} ms each, they must wait in the ready queue for ${p2Wait} ms and ${p3Wait} ms in sequence.
          This produces an average waiting time of ${schedule.avgWaiting} ms. Scheduling algorithms directly impact waiting time while leaving burst execution requirements unchanged.
        </div>
      </div>
    </section>

    <!-- SECTION 6: SUMMARY MATRIX / QUICK REFERENCE -->
    <section class="ref-section bg-surface-alt" id="summary-matrix">
      <div class="ref-container">
        <span class="ref-eyebrow">Cheat Sheet</span>
        <h2 class="ref-section-title">Scheduling Criteria Summary</h2>
        <p class="ref-lead">
          Comprehensive synthesis of definitions, optimization objectives, typical ranges, and the household dining analogy.
        </p>

        <div class="ref-table-wrapper">
          <table class="ref-table" aria-label="Scheduling Criteria Summary Cheat Sheet">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Optimization Goal</th>
                <th>Formal Definition</th>
                <th>Standard Range</th>
                <th>Household Dining Analogy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CPU Utilisation</strong></td>
                <td><span class="ref-badge ref-badge-max">Maximize ↑</span></td>
                <td>Percentage of time the CPU is actively executing processes.</td>
                <td class="tabular">40% to 90% (real systems)</td>
                <td>How continuously the kitchen stove and oven are actively cooking dinner rather than sitting cold and unlit while people decide what to eat (aiming for 40%–90% utilization).</td>
              </tr>
              <tr>
                <td><strong>Throughput</strong></td>
                <td><span class="ref-badge ref-badge-max">Maximize ↑</span></td>
                <td>Number of processes completed per unit time.</td>
                <td class="tabular">1/hr (batch) to 10/sec (transactions)</td>
                <td>How many complete dinner courses or family plates are completed and delivered from the kitchen per hour.</td>
              </tr>
              <tr>
                <td><strong>Turnaround Time</strong></td>
                <td><span class="ref-badge ref-badge-min">Minimize ↓</span></td>
                <td>Elapsed time from submission of a process to its completion.</td>
                <td class="tabular">Wait + Execution + I/O</td>
                <td>Total elapsed time from when Abbu or Arijit asks for a meal until the plate is completely finished and cleared.</td>
              </tr>
              <tr>
                <td><strong>Waiting Time</strong></td>
                <td><span class="ref-badge ref-badge-min">Minimize ↓</span></td>
                <td>Sum of periods spent waiting in the ready queue.</td>
                <td class="tabular">Directly set by scheduler</td>
                <td>Total minutes spent sitting at the dining table with an empty fork, waiting for the dish to be prepared (excluding the time spent eating).</td>
              </tr>
              <tr>
                <td><strong>Response Time</strong></td>
                <td><span class="ref-badge ref-badge-min">Minimize ↓</span></td>
                <td>Time from request submission until the first response is produced.</td>
                <td class="tabular">Time to start responding</td>
                <td>Time elapsed from placing the dinner order until the first cup of soup, appetizer, or warm bread is served to the table.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  return root;
}
