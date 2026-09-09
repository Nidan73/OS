/**
 * gate.mjs — the automated quality gate for every lesson.
 *
 * Encodes the review criteria that were previously caught by eye. A lesson that
 * fails the gate is not finished, and must not be reported as complete.
 *
 *   npm run gate                  # every lesson in LESSONS.md
 *   npm run gate -- lesson-02     # one lesson
 *
 * Requires a production preview server on :4173 —  npm run build && npm run preview
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.GATE_BASE ?? 'http://localhost:4173';
const SHOTS = path.resolve(process.cwd(), 'screenshots');

/** Lessons to gate. Add each new lesson here as it is built. */
const LESSONS = [
  { slug: 'lesson-02', chapter: 'lecture-06', name: 'FCFS & the convoy' },
  { slug: 'lesson-04', chapter: 'lecture-06', name: 'Round robin & fairness' },
];

/** Internal vocabulary that must never reach a student. */
const JARGON = [
  /§\s*\d/,                    // spec section references
  /\bAtlas unit/i,
  /\bABSORBS\b/i,
  /\bisomorph/i,               // "Isomorphic Lens" etc.
  /\bSPEC\.md\b/i,
  /\bview\s*=\s*[01]\b/i,      // "view = 0" as UI copy
  /\bmorphMode\b/,
  /\bengine\b(?!ering)/i,      // "gantt engine" leaking into copy
];

const VIEWPORTS = [
  { w: 360, h: 780, name: '360' },
  { w: 800, h: 1000, name: '800' },
  { w: 1440, h: 900, name: '1440' },
];

let failures = [];
let checks = 0;

function check(cond, label, detail = '') {
  checks++;
  if (!cond) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  return cond;
}

/** Relative luminance per WCAG 2.x */
function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

function parseRGB(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((n) => parseFloat(n));
  if (parts.length >= 4 && parts[3] === 0) return null; // fully transparent
  return parts.slice(0, 3);
}

/** Set the lesson's view lens and let the tween settle. */
async function setView(page, v) {
  const ok = await page.evaluate((val) => {
    if (window.__lesson?.setView) { window.__lesson.setView(val); return true; }
    // preferred: an explicit hook. fallback: the only 0..1 range on the page.
    const slider =
      document.querySelector('[data-view-lens]') ??
      [...document.querySelectorAll('input[type="range"]')].find((el) => el.max === '1');
    if (!slider) return false;
    slider.value = String(val);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, v);
  if (!ok) throw new Error('no view lens found — expose [data-view-lens] or window.__lesson.setView');
  await page.waitForTimeout(450);
}

/** Geometry of every morphable entity, keyed by element id. */
async function geometryAt(page, v) {
  await setView(page, v);
  return page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[id^="bar-"]').forEach((el) => {
      const b = el.getBBox ? el.getBBox() : el.getBoundingClientRect();
      out[el.id] = { x: b.x, width: b.width };
    });
    return out;
  });
}

async function gateLesson(page, lesson) {
  const url = `${BASE}/#/${lesson.chapter}/${lesson.slug}`;
  const tag = `[${lesson.slug}]`;
  console.log(`\n── ${lesson.slug} · ${lesson.name}`);

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // ── 1. The page actually rendered, and did not hit the error boundary
  const fellBack = await page.locator('text=/failed to load/i').count();
  check(fellBack === 0, `${tag} error boundary`, 'lesson rendered its fallback card');

  const svgCount = await page.locator('svg').count();
  check(svgCount > 0, `${tag} canvas`, 'no SVG on the page');

  // ── 2. The morph is real: geometry must interpolate (SPEC §3C.2a, §3C.2c)
  const isCrossfade = await page.evaluate(() => window.__lesson?.morphMode === 'crossfade');
  if (isCrossfade) {
    check(true, `${tag} morph`, 'crossfade declared honestly (§3C.2b)');
  } else {
    const g0 = await geometryAt(page, 0);
    const g5 = await geometryAt(page, 0.5);
    const g1 = await geometryAt(page, 1);

    const ids = Object.keys(g0);
    check(ids.length > 0, `${tag} morph`, 'no [id^="bar-"] entities found');

    // same element set at both extremes
    check(
      JSON.stringify(Object.keys(g0).sort()) === JSON.stringify(Object.keys(g1).sort()),
      `${tag} isomorphism`,
      'element ids differ between view 0 and view 1'
    );

    // at least one entity must change geometry — else it is a reskin
    const anyGeometryMoved = ids.some(
      (id) => Math.abs(g0[id].width - g1[id].width) > 1 || Math.abs(g0[id].x - g1[id].x) > 1
    );
    check(
      anyGeometryMoved,
      `${tag} morph is real`,
      'geometry identical at view 0 and 1 — this is a reskin, not a morph (§3C.2a)'
    );

    // mid-morph must be strictly between the endpoints
    for (const id of ids) {
      const [a, m, b] = [g0[id].width, g5[id].width, g1[id].width];
      if (Math.abs(a - b) < 1) continue; // this entity legitimately does not resize
      check(
        m > Math.min(a, b) - 0.5 && m < Math.max(a, b) + 0.5,
        `${tag} interpolation ${id}`,
        `view0=${a.toFixed(1)} mid=${m.toFixed(1)} view1=${b.toFixed(1)} — not between`
      );
    }
  }

  // ── 3. No text clipped or overflowing its container at any view
  for (const v of [0, 0.5, 1]) {
    await setView(page, v);
    const clipped = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('svg text, .caption, .metric, .label').forEach((el) => {
        const t = (el.textContent ?? '').trim();
        if (!t) return;
        const parent = el.closest('g, .box, .card') ?? el.parentElement;
        if (!parent) return;
        const a = el.getBoundingClientRect();
        const b = parent.getBoundingClientRect();
        if (b.width < 2 || a.width < 2) return;
        if (a.right > b.right + 2 || a.left < b.left - 2) bad.push(t.slice(0, 40));
      });
      // also catch CSS-clipped text in normal flow
      document.querySelectorAll('.caption, .metric, .label, td, th').forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 2) bad.push((el.textContent ?? '').trim().slice(0, 40));
      });
      return [...new Set(bad)];
    });
    check(clipped.length === 0, `${tag} text overflow @view=${v}`, clipped.join(' | '));
  }

  await setView(page, 1);

  // ── 4. No internal vocabulary in student-facing copy
  const visibleText = await page.evaluate(() => document.body.innerText);
  for (const rx of JARGON) {
    const hit = visibleText.match(rx);
    check(!hit, `${tag} jargon`, hit ? `"${hit[0]}" is visible to the student` : '');
  }

  // ── 5. The primary control is above the fold at 1440x900 (DESIGN.md §0.1)
  const controlBox = await page.evaluate(() => {
    const el =
      document.querySelector('[data-primary-control]') ??
      document.querySelector('.lesson-playground-control, .playground, #playground');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
  const controlTop = controlBox ? controlBox.top : null;
  check(
    controlTop !== null,
    `${tag} playground`,
    'no [data-primary-control] found — mark the main interaction'
  );
  if (controlBox) {
    // must be FULLY visible, not merely starting above the fold
    check(
      controlBox.bottom <= 900,
      `${tag} playground above fold`,
      `primary control spans y=${Math.round(controlBox.top)}–${Math.round(controlBox.bottom)} ` +
        `at 1440x900; ${Math.round(controlBox.bottom - 900)}px below the fold (DESIGN.md §0.1)`
    );
  }

  // ── 6. Responsive floor: no horizontal body scroll at any width
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(250);
    const hScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    check(!hScroll, `${tag} h-scroll @${vp.name}`, 'body scrolls horizontally');
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `${lesson.slug}_${vp.name}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── 7. Both themes render, and body text passes WCAG AA
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(200);
    const sample = await page.evaluate(() => {
      const el = document.querySelector('p, .concept, .caption');
      if (!el) return null;
      const cs = getComputedStyle(el);
      let node = el, bg = 'rgba(0, 0, 0, 0)';
      while (node && bg === 'rgba(0, 0, 0, 0)') {
        bg = getComputedStyle(node).backgroundColor;
        node = node.parentElement;
      }
      return { fg: cs.color, bg, size: parseFloat(cs.fontSize) };
    });
    if (sample) {
      const fg = parseRGB(sample.fg), bg = parseRGB(sample.bg);
      if (fg && bg) {
        const ratio = contrastRatio(fg, bg);
        const min = sample.size >= 18.66 ? 3 : 4.5;
        check(
          ratio >= min,
          `${tag} contrast ${theme}`,
          `${ratio.toFixed(2)}:1 at ${sample.size}px, needs ${min}:1`
        );
      }
    }
    await page.screenshot({ path: path.join(SHOTS, `${lesson.slug}_${theme}.png`) });
  }
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

  // ── 8. Nothing threw while we were driving it
  check(consoleErrors.length === 0, `${tag} console`, consoleErrors.slice(0, 3).join(' | '));
}

async function main() {
  const only = process.argv[2];
  const targets = only ? LESSONS.filter((l) => l.slug === only) : LESSONS;
  if (targets.length === 0) {
    console.error(`No lesson matching "${only}". Known: ${LESSONS.map((l) => l.slug).join(', ')}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    for (const lesson of targets) await gateLesson(page, lesson);
  } catch (err) {
    failures.push(`gate crashed: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failures.length === 0) {
    console.log(`GATE PASSED — ${checks} checks across ${targets.length} lesson(s).`);
    process.exit(0);
  }
  console.log(`GATE FAILED — ${failures.length} of ${checks} checks:\n`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  console.log(`\nA lesson that fails the gate is not finished. Do not report it as complete.`);
  process.exit(1);
}

main();
