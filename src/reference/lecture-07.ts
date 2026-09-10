/**
 * Lecture 7 Reference Page: Thread Scheduling, POSIX API & Real-World Schedulers
 *
 * Covers:
 * 1. Process-Contention Scope (PCS) vs System-Contention Scope (SCS) (Slide 7)
 * 2. POSIX Pthreads Scheduling API (Slide 8)
 * 3. Real-World Schedulers: Linux CFS, Windows 32-Level, Solaris Multi-Class (Slide 23)
 *
 * Incorporates household dining analogies for the upper-middle-class learner,
 * computed factual numbers, static SVG architecture diagrams, and Apple design tokens.
 */

export function renderLecture07Reference(): HTMLElement {
  const page = document.createElement('main');
  page.className = 'reference-page';

  page.innerHTML = `
    <style>
      .reference-page {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--ground);
        color: var(--ink);
        font-family: var(--font-ui);
        font-size: 17px;
        line-height: 1.47;
        letter-spacing: -0.374px;
        overflow-x: hidden;
      }

      .ref-hero {
        background: var(--surface);
        border-bottom: 1px solid var(--rule);
        padding: calc(var(--step) * 10) calc(var(--step) * 3);
      }

      .ref-section-alt {
        background: var(--surface-alt);
        border-bottom: 1px solid var(--rule);
        padding: calc(var(--step) * 10) calc(var(--step) * 3);
      }

      .ref-section-surface {
        background: var(--surface);
        border-bottom: 1px solid var(--rule);
        padding: calc(var(--step) * 10) calc(var(--step) * 3);
      }

      .ref-container {
        max-width: 980px;
        margin: 0 auto;
        width: 100%;
      }

      .ref-breadcrumb {
        display: inline-flex;
        align-items: center;
        gap: var(--step);
        font-size: 0.88rem;
        font-weight: 500;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: calc(var(--step) * 2);
        transition: opacity var(--dur-fast) var(--ease);
      }
      .ref-breadcrumb:hover {
        opacity: 0.8;
      }

      .ref-tag {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--accent);
        background: var(--surface-alt);
        border: 1px solid var(--hairline);
        padding: 4px 12px;
        border-radius: var(--rounded-pill);
        margin-bottom: calc(var(--step) * 1.5);
      }

      .ref-title {
        font-family: var(--font-display);
        font-size: 2.6rem;
        line-height: 1.12;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 2);
      }

      .ref-subtitle {
        font-size: 1.22rem;
        line-height: 1.45;
        color: var(--muted);
        max-width: 780px;
        margin-bottom: calc(var(--step) * 4);
      }

      .ref-meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--step) * 3);
        padding-top: calc(var(--step) * 3);
        border-top: 1px solid var(--rule);
        font-size: 0.88rem;
        color: var(--muted);
      }
      .ref-meta-item strong {
        color: var(--ink);
        font-weight: 600;
      }

      .ref-heading {
        font-family: var(--font-display);
        font-size: 1.85rem;
        font-weight: 600;
        letter-spacing: -0.025em;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 2);
      }

      .ref-subheading {
        font-family: var(--font-display);
        font-size: 1.3rem;
        font-weight: 600;
        letter-spacing: -0.015em;
        color: var(--ink);
        margin-top: calc(var(--step) * 4);
        margin-bottom: calc(var(--step) * 1.5);
      }

      .ref-prose {
        font-size: 17px;
        line-height: 1.55;
        color: var(--ink-2);
        margin-bottom: calc(var(--step) * 2.5);
      }

      .ref-prose strong {
        color: var(--ink);
      }

      .ref-prose code {
        font-family: var(--font-mono);
        font-size: 0.9em;
        background: var(--surface);
        padding: 2px 6px;
        border-radius: var(--rounded-sm);
        border: 1px solid var(--hairline);
        color: var(--accent);
      }

      /* Analogy Card */
      .analogy-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-left: 4px solid var(--food);
        border-radius: var(--rounded-lg);
        padding: calc(var(--step) * 3.5);
        margin: calc(var(--step) * 4) 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }
      .ref-section-surface .analogy-card {
        background: var(--surface-alt);
      }

      .analogy-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--food);
        margin-bottom: var(--step);
      }

      .analogy-title {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: -0.015em;
        color: var(--ink);
        margin-bottom: calc(var(--step) * 1.5);
      }

      /* Comparison Table */
      .ref-table-wrapper {
        overflow-x: auto;
        margin: calc(var(--step) * 4) 0;
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        background: var(--surface);
      }
      .ref-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.92rem;
      }
      .ref-table th, .ref-table td {
        padding: calc(var(--step) * 1.75) calc(var(--step) * 2.25);
        border-bottom: 1px solid var(--rule);
        vertical-align: top;
      }
      .ref-table th {
        background: var(--surface-alt);
        font-weight: 600;
        color: var(--ink);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .ref-table tr:last-child td {
        border-bottom: none;
      }
      .ref-table td:first-child {
        font-weight: 600;
        color: var(--ink);
        white-space: nowrap;
      }

      /* Code Block */
      .ref-code-window {
        background: #1e1e24;
        color: #e2e8f0;
        border-radius: var(--rounded-lg);
        overflow: hidden;
        margin: calc(var(--step) * 4) 0;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .ref-code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(var(--step) * 1.25) calc(var(--step) * 2.5);
        background: #141418;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .ref-code-dots {
        display: flex;
        gap: 6px;
      }
      .ref-code-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .ref-code-title {
        font-family: var(--font-mono);
        font-size: 0.82rem;
        color: #94a3b8;
      }
      .ref-code-pre {
        margin: 0;
        padding: calc(var(--step) * 3);
        overflow-x: auto;
        font-family: var(--font-mono);
        font-size: 0.9rem;
        line-height: 1.6;
      }
      .c-kw { color: #f472b6; font-weight: 600; }
      .c-fn { color: #60a5fa; }
      .c-type { color: #34d399; }
      .c-str { color: #fbbf24; }
      .c-comment { color: #64748b; font-style: italic; }
      .c-num { color: #a78bfa; }

      /* Cards Grid */
      .ref-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
        gap: calc(var(--step) * 3);
        margin: calc(var(--step) * 4) 0;
      }
      .ref-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        padding: calc(var(--step) * 3.5);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .ref-section-surface .ref-card {
        background: var(--surface-alt);
      }
      .ref-card-header {
        margin-bottom: calc(var(--step) * 2);
      }
      .ref-card-badge {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 3px 8px;
        border-radius: var(--rounded-sm);
        margin-bottom: var(--step);
      }
      .badge-linux { background: rgba(0, 102, 204, 0.1); color: var(--accent); }
      .badge-windows { background: rgba(8, 127, 91, 0.1); color: var(--running); }
      .badge-solaris { background: rgba(217, 119, 6, 0.1); color: var(--food); }

      .ref-card-title {
        font-family: var(--font-display);
        font-size: 1.35rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--ink);
      }
      .ref-stat-box {
        background: var(--ground);
        border-radius: var(--rounded-md);
        padding: calc(var(--step) * 1.5) calc(var(--step) * 2);
        margin: calc(var(--step) * 1.5) 0;
        border: 1px solid var(--rule);
      }
      .ref-stat-number {
        font-family: var(--font-mono);
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--ink);
        font-variant-numeric: tabular-nums;
      }
      .ref-stat-label {
        font-size: 0.78rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 2px;
      }

      /* Callout Pill List */
      .pill-list {
        display: flex;
        flex-direction: column;
        gap: var(--step);
        margin: calc(var(--step) * 2) 0;
      }
      .pill-item {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--step) * 1.5);
        font-size: 0.94rem;
        color: var(--ink-2);
      }
      .pill-bullet {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        margin-top: 8px;
        flex-shrink: 0;
      }

      /* Diagram Container */
      .diagram-container {
        margin: calc(var(--step) * 4) 0;
        border: 1px solid var(--hairline);
        border-radius: var(--rounded-lg);
        background: var(--surface);
        padding: calc(var(--step) * 3);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
      }
      .ref-section-surface .diagram-container {
        background: var(--surface-alt);
      }
      .diagram-caption {
        font-size: 0.85rem;
        color: var(--muted);
        text-align: center;
        margin-top: calc(var(--step) * 2);
        font-weight: 500;
      }

      @media (max-width: 640px) {
        .ref-title { font-size: 2rem; }
        .ref-hero, .ref-section-alt, .ref-section-surface {
          padding: calc(var(--step) * 6) calc(var(--step) * 2);
        }
      }
    </style>

    <!-- Hero Header -->
    <header class="ref-hero">
      <div class="ref-container">
        <a href="#/lecture-07" class="ref-breadcrumb">&larr; Return to Lecture 7 Overview</a>
        <span class="ref-tag">Comprehensive Reference · Slides 7–8 &amp; 23</span>
        <h1 class="ref-title">Thread Scheduling Scopes, POSIX API &amp; Production Schedulers</h1>
        <p class="ref-subtitle">
          A definitive structural reference detailing Process-Contention Scope (PCS) versus
          System-Contention Scope (SCS), the POSIX Pthreads scope control API, and the priority
          architectures of modern production operating systems in Linux, Windows, and Solaris.
        </p>
        <div class="ref-meta-bar">
          <div class="ref-meta-item"><strong>Course:</strong> CSC 2209 Operating Systems</div>
          <div class="ref-meta-item"><strong>Topic Scope:</strong> Lecture 7, Slides 7–8, 23</div>
          <div class="ref-meta-item"><strong>Threading Paradigm:</strong> User-Level vs Kernel-Level (1:1 &amp; M:N)</div>
        </div>
      </div>
    </header>

    <!-- SECTION 1: PCS vs SCS -->
    <section class="ref-section-alt">
      <div class="ref-container">
        <h2 class="ref-heading">1. Thread Scheduling: Process-Contention Scope (PCS) vs System-Contention Scope (SCS)</h2>
        <p class="ref-prose">
          Operating systems decouple the application thread abstraction from raw hardware processors through
          two distinct tiers of execution: <strong>User-level threads (ULT)</strong>, managed entirely in
          application space by a runtime thread library without kernel awareness, and <strong>Kernel-level threads (KLT)</strong>,
          managed directly by the operating system kernel.
        </p>
        <p class="ref-prose">
          In hybrid threading models (Many-to-Many or M:N, and Many-to-One or M:1), an intermediate data structure
          known as a <strong>Lightweight Process (LWP)</strong> sits between user threads and the kernel.
          To the user-level thread library, each LWP appears as a virtual CPU core upon which user threads can be scheduled.
          To the kernel, each LWP is an ordinary kernel thread dispatched onto physical hardware cores.
          This separation creates two distinct contention scopes:
        </p>

        <div class="ref-grid">
          <div class="ref-card">
            <div class="ref-card-header">
              <span class="ref-card-badge" style="background: rgba(2, 132, 199, 0.1); color: var(--travel, #0284c7);">Local Contention</span>
              <h3 class="ref-card-title">Process-Contention Scope (PCS)</h3>
            </div>
            <p class="ref-prose" style="font-size: 0.95rem; margin-bottom: var(--step);">
              User-level threads are scheduled onto an available LWP by the user-space thread library.
              Contention for CPU execution occurs strictly among threads belonging to the <strong>same process</strong>.
            </p>
            <div class="pill-list">
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Scheduling Authority:</strong> Application thread library (e.g. green threads runtime).</span>
              </div>
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Context Switch Overhead:</strong> Extremely fast; switching takes place entirely in user space with zero kernel trap transitions.</span>
              </div>
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Preemption:</strong> Priority-based; threads of equal priority typically run cooperatively until voluntary yield unless timeslicing is explicitly programmed.</span>
              </div>
            </div>
          </div>

          <div class="ref-card">
            <div class="ref-card-header">
              <span class="ref-card-badge" style="background: rgba(8, 127, 91, 0.1); color: var(--running);">Global Contention</span>
              <h3 class="ref-card-title">System-Contention Scope (SCS)</h3>
            </div>
            <p class="ref-prose" style="font-size: 0.95rem; margin-bottom: var(--step);">
              The operating system kernel schedules kernel threads directly onto physical CPU cores.
              Contention for CPU execution takes place globally among <strong>all threads across the entire system</strong>.
            </p>
            <div class="pill-list">
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Scheduling Authority:</strong> Operating system kernel dispatcher.</span>
              </div>
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Context Switch Overhead:</strong> Higher; involves saving full architectural register state, switching kernel stacks, and potential page table/TLB flushes.</span>
              </div>
              <div class="pill-item">
                <span class="pill-bullet"></span>
                <span><strong>Modern Reality:</strong> Modern general-purpose operating systems (Linux, Windows, macOS) adopt <strong>1:1 threading</strong>, scheduling exclusively using SCS.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Household & Dining Analogy -->
        <div class="analogy-card">
          <div class="analogy-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2zm0-10h2v8h-2z"/></svg>
            Household &amp; Dining Analogy
          </div>
          <h4 class="analogy-title">The Family Dining Booth vs The Central Kitchen Order Rail</h4>
          <p class="ref-prose">
            Consider an upper-middle-class family dining out at a popular multi-course restaurant in Dhanmondi or Gulshan:
          </p>
          <div class="pill-list">
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--food);"></span>
              <div>
                <strong>Process-Contention Scope (PCS) — Internal Family Turn-Taking:</strong>
                Inside your family's private booth, father, mother, and children decide among themselves whose story
                is shared first over dinner. Father might graciously yield his turn to elder sister so she can share
                her university exam results. This entire conversational negotiation is contained entirely within your booth.
                Diners at neighboring tables neither participate in your family's conversation nor care who speaks first.
              </div>
            </div>
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--accent);"></span>
              <div>
                <strong>System-Contention Scope (SCS) — Central Kitchen Order Rail:</strong>
                When ordering dishes from the kitchen, individual dining preferences leave the booth.
                Your table's order ticket for kacchi biryani and chicken roast is clipped onto the head chef's central order rail.
                Here, your family's order competes head-to-head against order tickets submitted by Table 3, Table 8,
                and private parties across the entire restaurant hall. The head chef allocates kitchen stoves based on
                restaurant-wide priorities and cooking capacity.
              </div>
            </div>
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--running);"></span>
              <div>
                <strong>Modern 1:1 Operating Systems:</strong>
                In modern Linux, Windows, and macOS, the restaurant does not delegate order queuing to table booths.
                Every single guest is treated as an independent patron whose ticket goes straight to the head chef's central rail
                (1:1 model using System-Contention Scope).
              </div>
            </div>
          </div>
        </div>

        <!-- Static SVG Architecture Diagram -->
        <div class="diagram-container">
          <svg viewBox="0 0 880 460" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Architecture diagram contrasting Process-Contention Scope and System-Contention Scope" style="display: block; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--muted, #7a7a7a)" />
              </marker>
              <marker id="arrow-accent" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--accent, #0066cc)" />
              </marker>
            </defs>

            <!-- Background Canvas -->
            <rect x="0" y="0" width="880" height="460" rx="14" fill="var(--ground, #f5f5f7)" />

            <!-- User Space Region -->
            <rect x="20" y="16" width="840" height="210" rx="10" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.08))" stroke-width="1.5" />
            <text x="36" y="42" font-size="13" font-weight="700" fill="var(--muted, #7a7a7a)" letter-spacing="0.06em">USER SPACE (APPLICATION RUNTIME)</text>

            <!-- Process 1 Box -->
            <rect x="40" y="56" width="380" height="152" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" stroke-width="1" />
            <text x="56" y="80" font-size="14" font-weight="600" fill="var(--ink, #1d1d1f)">Process 1 (Address Space)</text>
            <rect x="252" y="66" width="156" height="20" rx="10" fill="rgba(2, 132, 199, 0.12)" />
            <text x="262" y="80" font-size="10" font-weight="700" fill="var(--travel, #0284c7)">PCS CONTENTION SCOPE</text>

            <!-- User Threads in Process 1 -->
            <rect x="56" y="96" width="80" height="28" rx="6" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.1))" />
            <text x="80" y="115" font-size="12" font-weight="600" fill="var(--ink, #1d1d1f)">User T1</text>

            <rect x="148" y="96" width="80" height="28" rx="6" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.1))" />
            <text x="172" y="115" font-size="12" font-weight="600" fill="var(--ink, #1d1d1f)">User T2</text>

            <rect x="240" y="96" width="80" height="28" rx="6" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.1))" />
            <text x="264" y="115" font-size="12" font-weight="600" fill="var(--ink, #1d1d1f)">User T3</text>

            <!-- Thread Library Scheduler Box -->
            <text x="56" y="146" font-size="11" font-weight="600" fill="var(--muted, #7a7a7a)">User Thread Library (M:N PCS Dispatch)</text>

            <!-- LWPs in Process 1 -->
            <rect x="80" y="162" width="110" height="32" rx="6" fill="#0066cc" />
            <text x="108" y="183" font-size="12" font-weight="600" fill="#ffffff">LWP 1</text>

            <rect x="220" y="162" width="110" height="32" rx="6" fill="#0066cc" />
            <text x="248" y="183" font-size="12" font-weight="600" fill="#ffffff">LWP 2</text>

            <!-- Connector lines in Process 1 -->
            <path d="M 96 124 L 125 162" stroke="var(--muted, #7a7a7a)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
            <path d="M 188 124 L 145 162" stroke="var(--muted, #7a7a7a)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
            <path d="M 280 124 L 275 162" stroke="var(--muted, #7a7a7a)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />

            <!-- Process 2 Box -->
            <rect x="460" y="56" width="380" height="152" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" stroke-width="1" />
            <text x="476" y="80" font-size="14" font-weight="600" fill="var(--ink, #1d1d1f)">Process 2 (Address Space)</text>
            <rect x="672" y="66" width="156" height="20" rx="10" fill="rgba(2, 132, 199, 0.12)" />
            <text x="682" y="80" font-size="10" font-weight="700" fill="var(--travel, #0284c7)">PCS CONTENTION SCOPE</text>

            <!-- User Threads in Process 2 -->
            <rect x="500" y="96" width="90" height="28" rx="6" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.1))" />
            <text x="526" y="115" font-size="12" font-weight="600" fill="var(--ink, #1d1d1f)">User T4</text>

            <rect x="620" y="96" width="90" height="28" rx="6" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.1))" />
            <text x="646" y="115" font-size="12" font-weight="600" fill="var(--ink, #1d1d1f)">User T5</text>

            <!-- Thread Library Scheduler Box Process 2 -->
            <text x="476" y="146" font-size="11" font-weight="600" fill="var(--muted, #7a7a7a)">User Thread Library (M:N PCS Dispatch)</text>

            <!-- LWP in Process 2 -->
            <rect x="550" y="162" width="130" height="32" rx="6" fill="#0066cc" />
            <text x="590" y="183" font-size="12" font-weight="600" fill="#ffffff">LWP 3</text>

            <path d="M 545 124 L 595 162" stroke="var(--muted, #7a7a7a)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
            <path d="M 665 124 L 625 162" stroke="var(--muted, #7a7a7a)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />

            <!-- Boundary Line -->
            <line x1="20" y1="236" x2="860" y2="236" stroke="var(--accent, #0066cc)" stroke-width="2" stroke-dasharray="6,4" />
            <rect x="310" y="226" width="260" height="20" rx="10" fill="var(--accent, #0066cc)" />
            <text x="325" y="240" font-size="11" font-weight="700" fill="#ffffff" letter-spacing="0.04em">SYSTEM CALL / KERNEL BOUNDARY</text>

            <!-- Kernel Space Region -->
            <rect x="20" y="254" width="840" height="190" rx="10" fill="var(--surface, #ffffff)" stroke="var(--hairline, rgba(0,0,0,0.08))" stroke-width="1.5" />
            <text x="36" y="278" font-size="13" font-weight="700" fill="var(--muted, #7a7a7a)" letter-spacing="0.06em">KERNEL SPACE &amp; HARDWARE (SYSTEM-CONTENTION SCOPE)</text>

            <!-- Kernel Scheduler Box -->
            <rect x="40" y="292" width="800" height="48" rx="8" fill="rgba(8, 127, 91, 0.08)" stroke="var(--running, #087f5b)" stroke-width="1.5" />
            <text x="56" y="322" font-size="15" font-weight="700" fill="var(--running, #087f5b)">OS Kernel Scheduler (SCS)</text>
            <text x="300" y="322" font-size="13" font-weight="500" fill="var(--ink-2, #333333)">Contention takes place across all LWPs / kernel threads in the system</text>

            <!-- Arrows from LWPs down to Kernel Scheduler -->
            <path d="M 135 194 L 135 292" stroke="var(--accent, #0066cc)" stroke-width="2" marker-end="url(#arrow-accent)" />
            <path d="M 275 194 L 275 292" stroke="var(--accent, #0066cc)" stroke-width="2" marker-end="url(#arrow-accent)" />
            <path d="M 615 194 L 615 292" stroke="var(--accent, #0066cc)" stroke-width="2" marker-end="url(#arrow-accent)" />

            <!-- Hardware CPU Cores -->
            <g transform="translate(40, 360)">
              <!-- Core 0 -->
              <rect x="0" y="0" width="180" height="66" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" />
              <text x="16" y="26" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Physical CPU Core 0</text>
              <rect x="16" y="36" width="80" height="18" rx="4" fill="rgba(8, 127, 91, 0.15)" />
              <text x="24" y="49" font-size="10" font-weight="700" fill="var(--running, #087f5b)">EXEC: LWP 1</text>

              <!-- Core 1 -->
              <rect x="206" y="0" width="180" height="66" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" />
              <text x="222" y="26" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Physical CPU Core 1</text>
              <rect x="222" y="36" width="80" height="18" rx="4" fill="rgba(8, 127, 91, 0.15)" />
              <text x="230" y="49" font-size="10" font-weight="700" fill="var(--running, #087f5b)">EXEC: LWP 2</text>

              <!-- Core 2 -->
              <rect x="412" y="0" width="180" height="66" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" />
              <text x="428" y="26" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Physical CPU Core 2</text>
              <rect x="428" y="36" width="80" height="18" rx="4" fill="rgba(8, 127, 91, 0.15)" />
              <text x="436" y="49" font-size="10" font-weight="700" fill="var(--running, #087f5b)">EXEC: LWP 3</text>

              <!-- Core 3 -->
              <rect x="618" y="0" width="182" height="66" rx="8" fill="var(--surface-alt, #f5f5f7)" stroke="var(--rule, rgba(0,0,0,0.12))" />
              <text x="634" y="26" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Physical CPU Core 3</text>
              <rect x="634" y="36" width="70" height="18" rx="4" fill="rgba(140, 155, 165, 0.15)" />
              <text x="642" y="49" font-size="10" font-weight="700" fill="var(--muted, #7a7a7a)">IDLE CORE</text>
            </g>

            <!-- Dispatch arrows from Kernel Scheduler to Cores -->
            <path d="M 130 340 L 130 360" stroke="var(--running, #087f5b)" stroke-width="2" marker-end="url(#arrow)" />
            <path d="M 336 340 L 336 360" stroke="var(--running, #087f5b)" stroke-width="2" marker-end="url(#arrow)" />
            <path d="M 542 340 L 542 360" stroke="var(--running, #087f5b)" stroke-width="2" marker-end="url(#arrow)" />
          </svg>
          <div class="diagram-caption">
            Figure 1: Architectural relationship between User Threads, Thread Library (PCS), Lightweight Processes (LWPs), Kernel Scheduler (SCS), and physical CPU cores.
          </div>
        </div>

        <!-- Detailed Structural Comparison Table -->
        <h3 class="ref-subheading">Structural Comparison: PCS vs SCS</h3>
        <div class="ref-table-wrapper">
          <table class="ref-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Process-Contention Scope (PCS)</th>
                <th>System-Contention Scope (SCS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Scheduling Entity</td>
                <td>User-space thread library (e.g. green threads runtime)</td>
                <td>Operating system kernel dispatcher</td>
              </tr>
              <tr>
                <td>Contention Arena</td>
                <td>Threads within the <strong>same process</strong></td>
                <td>All threads across the <strong>entire operating system</strong></td>
              </tr>
              <tr>
                <td>Kernel Awareness</td>
                <td>Zero awareness of individual user threads</td>
                <td>Full visibility and state tracking of every thread</td>
              </tr>
              <tr>
                <td>Context Switch Cost</td>
                <td>Sub-microsecond (saves user registers only; no syscall/trap)</td>
                <td>Higher (requires CPU privilege transition, memory map validation)</td>
              </tr>
              <tr>
                <td>Underlying Model</td>
                <td>Many-to-One (M:1) and Many-to-Many (M:N) models</td>
                <td>One-to-One (1:1) threading architecture</td>
              </tr>
              <tr>
                <td>Modern Production Systems</td>
                <td>Specialized application runtimes (e.g. Go goroutines, Erlang actors)</td>
                <td>Standard default across modern Linux (NPTL), Windows, and macOS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- SECTION 2: POSIX Pthreads API -->
    <section class="ref-section-surface">
      <div class="ref-container">
        <h2 class="ref-heading">2. POSIX Pthreads Scheduling API (Slide 8)</h2>
        <p class="ref-prose">
          The POSIX standard (IEEE Std 1003.1) specifies thread contention scope configuration through thread attribute
          objects (<code>pthread_attr_t</code>). Contention scope is established prior to thread creation
          using the following core POSIX primitives:
        </p>

        <div class="pill-list">
          <div class="pill-item">
            <span class="pill-bullet"></span>
            <div>
              <code>int pthread_attr_setscope(pthread_attr_t *attr, int scope);</code><br />
              Sets the contention scope attribute. Valid POSIX constants are <code>PTHREAD_SCOPE_PROCESS</code> (PCS)
              and <code>PTHREAD_SCOPE_SYSTEM</code> (SCS). Returns 0 on success, or a non-zero error code.
            </div>
          </div>
          <div class="pill-item">
            <span class="pill-bullet"></span>
            <div>
              <code>int pthread_attr_getscope(const pthread_attr_t *attr, int *scope);</code><br />
              Queries the contention scope stored inside the attribute object, storing the current setting into the integer pointed to by <code>scope</code>.
            </div>
          </div>
        </div>

        <h3 class="ref-subheading">Real-World Behavior on 1:1 Systems (Linux NPTL)</h3>
        <p class="ref-prose">
          Although the POSIX specification provides symbolic constants for both scopes, the underlying operating system
          architecture dictates what is physically possible.
          On modern 1:1 threading architectures like Linux using the <strong>Native POSIX Thread Library (NPTL)</strong>,
          every user-space thread maps directly to a kernel task (created via the <code>clone(2)</code> system call).
        </p>
        <p class="ref-prose">
          Consequently, Linux supports <strong>only</strong> <code>PTHREAD_SCOPE_SYSTEM</code>.
          Attempting to invoke <code>pthread_attr_setscope(&amp;attr, PTHREAD_SCOPE_PROCESS)</code> does not fail silently;
          it returns the error constant <strong><code>ENOTSUP</code></strong> (Error: Operation not supported, typically error value 95 on x86_64 Linux).
        </p>

        <!-- Code Block Window -->
        <div class="ref-code-window">
          <div class="ref-code-header">
            <div class="ref-code-dots">
              <span class="ref-code-dot" style="background: #ef4444;"></span>
              <span class="ref-code-dot" style="background: #eab308;"></span>
              <span class="ref-code-dot" style="background: #22c55e;"></span>
            </div>
            <span class="ref-code-title">pthread_scope_demo.c — CSC 2209 Slide 8 Reference Implementation</span>
            <span style="font-size: 0.78rem; color: #64748b; font-family: var(--font-mono);">C99 / POSIX.1c</span>
          </div>
          <pre class="ref-code-pre"><code><span class="c-comment">/**
 * Demonstrates thread contention scope querying and setting in POSIX Pthreads.
 * Slide 8 canonical pattern: queries default scope, attempts PCS, falls back to SCS.
 */</span>
<span class="c-kw">#include</span> <span class="c-str">&lt;pthread.h&gt;</span>
<span class="c-kw">#include</span> <span class="c-str">&lt;stdio.h&gt;</span>
<span class="c-kw">#include</span> <span class="c-str">&lt;stdlib.h&gt;</span>
<span class="c-kw">#include</span> <span class="c-str">&lt;errno.h&gt;</span>

<span class="c-kw">#define</span> NUM_THREADS <span class="c-num">5</span>

<span class="c-type">void</span> *<span class="c-fn">worker_routine</span>(<span class="c-type">void</span> *arg) {
    <span class="c-type">int</span> id = *((<span class="c-type">int</span> *)arg);
    <span class="c-fn">printf</span>(<span class="c-str">"Thread %d actively executing under System-Contention Scope (SCS)\\n"</span>, id);
    <span class="c-fn">pthread_exit</span>(NULL);
}

<span class="c-type">int</span> <span class="c-fn">main</span>(<span class="c-type">int</span> argc, <span class="c-type">char</span> *argv[]) {
    <span class="c-type">pthread_t</span> workers[NUM_THREADS];
    <span class="c-type">pthread_attr_t</span> attr;
    <span class="c-type">int</span> thread_ids[NUM_THREADS];
    <span class="c-type">int</span> scope;

    <span class="c-comment">/* Step 1: Initialize the thread attribute structure */</span>
    <span class="c-fn">pthread_attr_init</span>(&amp;attr);

    <span class="c-comment">/* Step 2: Query the implementation default contention scope */</span>
    <span class="c-kw">if</span> (<span class="c-fn">pthread_attr_getscope</span>(&amp;attr, &amp;scope) == <span class="c-num">0</span>) {
        <span class="c-kw">if</span> (scope == PTHREAD_SCOPE_PROCESS) {
            <span class="c-fn">printf</span>(<span class="c-str">"Default scope: PTHREAD_SCOPE_PROCESS (PCS)\\n"</span>);
        } <span class="c-kw">else if</span> (scope == PTHREAD_SCOPE_SYSTEM) {
            <span class="c-fn">printf</span>(<span class="c-str">"Default scope: PTHREAD_SCOPE_SYSTEM (SCS)\\n"</span>);
        }
    }

    <span class="c-comment">/* Step 3: Attempt to set Process-Contention Scope (PCS) */</span>
    <span class="c-type">int</span> status = <span class="c-fn">pthread_attr_setscope</span>(&amp;attr, PTHREAD_SCOPE_PROCESS);
    <span class="c-kw">if</span> (status == ENOTSUP) {
        <span class="c-comment">/* On modern 1:1 Linux NPTL, this returns ENOTSUP */</span>
        <span class="c-fn">printf</span>(<span class="c-str">"PTHREAD_SCOPE_PROCESS rejected: ENOTSUP (1:1 kernel enforces SCS)\\n"</span>);
    } <span class="c-kw">else if</span> (status != <span class="c-num">0</span>) {
        <span class="c-fn">perror</span>(<span class="c-str">"pthread_attr_setscope failure"</span>);
    }

    <span class="c-comment">/* Step 4: Explicitly configure System-Contention Scope (SCS) */</span>
    <span class="c-fn">pthread_attr_setscope</span>(&amp;attr, PTHREAD_SCOPE_SYSTEM);

    <span class="c-comment">/* Step 5: Launch worker threads governed by the SCS attribute */</span>
    <span class="c-kw">for</span> (<span class="c-type">int</span> i = <span class="c-num">0</span>; i &lt; NUM_THREADS; i++) {
        thread_ids[i] = i;
        <span class="c-fn">pthread_create</span>(&amp;workers[i], &amp;attr, worker_routine, &amp;thread_ids[i]);
    }

    <span class="c-comment">/* Step 6: Wait for all threads to terminate and clean up attribute */</span>
    <span class="c-kw">for</span> (<span class="c-type">int</span> i = <span class="c-num">0</span>; i &lt; NUM_THREADS; i++) {
        <span class="c-fn">pthread_join</span>(workers[i], NULL);
    }

    <span class="c-fn">pthread_attr_destroy</span>(&amp;attr);
    <span class="c-kw">return</span> <span class="c-num">0</span>;
}</code></pre>
        </div>

        <!-- Analogy for API -->
        <div class="analogy-card" style="border-left-color: var(--friends);">
          <div class="analogy-badge" style="color: var(--friends);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            Analogy: Ordering at the Counter
          </div>
          <h4 class="analogy-title">The Pthreads API Contract in Restaurant Terms</h4>
          <p class="ref-prose">
            When your application calls <code>pthread_attr_setscope()</code>, it is instructing the operating system:
          </p>
          <div class="pill-list">
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--food);"></span>
              <div>
                <strong>Requesting <code>PTHREAD_SCOPE_PROCESS</code>:</strong>
                "Our family will manage our speaking turns internally inside our booth. Just assign us a private dining space, and we will take care of who talks when."
              </div>
            </div>
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--accent);"></span>
              <div>
                <strong>Requesting <code>PTHREAD_SCOPE_SYSTEM</code>:</strong>
                "Every guest at our table receives an individual order card submitted straight to the head chef's kitchen rail, competing with every other patron in the restaurant."
              </div>
            </div>
            <div class="pill-item">
              <span class="pill-bullet" style="background: var(--running);"></span>
              <div>
                <strong>The Modern Linux Response (<code>ENOTSUP</code>):</strong>
                The restaurant manager politely intervenes: <em>"We no longer allow table booths to internally coordinate turns. In our kitchen management system, every single diner must hold their own official ticket on the head chef's rail."</em>
                The request for process scope fails immediately with <code>ENOTSUP</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: Real-World Operating System Schedulers -->
    <section class="ref-section-alt">
      <div class="ref-container">
        <h2 class="ref-heading">3. Real-World Schedulers: Linux, Windows &amp; Solaris (Slide 23)</h2>
        <p class="ref-prose">
          Modern production operating systems implement sophisticated priority-based dispatchers tailored to their
          target hardware and workload profiles. Below is an architectural survey of the three foundational schedulers
          highlighted in Slide 23.
        </p>

        <!-- OS Survey Cards Grid -->
        <div class="ref-grid">
          <!-- Linux Card -->
          <div class="ref-card">
            <div>
              <div class="ref-card-header">
                <span class="ref-card-badge badge-linux">Operating System 1</span>
                <h3 class="ref-card-title">Linux Scheduling</h3>
              </div>
              <p class="ref-prose" style="font-size: 0.94rem;">
                Linux features a preemptive, priority-based multitasking scheduler with two distinct execution domains:
              </p>
              <div class="pill-list">
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--accent);"></span>
                  <div>
                    <strong>Real-Time Tier (0–99):</strong> Fixed priorities running under POSIX
                    <code>SCHED_FIFO</code> or <code>SCHED_RR</code>. Real-time tasks strictly preempt any CFS task.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--accent);"></span>
                  <div>
                    <strong>Normal Tier (CFS):</strong> The Completely Fair Scheduler manages standard tasks
                    using a self-balancing red-black tree keyed on <code>vruntime</code> (virtual runtime).
                  </div>
                </div>
              </div>

              <div class="ref-stat-box">
                <div class="ref-stat-number">40 Levels (-20 to +19)</div>
                <div class="ref-stat-label">Nice Value Priority Spectrum (Computed: 19 - (-20) + 1 = 40)</div>
              </div>
              <div class="ref-stat-box">
                <div class="ref-stat-number">100 RT Levels (0 to 99)</div>
                <div class="ref-stat-label">Real-Time Spectrum (Computed: 99 - 0 + 1 = 100)</div>
              </div>
            </div>

            <div>
              <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--ink); margin-top: var(--step);">Core CFS Invariants:</h4>
              <p class="ref-prose" style="font-size: 0.88rem; margin-bottom: 0;">
                The task with the lowest <code>vruntime</code> sits at the leftmost node of the red-black tree and is chosen next in O(1) time.
                Nice differences adjust task weight geometrically: a 1-level nice difference yields roughly a 10% CPU share shift (factor of 1.25).
              </p>
            </div>
          </div>

          <!-- Windows Card -->
          <div class="ref-card">
            <div>
              <div class="ref-card-header">
                <span class="ref-card-badge badge-windows">Operating System 2</span>
                <h3 class="ref-card-title">Windows Scheduling</h3>
              </div>
              <p class="ref-prose" style="font-size: 0.94rem;">
                The Windows kernel employs a 32-level preemptive multilevel feedback priority dispatcher:
              </p>
              <div class="pill-list">
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--running);"></span>
                  <div>
                    <strong>Priority 0 (1 level):</strong> Dedicated Zero-Page thread that zeroes physical memory pages during idle processor periods.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--running);"></span>
                  <div>
                    <strong>Priorities 1–15 (15 levels):</strong> Variable priority class for interactive user applications and services, dynamically adjusted.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--running);"></span>
                  <div>
                    <strong>Priorities 16–31 (16 levels):</strong> Real-time priority class with fixed priorities immune to dynamic adjustment.
                  </div>
                </div>
              </div>

              <div class="ref-stat-box">
                <div class="ref-stat-number">32 Levels (0 to 31)</div>
                <div class="ref-stat-label">Total Priority Range (Computed: 31 - 0 + 1 = 32 = 1 + 15 + 16)</div>
              </div>
              <div class="ref-stat-box">
                <div class="ref-stat-number">&ge; 4.0s Starvation Window</div>
                <div class="ref-stat-label">Balance Set Manager Boost Trigger (&ge; 4000 ms)</div>
              </div>
            </div>

            <div>
              <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--ink); margin-top: var(--step);">Dynamic Priority Boosting:</h4>
              <p class="ref-prose" style="font-size: 0.88rem; margin-bottom: 0;">
                Windows dynamically boosts threads in the variable class: foreground window boost for smooth UI interaction,
                I/O completion boosts (keyboard/mouse +6, disk +1), and Anti-starvation boost (threads starved &ge; 4s boosted to priority 15 for 2 quantums).
              </p>
            </div>
          </div>

          <!-- Solaris Card -->
          <div class="ref-card">
            <div>
              <div class="ref-card-header">
                <span class="ref-card-badge badge-solaris">Operating System 3</span>
                <h3 class="ref-card-title">Solaris Scheduling</h3>
              </div>
              <p class="ref-prose" style="font-size: 0.94rem;">
                Solaris utilizes a priority-based dispatcher structured into multiple distinct scheduling classes,
                each controlled by a formal parameter dispatch table:
              </p>
              <div class="pill-list">
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--food);"></span>
                  <div>
                    <strong>Time-Sharing (TS, 0–59):</strong> Default class. Dynamic priorities featuring an inverse relationship between priority and time quantum.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--food);"></span>
                  <div>
                    <strong>Interactive (IA, 0–59):</strong> Matches TS range, enhanced with priority boosts for active desktop window managers.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--food);"></span>
                  <div>
                    <strong>System (SYS, 60–99):</strong> Kernel threads (page daemon, memory reclaimers) running at fixed high priorities.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--food);"></span>
                  <div>
                    <strong>Real-Time (RT, 100–159):</strong> Highest priority class with fixed short quantums and guaranteed deterministic dispatch latency.
                  </div>
                </div>
                <div class="pill-item">
                  <span class="pill-bullet" style="background: var(--food);"></span>
                  <div>
                    <strong>Fair-Share (FSS):</strong> Replaces priority preemption with weighted CPU project share allocations.
                  </div>
                </div>
              </div>

              <div class="ref-stat-box">
                <div class="ref-stat-number">160 Levels (0 to 159)</div>
                <div class="ref-stat-label">Total Priority Spectrum (Computed: 60 TS/IA + 40 SYS + 60 RT = 160)</div>
              </div>
              <div class="ref-stat-box">
                <div class="ref-stat-number">20ms to 200ms Quantum</div>
                <div class="ref-stat-label">Inverse TS Scale (Prio 59 = 20ms, Prio 0 = 200ms)</div>
              </div>
            </div>

            <div>
              <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--ink); margin-top: var(--step);">Solaris Dispatch Tables:</h4>
              <p class="ref-prose" style="font-size: 0.88rem; margin-bottom: 0;">
                If a thread exhausts its time quantum without blocking, its priority is lowered (feedback penalty).
                If it blocks on I/O before exhausting its slice, its priority is increased upon wake-up.
              </p>
            </div>
          </div>
        </div>

        <!-- Static SVG Diagram: Priority Spectrums Comparison -->
        <div class="diagram-container">
          <svg viewBox="0 0 880 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison diagram of priority spectrums in Linux, Windows, and Solaris" style="display: block; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;">
            <!-- Background Canvas -->
            <rect x="0" y="0" width="880" height="340" rx="14" fill="var(--ground, #f5f5f7)" />

            <!-- Title -->
            <text x="30" y="34" font-size="15" font-weight="700" fill="var(--ink, #1d1d1f)" letter-spacing="-0.01em">Production Operating System Priority Spectrums Comparison</text>
            <text x="30" y="52" font-size="12" font-weight="500" fill="var(--muted, #7a7a7a)">Visualizing relative priority levels and class demarcations across platforms</text>

            <!-- TRACK 1: LINUX -->
            <g transform="translate(30, 75)">
              <text x="0" y="14" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Linux (140 Levels Total: 0 to 139)</text>

              <!-- Real-Time Segment: 0 to 99 -->
              <rect x="0" y="24" width="480" height="36" rx="6" fill="#0066cc" />
              <text x="16" y="46" font-size="12" font-weight="700" fill="#ffffff">Real-Time Class (Priorities 0–99 · 100 levels)</text>
              <text x="320" y="46" font-size="11" font-weight="500" fill="rgba(255,255,255,0.85)">SCHED_FIFO &amp; SCHED_RR</text>

              <!-- CFS Segment: 100 to 139 -->
              <rect x="488" y="24" width="332" height="36" rx="6" fill="rgba(0, 102, 204, 0.18)" stroke="#0066cc" stroke-width="1.5" />
              <text x="504" y="46" font-size="12" font-weight="700" fill="#0066cc">CFS Normal Class (Priorities 100–139 · 40 levels)</text>
              <text x="760" y="46" font-size="11" font-weight="600" fill="#0066cc">nice -20..+19</text>
            </g>

            <!-- TRACK 2: WINDOWS -->
            <g transform="translate(30, 160)">
              <text x="0" y="14" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Windows (32 Levels Total: 0 to 31)</text>

              <!-- Zero-page thread: Priority 0 -->
              <rect x="0" y="24" width="40" height="36" rx="4" fill="#6c7d8c" />
              <text x="14" y="46" font-size="11" font-weight="700" fill="#ffffff">0</text>

              <!-- Variable Priority Class: 1 to 15 -->
              <rect x="46" y="24" width="414" height="36" rx="6" fill="rgba(8, 127, 91, 0.2)" stroke="var(--running, #087f5b)" stroke-width="1.5" />
              <text x="58" y="46" font-size="12" font-weight="700" fill="var(--running, #087f5b)">Variable Class (Priorities 1–15 · 15 levels)</text>
              <text x="320" y="46" font-size="11" font-weight="500" fill="var(--running, #087f5b)">Dynamic UI / I/O Boosts</text>

              <!-- Real-Time Class: 16 to 31 -->
              <rect x="466" y="24" width="354" height="36" rx="6" fill="var(--running, #087f5b)" />
              <text x="482" y="46" font-size="12" font-weight="700" fill="#ffffff">Real-Time Class (Priorities 16–31 · 16 levels · Fixed)</text>
            </g>

            <!-- TRACK 3: SOLARIS -->
            <g transform="translate(30, 245)">
              <text x="0" y="14" font-size="13" font-weight="700" fill="var(--ink, #1d1d1f)">Solaris (160 Levels Total: 0 to 159)</text>

              <!-- Time-Sharing & Interactive Class: 0 to 59 -->
              <rect x="0" y="24" width="320" height="36" rx="6" fill="rgba(217, 119, 6, 0.2)" stroke="var(--food, #d97706)" stroke-width="1.5" />
              <text x="12" y="46" font-size="12" font-weight="700" fill="var(--food, #d97706)">TS &amp; IA Classes (0–59 · 60 levels)</text>
              <text x="210" y="46" font-size="10" font-weight="600" fill="var(--food, #d97706)">200ms &rarr; 20ms</text>

              <!-- System Class: 60 to 99 -->
              <rect x="326" y="24" width="220" height="36" rx="6" fill="#8c9ba5" />
              <text x="338" y="46" font-size="12" font-weight="700" fill="#ffffff">System Class (60–99 · 40 levels)</text>

              <!-- Real-Time Class: 100 to 159 -->
              <rect x="552" y="24" width="268" height="36" rx="6" fill="var(--food, #d97706)" />
              <text x="568" y="46" font-size="12" font-weight="700" fill="#ffffff">Real-Time (100–159 · 60 levels)</text>
            </g>
          </svg>
          <div class="diagram-caption">
            Figure 2: Architectural comparison of priority levels, class demarcations, and ranges in Linux (0–139), Windows (0–31), and Solaris (0–159).
          </div>
        </div>

        <!-- Comparative Summary Matrix Table -->
        <h3 class="ref-subheading">Comparative Matrix: Production Schedulers</h3>
        <div class="ref-table-wrapper">
          <table class="ref-table">
            <thead>
              <tr>
                <th>System</th>
                <th>Priority Granularity</th>
                <th>Primary Algorithm</th>
                <th>Dynamic Priority Adaptation</th>
                <th>Starvation Prevention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Linux</td>
                <td>
                  <strong>140 Total Levels:</strong><br />
                  100 RT levels (0–99)<br />
                  40 CFS levels (nice -20..+19)
                </td>
                <td>
                  <strong>CFS Red-Black Tree:</strong><br />
                  Orders tasks by virtual runtime (<code>vruntime</code>). Picks leftmost node in O(1).
                </td>
                <td>
                  No dynamic boosting. Tasks adjust execution share continuously according to nice weights.
                </td>
                <td>
                  Mathematically guaranteed by strictly increasing <code>vruntime</code>. Unserviced tasks become leftmost.
                </td>
              </tr>
              <tr>
                <td>Windows</td>
                <td>
                  <strong>32 Total Levels:</strong><br />
                  1 Zero-page level (0)<br />
                  15 Variable levels (1–15)<br />
                  16 Real-Time levels (16–31)
                </td>
                <td>
                  <strong>Multilevel Feedback Queues:</strong><br />
                  Preemptive dispatcher picks highest non-empty priority queue.
                </td>
                <td>
                  Foreground active window boost; I/O completion boosts (+6 for keyboard/mouse, +1 for disk).
                </td>
                <td>
                  Balance Set Manager detects threads starved &ge; 4s, boosting them to priority 15 for 2 quantums.
                </td>
              </tr>
              <tr>
                <td>Solaris</td>
                <td>
                  <strong>160 Total Levels:</strong><br />
                  60 TS/IA levels (0–59)<br />
                  40 SYS levels (60–99)<br />
                  60 RT levels (100–159)
                </td>
                <td>
                  <strong>Class Dispatch Tables:</strong><br />
                  Inverse priority-to-quantum mapping (high priority gets short slice; low gets long slice).
                </td>
                <td>
                  Quantum expiration penalizes priority (<code>ts_tqexp</code>); I/O sleep rewards priority (<code>ts_slpret</code>).
                </td>
                <td>
                  CPU share management via Fair-Share Scheduler (FSS) projects prevents multi-user monopolization.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Key Takeaways Footer Tile -->
    <section class="ref-section-surface">
      <div class="ref-container">
        <h2 class="ref-heading">Summary &amp; Key Exam Invariants</h2>
        <div class="ref-grid">
          <div class="ref-card">
            <h3 class="ref-card-title" style="font-size: 1.15rem; margin-bottom: var(--step);">Contention Scope Invariant</h3>
            <p class="ref-prose" style="font-size: 0.92rem;">
              PCS occurs only in M:N and M:1 thread models where user-level threads compete within a single process.
              SCS occurs when kernel threads compete system-wide across all processes. Modern 1:1 systems schedule exclusively via SCS.
            </p>
          </div>
          <div class="ref-card">
            <h3 class="ref-card-title" style="font-size: 1.15rem; margin-bottom: var(--step);">POSIX NPTL Invariant</h3>
            <p class="ref-prose" style="font-size: 0.92rem;">
              Calling <code>pthread_attr_setscope(&amp;attr, PTHREAD_SCOPE_PROCESS)</code> on Linux returns
              <code>ENOTSUP</code> because the 1:1 kernel thread implementation supports only <code>PTHREAD_SCOPE_SYSTEM</code>.
            </p>
          </div>
          <div class="ref-card">
            <h3 class="ref-card-title" style="font-size: 1.15rem; margin-bottom: var(--step);">Scheduler Numbers Invariant</h3>
            <p class="ref-prose" style="font-size: 0.92rem;">
              Linux nice ranges across 40 levels (-20 to +19). Windows priorities span 32 levels (0 to 31) with anti-starvation boosting at 4 seconds.
              Solaris encompasses 160 priority levels (0 to 159) across TS, IA, SYS, RT, and FSS classes.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;

  return page;
}
