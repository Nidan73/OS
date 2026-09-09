import './styles/base.css';
import { loadUnitDynamically, loadLessonDynamically, mountUnit, mountLesson, renderFallback } from './core/registry.js';
import { UnitPlayer } from './components/UnitPlayer.js';
import { LessonPlayer } from './components/LessonPlayer.js';

interface ChapterMeta {
  id: number;
  slug: string;
  title: string;
  topic: string;
  unitCount: number;
}

const CHAPTERS: ChapterMeta[] = [
  { id: 6, slug: 'lecture-06', title: 'L6 Scheduling', topic: 'CPU Scheduling — Foundations', unitCount: 14 },
  { id: 7, slug: 'lecture-07', title: 'L7 Multiprocessor', topic: 'CPU Scheduling — Multiprocessor & Real-Time', unitCount: 19 },
  { id: 8, slug: 'lecture-08', title: 'L8 Critical Section', topic: 'Synchronization — The Critical-Section Problem', unitCount: 13 },
  { id: 9, slug: 'lecture-09', title: 'L9 Semaphores', topic: 'Synchronization — Hardware, Mutexes & Semaphores', unitCount: 16 },
  { id: 10, slug: 'lecture-10', title: 'L10 Deadlocks', topic: 'Deadlocks', unitCount: 27 },
];

interface LessonMeta {
  id: number;
  slug: string;
  chapterSlug: string;
  title: string;
  blurb: string;
}

/** One row per lesson. Adding a lesson means adding a row here — nothing else. */
const LESSONS_META: LessonMeta[] = [
  { id: 1, slug: 'lesson-01', chapterSlug: 'lecture-06', title: 'Why a scheduler exists at all', blurb: 'A café where you eat first, then wait for the next course — watch the CPU go idle between bursts.' },
  { id: 2, slug: 'lesson-02', chapterSlug: 'lecture-06', title: 'First-Come, First-Served — and the Convoy', blurb: 'Food truck queue analogy · Smooth Gantt morph · Interactive reorder playground' },
  { id: 3, slug: 'lesson-03', chapterSlug: 'lecture-06', title: "Shortest Job First — and Why You Can't Have It", blurb: 'The express lane. Morphs into SJF, then SRTF when a smaller order walks up mid-service.' },
  { id: 4, slug: 'lesson-04', chapterSlug: 'lecture-06', title: 'Round Robin and the Cost of Fairness', blurb: 'Karaoke night with a timer. Drag the quantum and watch turnaround bottom out, then climb.' },
  { id: 5, slug: 'lesson-05', chapterSlug: 'lecture-06', title: 'Priority Scheduling, Starvation & Aging', blurb: 'Airport boarding groups. Watch a Group 9 passenger never board, then switch aging on.' },
  { id: 6, slug: 'lesson-06', chapterSlug: 'lecture-07', title: 'Queues within queues (MLFQ)', blurb: 'Airport lanes by class, then a restaurant that demotes you for dithering. Tune feedback thresholds.' },
  { id: 7, slug: 'lesson-07', chapterSlug: 'lecture-07', title: 'More cores, more problems', blurb: 'One kitchen versus several; a chef idle at the pass waiting on the storeroom.' },
  { id: 8, slug: 'lesson-08', chapterSlug: 'lecture-07', title: 'Keeping Every Core Busy', blurb: 'The staffer waving people to an empty desk; your regular waiter who knows your order.' },
  { id: 10, slug: 'lesson-10', chapterSlug: 'lecture-08', title: 'The Last Slice', blurb: 'One friend puts a slice back while the other takes one off — both read the same count, one update never lands. Reorder the interleaving and find the orders that corrupt the count.' },
  { id: 11, slug: 'lesson-11', chapterSlug: 'lecture-08', title: 'What a Correct Solution Must Promise', blurb: 'The single toilet on a long-haul coach. Break mutual exclusion, progress or bounded waiting and watch the exact failure each one permits.' },
  { id: 12, slug: 'lesson-12', chapterSlug: 'lecture-08', title: 'Peterson’s Solution, and Why Hardware Breaks It', blurb: 'Two friends at a door, each waving the other through. Toggle hardware reordering and watch the printed output flip.' },
];

let activePlayer: UnitPlayer | null = null;
let activeLessonPlayer: LessonPlayer | null = null;

function initTheme(): void {
  try {
    const savedTheme = localStorage.getItem('os-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme(): void {
  const currentAttr = document.documentElement.getAttribute('data-theme');
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = currentAttr ? currentAttr === 'dark' : isSystemDark;
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('os-theme', next);
  } catch {
    // ignore
  }
}

function renderNav(currentPath: string): HTMLElement {
  const nav = document.createElement('header');
  nav.className = 'top-nav';

  const brand = document.createElement('a');
  brand.href = '#/';
  brand.className = 'brand';
  brand.textContent = 'OS Animations';

  const ul = document.createElement('ul');
  ul.className = 'chapter-links';

  CHAPTERS.forEach(ch => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#/${ch.slug}`;
    a.className = 'chapter-link';
    a.textContent = ch.title;
    if (currentPath.startsWith(`/${ch.slug}`)) {
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    ul.appendChild(li);
  });

  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.className = 'theme-toggle';
  themeBtn.setAttribute('aria-label', 'Toggle light/dark theme');
  themeBtn.innerHTML = '🌓';
  themeBtn.addEventListener('click', () => {
    toggleTheme();
  });

  nav.append(brand, ul, themeBtn);
  return nav;
}

function renderIndex(): HTMLElement {
  const container = document.createElement('main');
  container.className = 'unit-layout';
  container.style.gridTemplateColumns = '1fr';
  container.style.padding = 'calc(var(--step) * 4)';

  const header = document.createElement('section');
  header.style.textAlign = 'center';
  header.style.marginBottom = 'calc(var(--step) * 4)';

  const title = document.createElement('h1');
  title.style.fontSize = '2.4rem';
  title.style.marginBottom = 'var(--step)';
  title.textContent = 'Operating Systems Concepts';

  const subtitle = document.createElement('p');
  subtitle.style.fontSize = '1.1rem';
  subtitle.style.color = 'var(--muted)';
  subtitle.textContent = '20 Interactive Lessons & Reference Layer across 5 core lectures.';

  header.append(title, subtitle);

  // Featured Lesson Card
  const featured = LESSONS_META[1]; // Lesson 2 — first shipped interactive lesson
  const featuredCard = document.createElement('div');
  featuredCard.style.marginBottom = 'calc(var(--step) * 4)';
  featuredCard.innerHTML = `
    <a href="#/${featured.chapterSlug}/${featured.slug}" style="display: block; padding: calc(var(--step) * 3); background: var(--surface); border: 1px solid var(--accent); border-radius: var(--rounded-lg, 18px); text-decoration: none; color: inherit;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--step); flex-wrap: wrap; gap: var(--step);">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px;">Featured Interactive Lesson</span>
      </div>
      <h2 style="font-size: 1.55rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: var(--step); color: var(--ink);">Lesson ${featured.id}: ${featured.title}</h2>
      <p style="font-size: 17px; line-height: 1.47; letter-spacing: -0.374px; color: var(--muted); margin-bottom: var(--step);">
        ${featured.blurb}
      </p>
      <div style="font-weight: 600; color: var(--accent); font-size: 0.95rem;">Launch Interactive Lesson &rarr;</div>
    </a>
  `;

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  grid.style.gap = 'calc(var(--step) * 3)';

  CHAPTERS.forEach(ch => {
    const card = document.createElement('a');
    card.href = `#/${ch.slug}`;
    card.style.display = 'block';
    card.style.background = 'var(--surface)';
    card.style.border = '1px solid var(--hairline)';
    card.style.borderRadius = 'var(--rounded-lg, 18px)';
    card.style.padding = 'calc(var(--step) * 3)';
    card.style.transition = 'transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)';

    const num = document.createElement('span');
    num.style.fontSize = '0.85rem';
    num.style.fontWeight = '700';
    num.style.color = 'var(--accent)';
    num.textContent = `Lecture ${ch.id}`;

    const h2 = document.createElement('h2');
    h2.style.fontSize = '1.25rem';
    h2.style.fontWeight = '600';
    h2.style.letterSpacing = '-0.02em';
    h2.style.margin = 'calc(var(--step)) 0';
    h2.textContent = ch.topic;

    const count = document.createElement('p');
    count.style.fontSize = '0.9rem';
    count.style.color = 'var(--muted)';
    const lessonCount = LESSONS_META.filter(l => l.chapterSlug === ch.slug).length;
    count.textContent = lessonCount > 0 ? `${lessonCount} interactive lessons` : `${ch.unitCount} animated units`;

    card.append(num, h2, count);
    grid.appendChild(card);
  });

  container.append(header, featuredCard, grid);
  return container;
}

function renderChapter(chSlug: string): HTMLElement {
  const ch = CHAPTERS.find(c => c.slug === chSlug);
  const container = document.createElement('main');
  container.className = 'unit-layout';
  container.style.gridTemplateColumns = '1fr';
  container.style.padding = 'calc(var(--step) * 4)';

  if (!ch) {
    container.innerHTML = `<h2>Chapter not found</h2><p><a href="#/">Return home</a></p>`;
    return container;
  }

  const heading = document.createElement('h1');
  heading.textContent = `Lecture ${ch.id}: ${ch.topic}`;
  heading.style.marginBottom = 'calc(var(--step) * 2)';

  const desc = document.createElement('p');
  desc.style.color = 'var(--muted)';
  desc.style.marginBottom = 'calc(var(--step) * 3)';
  desc.textContent = `Lecture interactive lessons and reference layer:`;

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'calc(var(--step) * 1.5)';

  const chapterLessons = LESSONS_META.filter(l => l.chapterSlug === chSlug);
  chapterLessons.forEach(lesson => {
    const lessonItem = document.createElement('li');
    lessonItem.innerHTML = `
      <a href="#/${lesson.chapterSlug}/${lesson.slug}" style="display: flex; align-items: center; justify-content: space-between; padding: calc(var(--step)*2); background: var(--surface); border: 1px solid var(--accent); border-radius: var(--rounded-lg, 18px);">
        <div>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--accent); text-transform: uppercase;">Lesson ${lesson.id}</span>
          <div style="font-size: 1.15rem; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); margin-top: 2px;">${lesson.title}</div>
          <div style="font-size: 0.88rem; color: var(--muted); margin-top: 2px;">${lesson.blurb}</div>
        </div>
        <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem; padding: 6px 14px; border-radius: var(--rounded-pill, 9999px); background: rgba(0, 102, 204, 0.08);">Launch &rarr;</span>
      </a>
    `;
    list.appendChild(lessonItem);
  });

  if (ch.id === 6) {
    // Unit 7
    const unit7Item = document.createElement('li');
    unit7Item.innerHTML = `
      <a href="#/lecture-06/fcfs" style="display: flex; align-items: center; justify-content: space-between; padding: calc(var(--step)*2); background: var(--surface); border: 1px solid var(--rule); border-radius: 6px;">
        <div>
          <span style="font-size: 0.8rem; color: var(--muted);">Unit 7 (Baseline)</span>
          <div style="font-weight: 600; color: var(--ink);">First-Come, First-Served (FCFS)</div>
        </div>
        <span style="color: var(--muted); font-size: 0.85rem;">slide 8 &rarr;</span>
      </a>
    `;
    list.appendChild(unit7Item);
  }

  container.append(heading, desc, list);
  return container;
}

async function renderLessonRoute(lectureSlug: string, lessonSlug: string, mainContainer: HTMLElement): Promise<void> {
  try {
    const lesson = await loadLessonDynamically(lectureSlug, lessonSlug);
    if (!lesson) {
      mainContainer.innerHTML = `
        <div class="unit-not-found" style="padding: calc(var(--step)*3);">
          <h2>Lesson not found</h2>
          <p>The lesson "${lessonSlug}" in ${lectureSlug} could not be located.</p>
        </div>
      `;
      return;
    }

    const ch = CHAPTERS.find(c => c.slug === lectureSlug);

    // Left chapter rail
    const leftRail = document.createElement('aside');
    leftRail.className = 'unit-sidebar-rail';
    leftRail.style.display = 'flex';
    leftRail.style.flexDirection = 'column';
    leftRail.style.gap = 'var(--step)';
    leftRail.innerHTML = `
      <a href="#/${lectureSlug}" style="font-weight: 600; color: var(--accent); margin-bottom: var(--step); display: inline-block;">&larr; All ${ch?.title ?? 'Chapter'} Lessons</a>
      <div style="font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Active Chapter</div>
      <div style="font-weight: 600; margin-bottom: var(--step);">${ch?.topic ?? ''}</div>
      <div style="padding: 14px; background: var(--surface); border-left: 4px solid var(--accent); border-radius: var(--rounded-lg, 18px); border: 1px solid var(--hairline); font-weight: 600;">
        Lesson ${lesson.id}: ${lesson.title}
      </div>
      <div style="margin-top: var(--step); padding: 14px; font-size: 0.85rem; background: var(--canvas-parchment, #f5f5f7); border-radius: var(--rounded-lg, 18px); border: 1px solid var(--hairline); color: var(--ink-2); line-height: 1.45;">
        <strong style="color: var(--ink);">Interactive Lenses</strong><br>
        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: var(--muted);">
          <div>• Physical Analogy (${lesson.analogy.domain})</div>
          <div>• OS Mechanism Timeline</div>
          <div>• Drag or scrub to morph between them</div>
        </div>
      </div>
    `;

    // Center animation column
    const centerCol = document.createElement('section');
    centerCol.className = 'unit-center-col';
    centerCol.style.display = 'flex';
    centerCol.style.flexDirection = 'column';
    centerCol.style.gap = 'calc(var(--step) * 0.9)';

    const lessonHeader = document.createElement('div');
    lessonHeader.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; flex-wrap: wrap; gap: 4px;">
        <span style="font-size: 0.82rem; color: var(--accent); font-weight: 600; font-family: var(--font-mono);">Lesson ${lesson.id} · Lecture ${lesson.lecture} · ${lesson.slides}</span>
      </div>
      <h1 style="font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 4px 0; color: var(--ink);">${lesson.title}</h1>
    `;
    centerCol.appendChild(lessonHeader);

    // Mount engine & LessonPlayer (opens at view = 0 per §3C.3)
    const animMountTarget = document.createElement('div');
    const engine = mountLesson(lesson, animMountTarget, 0);
    if (!engine) {
      centerCol.appendChild(animMountTarget);
      mainContainer.append(leftRail, centerCol);
      return;
    }

    activeLessonPlayer = new LessonPlayer(centerCol, engine, animMountTarget, lesson.morphReveals, lesson.morphMode, lesson.lensLabels);

    // Right sidebar: Concept explanation & physical analogy
    const rightSidebar = document.createElement('aside');
    rightSidebar.className = 'unit-right-sidebar';
    rightSidebar.style.display = 'flex';
    rightSidebar.style.flexDirection = 'column';
    rightSidebar.style.gap = 'var(--step)';

    const conceptCard = document.createElement('div');
    conceptCard.style.padding = '14px 16px';
    conceptCard.style.background = 'var(--surface)';
    conceptCard.style.border = '1px solid var(--hairline)';
    conceptCard.style.borderRadius = 'var(--rounded-lg, 18px)';
    conceptCard.innerHTML = `
      <h3 style="font-size: 1.05rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 6px; color: var(--ink);">OS Concept</h3>
      <p style="font-family: var(--font-ui); font-size: 15.5px; line-height: 1.45; letter-spacing: -0.3px; color: var(--ink);">${lesson.concept}</p>
    `;

    const analogyDomainColor = lesson.analogy.domain === 'travel' ? 'var(--travel)' : lesson.analogy.domain === 'food' ? 'var(--food)' : 'var(--friends)';
    const analogyCard = document.createElement('div');
    analogyCard.style.padding = '14px 16px';
    analogyCard.style.background = 'var(--surface)';
    analogyCard.style.border = '1px solid var(--hairline)';
    analogyCard.style.borderRadius = 'var(--rounded-lg, 18px)';
    analogyCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <h3 style="font-size: 1.05rem; font-weight: 600; letter-spacing: -0.02em; color: var(--ink);">Physical Analogy</h3>
        <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: ${analogyDomainColor}; border: 1px solid currentColor; padding: 2px 8px; border-radius: var(--rounded-pill, 9999px);">${lesson.analogy.domain}</span>
      </div>
      <p style="font-family: var(--font-ui); font-style: italic; font-size: 15.5px; line-height: 1.45; letter-spacing: -0.3px; color: var(--ink-2);">${lesson.analogy.text}</p>
      ${(lesson as any).analogyMapping && (lesson as any).analogyMapping.length > 0 ? `
      <div style="margin-top: calc(var(--step) * 1.5); font-size: 0.88rem; line-height: 1.5; color: var(--muted); border-top: 1px solid var(--hairline); padding-top: var(--step);">
        <strong style="color: var(--ink);">How the Analogy Maps to the OS:</strong><br>
        ${(lesson as any).analogyMapping.map((m: string) => `• ${m}`).join('<br>')}
      </div>` : ''}
    `;

    rightSidebar.append(conceptCard, analogyCard);
    mainContainer.append(leftRail, centerCol, rightSidebar);
  } catch (err) {
    renderFallback(mainContainer, { slug: lessonSlug }, err);
  }
}

async function renderUnitRoute(lectureSlug: string, unitSlug: string, mainContainer: HTMLElement): Promise<void> {
  try {
    const unit = await loadUnitDynamically(lectureSlug, unitSlug);
    if (!unit) {
      mainContainer.innerHTML = `
        <div class="unit-not-found" style="padding: calc(var(--step)*3);">
          <h2>Unit not found</h2>
          <p>The unit "${unitSlug}" in ${lectureSlug} could not be located.</p>
        </div>
      `;
      return;
    }

    const ch = CHAPTERS.find(c => c.slug === lectureSlug);

    // Left chapter rail
    const leftRail = document.createElement('aside');
    leftRail.className = 'unit-sidebar-rail';
    leftRail.style.display = 'flex';
    leftRail.style.flexDirection = 'column';
    leftRail.style.gap = 'var(--step)';
    leftRail.innerHTML = `
      <a href="#/${lectureSlug}" style="font-weight: 600; color: var(--accent); margin-bottom: var(--step); display: inline-block;">&larr; All ${ch?.title ?? 'Chapter'} Units</a>
      <div style="font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">Active Chapter</div>
      <div style="font-weight: 600; margin-bottom: var(--step);">${ch?.topic ?? ''}</div>
      <div style="padding: calc(var(--step)*1.5); background: var(--surface); border-left: 3px solid var(--accent); border-radius: 4px; font-weight: 500;">
        Unit ${unit.id}: ${unit.title}
      </div>
    `;

    // Center animation column
    const centerCol = document.createElement('section');
    centerCol.className = 'unit-center-col';
    centerCol.style.display = 'flex';
    centerCol.style.flexDirection = 'column';
    centerCol.style.gap = 'calc(var(--step)*2)';

    const unitHeader = document.createElement('div');
    unitHeader.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--step); flex-wrap: wrap; gap: var(--step);">
        <span style="font-size: 0.85rem; color: var(--accent); font-weight: 600; font-family: var(--font-mono);">Unit ${unit.id} · Lecture ${unit.lecture} · ${unit.slides}</span>
        <span style="font-size: 0.85rem; padding: 2px 8px; border-radius: 4px; background: var(--surface-alt); border: 1px solid var(--rule); text-transform: uppercase; font-family: var(--font-mono);">${unit.engine}</span>
      </div>
      <h1 style="font-size: 1.8rem; margin-bottom: var(--step);">${unit.title}</h1>
    `;
    centerCol.appendChild(unitHeader);

    // Mount engine & UnitPlayer
    const animMountTarget = document.createElement('div');
    const engine = mountUnit(unit, animMountTarget);
    if (!engine) {
      centerCol.appendChild(animMountTarget);
      mainContainer.append(leftRail, centerCol);
      return;
    }

    activePlayer = new UnitPlayer(centerCol, engine, animMountTarget);

    // Right sidebar: Concept prose & physical analogy
    const rightSidebar = document.createElement('aside');
    rightSidebar.className = 'unit-right-sidebar';
    rightSidebar.style.display = 'flex';
    rightSidebar.style.flexDirection = 'column';
    rightSidebar.style.gap = 'calc(var(--step)*2)';

    const conceptCard = document.createElement('div');
    conceptCard.style.padding = 'calc(var(--step)*2)';
    conceptCard.style.background = 'var(--surface)';
    conceptCard.style.border = '1px solid var(--rule)';
    conceptCard.style.borderRadius = '8px';
    conceptCard.innerHTML = `
      <h3 style="font-size: 1.05rem; margin-bottom: var(--step); color: var(--ink);">Concept</h3>
      <p style="font-family: var(--font-prose); font-size: 0.95rem; line-height: 1.6; color: var(--ink-2);">${unit.concept}</p>
    `;

    const analogyDomainColor = unit.analogy.domain === 'travel' ? 'var(--travel)' : unit.analogy.domain === 'food' ? 'var(--food)' : 'var(--friends)';
    const analogyCard = document.createElement('div');
    analogyCard.style.padding = 'calc(var(--step)*2)';
    analogyCard.style.background = 'var(--surface)';
    analogyCard.style.border = '1px solid var(--rule)';
    analogyCard.style.borderRadius = '8px';
    analogyCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--step);">
        <h3 style="font-size: 1.05rem; color: var(--ink);">Real-Life Analogy</h3>
        <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: ${analogyDomainColor}; border: 1px solid currentColor; padding: 2px 6px; border-radius: 4px;">${unit.analogy.domain}</span>
      </div>
      <p style="font-family: var(--font-prose); font-style: italic; font-size: 0.95rem; line-height: 1.6; color: var(--ink-2);">${unit.analogy.text}</p>
    `;

    rightSidebar.append(conceptCard, analogyCard);
    mainContainer.append(leftRail, centerCol, rightSidebar);
  } catch (err) {
    renderFallback(mainContainer, { slug: unitSlug }, err);
  }
}

async function handleRoute(): Promise<void> {
  if (activePlayer) {
    activePlayer.destroy();
    activePlayer = null;
  }
  if (activeLessonPlayer) {
    activeLessonPlayer.destroy();
    activeLessonPlayer = null;
  }

  const hash = window.location.hash.slice(1) || '/';
  const app = document.getElementById('app');
  if (!app) return;

  app.replaceChildren();
  app.appendChild(renderNav(hash));

  if (hash === '/' || hash === '') {
    app.appendChild(renderIndex());
  } else if (hash === '/lesson-02' || hash === '/lecture-06/lesson-02') {
    const mainContainer = document.createElement('main');
    mainContainer.className = 'unit-layout';
    app.appendChild(mainContainer);
    await renderLessonRoute('lecture-06', 'lesson-02', mainContainer);
  } else if (hash.startsWith('/lecture-')) {
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 1) {
      app.appendChild(renderChapter(parts[0]));
    } else {
      const mainContainer = document.createElement('main');
      mainContainer.className = 'unit-layout';
      app.appendChild(mainContainer);
      if (parts[1].startsWith('lesson-')) {
        await renderLessonRoute(parts[0], parts[1], mainContainer);
      } else {
        await renderUnitRoute(parts[0], parts[1], mainContainer);
      }
    }
  } else {
    const notFound = document.createElement('main');
    notFound.style.padding = 'calc(var(--step) * 4)';
    notFound.innerHTML = `<h2>Page Not Found</h2><p><a href="#/">Back to home</a></p>`;
    app.appendChild(notFound);
  }
}

initTheme();
window.addEventListener('hashchange', () => {
  handleRoute().catch(console.error);
});
handleRoute().catch(console.error);
