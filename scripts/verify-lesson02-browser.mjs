import { chromium } from 'playwright';

async function main() {
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

  // Check initial view is 0 (Analogy view)
  const initialView = await page.$eval('input[aria-label*="View axis"]', el => el.value);
  console.log('Initial View Axis value:', initialView);

  const truckOpacity = await page.$eval('#truck-box', el => window.getComputedStyle(el).opacity);
  const coreOpacity = await page.$eval('#core-box', el => window.getComputedStyle(el).opacity);
  console.log('Analogy storefront opacity at view=0:', truckOpacity, '(Core opacity:', coreOpacity + ')');
  if (truckOpacity !== '1') {
    throw new Error('Expected truck-box opacity=1 at view=0, got ' + truckOpacity);
  }

  // Save screenshot of Analogy View
  await page.screenshot({ path: '/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/lesson02_analogy_view.png' });

  // Check scoreboard initial metrics (Slide 8: 17 ms)
  const waitScoreboard = await page.textContent('.lesson-scoreboard');
  console.log('Scoreboard text contains 17 ms:', waitScoreboard?.includes('17 ms'));
  if (!waitScoreboard?.includes('17 ms')) {
    throw new Error('Expected 17 ms initial avg wait on scoreboard');
  }

  console.log('\n--- TEST LESSON 2.2: Mid-Morph (view = 0.5) ---');
  await page.fill('input[aria-label*="View axis"]', '0.5');
  await page.dispatchEvent('input[aria-label*="View axis"]', 'input');
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/lesson02_midmorph_view.png' });

  console.log('\n--- TEST LESSON 2.3: Morph View Axis to Mechanism (view = 1.0) ---');
  await page.click('button[title*="View as OS Gantt chart"]');
  await page.waitForTimeout(1000); // Allow GSAP morph tween to complete
  await page.screenshot({ path: '/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/lesson02_mechanism_view.png' });

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

  console.log('\n--- TEST LESSON 2.5: Responsive Verification at 360, 800, 1440 px ---');
  for (const width of [360, 800, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(200);

    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    console.log(`Viewport ${width}px:`, scrollInfo);
    if (scrollInfo.hasHScroll) {
      throw new Error(`Horizontal scroll detected at ${width}px!`);
    }

    const screenshotPath = `/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/lesson02_${width}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot: ${screenshotPath}`);
  }

  await browser.close();
  console.log('\n=== ALL LESSON 2 IN-BROWSER ACCEPTANCE GATES PASSED! ===');
}

main().catch(err => {
  console.error('LESSON 2 VERIFICATION FAILED:', err);
  process.exit(1);
});
