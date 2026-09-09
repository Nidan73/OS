import './styles/base.css';
import { loadUnitDynamically, mountUnit, renderFallback } from './core/registry.js';
import { UnitPlayer } from './components/UnitPlayer.js';

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

let activePlayer: UnitPlayer | null = null;

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
  subtitle.textContent = '89 interactive 2D animated lessons across 5 core lectures.';

  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  grid.style.gap = 'calc(var(--step) * 3)';

  CHAPTERS.forEach(ch => {
    const card = document.createElement('a');
    card.href = `#/${ch.slug}`;
    card.style.display = 'block';
    card.style.background = 'var(--surface)';
    card.style.border = '1px solid var(--rule)';
    card.style.borderRadius = '8px';
    card.style.padding = 'calc(var(--step) * 3)';
    card.style.transition = 'transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)';

    const num = document.createElement('span');
    num.style.fontSize = '0.85rem';
    num.style.fontWeight = '700';
    num.style.color = 'var(--accent)';
    num.textContent = `Lecture ${ch.id}`;

    const h2 = document.createElement('h2');
    h2.style.fontSize = '1.25rem';
    h2.style.margin = 'calc(var(--step)) 0';
    h2.textContent = ch.topic;

    const count = document.createElement('p');
    count.style.fontSize = '0.9rem';
    count.style.color = 'var(--muted)';
    count.textContent = `${ch.unitCount} animated units`;

    card.append(num, h2, count);
    grid.appendChild(card);
  });

  container.append(header, grid);
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
  desc.textContent = `Lecture overview. Select a unit below:`;

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--step)';

  if (ch.id === 6) {
    const item = document.createElement('li');
    item.innerHTML = `
      <a href="#/lecture-06/fcfs" style="display: flex; align-items: center; justify-content: space-between; padding: calc(var(--step)*2); background: var(--surface); border: 1px solid var(--rule); border-radius: 6px;">
        <span><strong>Unit 7:</strong> First-Come, First-Served (FCFS)</span>
        <span style="color: var(--muted); font-size: 0.85rem;">slide 8 &rarr;</span>
      </a>
    `;
    list.appendChild(item);
  }

  container.append(heading, desc, list);
  return container;
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

  const hash = window.location.hash.slice(1) || '/';
  const app = document.getElementById('app');
  if (!app) return;

  app.replaceChildren();
  app.appendChild(renderNav(hash));

  if (hash === '/' || hash === '') {
    app.appendChild(renderIndex());
  } else if (hash.startsWith('/lecture-')) {
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 1) {
      app.appendChild(renderChapter(parts[0]));
    } else {
      const mainContainer = document.createElement('main');
      mainContainer.className = 'unit-layout';
      app.appendChild(mainContainer);
      await renderUnitRoute(parts[0], parts[1], mainContainer);
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
