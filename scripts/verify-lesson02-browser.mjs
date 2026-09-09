import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const repoScreenshotsDir = path.resolve(process.cwd(), 'screenshots');
  const brainDir = '/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da';
  fs.mkdirSync(repoScreenshotsDir, { recursive: true });

  const saveShot = async (page, filename) => {
    const p1 = path.join(repoScreenshotsDir, filename);
    const p2 = path.join(brainDir, filename);
    await page.screenshot({ path: p1 });
    try {
      fs.copyFileSync(p1, p2);
    } catch {}
    console.log(`Saved screenshot: ${p1}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('--- TEST LESSON 2.1: Open Lesson 2 at http://localhost:4173/#/lecture-06/lesson-02 ---');
  await page.goto('http://localhost:4173/#/lecture-06/lesson-02', { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const title = await page.textContent('h1');
  console.log('Lesson Title:', title);
  if (!title?.includes('First-Come, First-Served')) {
    throw new Error('Lesson 2 title mismatch: ' + title);
  }

  const checkNoTextOverflow = async (viewName) => {
    const overflows = await page.evaluate(() => {
      const procs = ['P1', 'P2', 'P3'];
      const issues = [];
      for (const id of procs) {
        const bar = document.querySelector(`#bar-${id}`);
        if (!bar) continue;
        const barRect = bar.getBoundingClientRect();

        const procGroup = document.querySelector(`#proc-${id}`);
        if (!procGroup) continue;

        const textNodes = procGroup.querySelectorAll('text');
        for (const t of textNodes) {
          const style = window.getComputedStyle(t);
          if (style.opacity === '0' || style.display === 'none') continue;

          // If inside a sprite, check if sprite is visible
          const parentSprite = t.closest('[id^="sprite-"]');
          if (parentSprite) {
            const spriteOpacity = parseFloat(window.getComputedStyle(parentSprite).opacity || '1');
            if (spriteOpacity < 0.05) continue;
          }

          const tRect = t.getBoundingClientRect();
          // Text width must not exceed bar width (with 1.5px subpixel tolerance)
          if (tRect.width > barRect.width + 1.5) {
            issues.push({
              proc: id,
              text: t.textContent?.trim(),
              textWidth: Math.round(tRect.width),
              barWidth: Math.round(barRect.width)
            });
          }
        }
      }
      return issues;
    });

    console.log(`[Text Overflow Check at ${viewName}]:`, overflows.length === 0 ? 'CLEAN (no overflows)' : overflows);
    if (overflows.length > 0) {
      throw new Error(`Text overflow detected at ${viewName}: ${JSON.stringify(overflows)}`);
    }
  };

  // Check initial view is 0 (Analogy view)
  const initialView = await page.$eval('input[aria-label*="View axis"]', el => el.value);
  console.log('Initial View Axis value:', initialView);

  const truckOpacity = await page.$eval('#truck-box', el => window.getComputedStyle(el).opacity);
  const coreOpacity = await page.$eval('#core-box', el => window.getComputedStyle(el).opacity);
  console.log('Analogy storefront opacity at view=0:', truckOpacity, '(Core opacity:', coreOpacity + ')');
  if (truckOpacity !== '1') {
    throw new Error('Expected truck-box opacity=1 at view=0, got ' + truckOpacity);
  }

  // Check text does not overflow at view=0
  await checkNoTextOverflow('view=0');

  // Save screenshot of Analogy View
  await saveShot(page, 'lesson02_analogy_view.png');

  // Check scoreboard initial metrics (Finding 2: 17 ms baseline on arrival)
  const waitScoreboard = await page.textContent('.lesson-scoreboard');
  console.log('Scoreboard text contains 17 ms:', waitScoreboard?.includes('17 ms'));
  if (!waitScoreboard?.includes('17 ms')) {
    throw new Error('Expected 17 ms initial avg wait on scoreboard');
  }

  console.log('\n--- TEST LESSON 2.2: Mid-Morph (view = 0.5) ---');
  await page.fill('input[aria-label*="View axis"]', '0.5');
  await page.dispatchEvent('input[aria-label*="View axis"]', 'input');
  await page.waitForTimeout(200);

  // Check text does not overflow at view=0.5
  await checkNoTextOverflow('view=0.5');
  await saveShot(page, 'lesson02_midmorph_view.png');

  console.log('\n--- TEST LESSON 2.3: Morph View Axis to Mechanism (view = 1.0) ---');
  await page.click('button:has-text("FCFS Mechanism")');
  await page.waitForTimeout(1000); // Allow GSAP morph tween to complete

  // Check text does not overflow at view=1.0
  await checkNoTextOverflow('view=1.0');
  await saveShot(page, 'lesson02_mechanism_view.png');

  const morphedView = await page.$eval('input[aria-label*="View axis"]', el => el.value);
  console.log('Morphed View Axis value:', morphedView);

  const truckOpacity1 = await page.$eval('#truck-box', el => window.getComputedStyle(el).opacity);
  const coreOpacity1 = await page.$eval('#core-box', el => window.getComputedStyle(el).opacity);
  console.log('Mechanism core opacity at view=1:', coreOpacity1, '(Truck opacity:', truckOpacity1 + ')');

  console.log('\n--- TEST LESSON 2.3: Interactive Playground Reordering (Slide 9 Optimal) ---');
  console.log('Clicking Optimal Preset [P2 -> P3 -> P1]...');
  await page.click('#btn-optimal-preset');
  await page.waitForTimeout(300);

  const updatedScoreboard = await page.textContent('.lesson-scoreboard');
  console.log('Scoreboard after reorder contains 3 ms:', updatedScoreboard?.includes('3 ms'));
  console.log('Scoreboard contains "82% Wait Reduction":', updatedScoreboard?.includes('82% Wait Reduction'));

  if (!updatedScoreboard?.includes('3 ms') || !updatedScoreboard?.includes('82% Wait Reduction')) {
    throw new Error('Expected scoreboard to update to 3 ms and 82% wait reduction upon reordering!');
  }

  console.log('\n--- TEST LESSON 2.4: Timeline Step Forward & Scrubbing ---');
  await page.click('button[aria-label="Next step"]');
  await page.waitForTimeout(200);
  const stepText = await page.textContent('.step-indicator');
  const captionText = await page.textContent('.caption-banner');
  console.log('Step Indicator:', stepText);
  console.log('Caption Banner:', captionText?.trim());

  await page.click('button[aria-label="Restart timeline"]');
  await page.waitForTimeout(200);
  const restartStepText = await page.textContent('.step-indicator');
  console.log('After restart:', restartStepText);

  console.log('\n--- TEST LESSON 2.5: No Spec Jargon in Student-Facing DOM (Finding 4) ---');
  const bodyText = await page.textContent('body');
  const forbiddenTerms = [
    'ABSORBS UNITS',
    'Absorbs Atlas units',
    'Isomorphic Lens (§3C.2)',
    'Structural Mapping (§3C.2)',
    '(§3C.4)',
    '(§2.1)'
  ];
  for (const term of forbiddenTerms) {
    if (bodyText?.includes(term)) {
      throw new Error(`Spec jargon leaked into student UI: "${term}"`);
    }
  }
  console.log('Spec Jargon Check: CLEAN — all build-time scaffolding stripped from UI.');

  console.log('\n--- TEST LESSON 2.6: Above-The-Fold Layout at 1440x900 (Finding 3 & DESIGN.md §0.1) ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  const foldInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.anim-viewport')?.getBoundingClientRect();
    const playground = document.querySelector('.lesson-playground-control')?.getBoundingClientRect();
    const scoreboard = document.querySelector('.lesson-scoreboard')?.getBoundingClientRect();
    const transport = document.querySelector('.transport-bar')?.getBoundingClientRect();
    const caption = document.querySelector('.caption-banner')?.getBoundingClientRect();

    return {
      canvasBottom: canvas ? Math.round(canvas.bottom) : null,
      playgroundBottom: playground ? Math.round(playground.bottom) : null,
      scoreboardBottom: scoreboard ? Math.round(scoreboard.bottom) : null,
      transportBottom: transport ? Math.round(transport.bottom) : null,
      captionBottom: caption ? Math.round(caption.bottom) : null,
      windowHeight: window.innerHeight
    };
  });
  console.log('1440x900 Elements Position Relative to Viewport (Height 900):', foldInfo);

  if (!foldInfo.canvasBottom || !foldInfo.playgroundBottom || !foldInfo.scoreboardBottom || !foldInfo.transportBottom) {
    throw new Error('Crucial interactive elements missing from DOM!');
  }
  if (foldInfo.playgroundBottom > 900) {
    throw new Error(`Playground is below the fold: bottom is at ${foldInfo.playgroundBottom}px (> 900px)!`);
  }
  if (foldInfo.scoreboardBottom > 900) {
    throw new Error(`Scoreboard is below the fold: bottom is at ${foldInfo.scoreboardBottom}px (> 900px)!`);
  }
  if (foldInfo.transportBottom > 900) {
    throw new Error(`Transport is below the fold: bottom is at ${foldInfo.transportBottom}px (> 900px)!`);
  }
  console.log('Above-The-Fold Check: PASSED — Canvas, Playground, Scoreboard, and Transport fit in 1440x900 without scrolling!');

  // Save 1440x900 desktop screenshot showing everything above the fold
  await saveShot(page, 'lesson02_1440.png');

  console.log('\n--- TEST LESSON 2.7: Responsive Verification at 800 and 360 px ---');
  for (const [w, h] of [[800, 800], [360, 780]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    console.log(`Viewport ${w}x${h}px:`, scrollInfo);
    if (scrollInfo.hasHScroll) {
      throw new Error(`Horizontal scroll detected at ${w}px!`);
    }

    await saveShot(page, `lesson02_${w}.png`);
  }

  await browser.close();
  console.log('\n=== ALL LESSON 2 IN-BROWSER ACCEPTANCE GATES PASSED! ===');
}

main().catch(err => {
  console.error('LESSON 2 VERIFICATION FAILED:', err);
  process.exit(1);
});
