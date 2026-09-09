import './styles/base.css';

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

function initTheme(): void {
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('os-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {
    // ignore in restricted private browsing
  }
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
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
  desc.textContent = `Phase 0 scaffold active. ${ch.unitCount} units will load dynamically.`;

  container.append(heading, desc);
  return container;
}

function handleRoute(): void {
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
      // Unit route placeholder
      const placeholder = document.createElement('main');
      placeholder.className = 'unit-layout';
      placeholder.innerHTML = `<h2>Unit Route: ${hash}</h2><p>Engine dynamically mounts here.</p>`;
      app.appendChild(placeholder);
    }
  } else {
    const notFound = document.createElement('main');
    notFound.style.padding = 'calc(var(--step) * 4)';
    notFound.innerHTML = `<h2>Page Not Found</h2><p><a href="#/">Back to home</a></p>`;
    app.appendChild(notFound);
  }
}

initTheme();
window.addEventListener('hashchange', handleRoute);
handleRoute();
