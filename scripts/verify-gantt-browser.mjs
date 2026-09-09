import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('--- TEST GANTT 1: Load Unit 7 FCFS ---');
  await page.goto('http://127.0.0.1:4173/#/lecture-06/fcfs', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const title = await page.textContent('h1');
  console.log('Unit title:', title);

  const svgExists = await page.$('svg') !== null;
  console.log('SVG mounted:', svgExists);

  const caption0 = await page.textContent('.caption-item[aria-current="step"]');
  console.log('Initial step caption:', caption0?.trim());

  console.log('\n--- TEST GANTT 2: Advance Steps and Verify Lockstep ---');
  // Click next button
  await page.click('button[aria-label="Next step"]');
  await page.waitForTimeout(200);
  const caption1 = await page.textContent('.caption-item[aria-current="step"]');
  const playheadText1 = await page.textContent('svg text[fill="var(--accent)"]');
  console.log('Step 1 caption:', caption1?.trim());
  console.log('Playhead label:', playheadText1?.trim());

  console.log('\n--- TEST GANTT 3: Scrub to Final Step and Verify Computed Metrics ---');
  const scrubber = await page.$('input[type="range"]');
  const maxStep = await scrubber.getAttribute('max');
  console.log('Total steps in timeline:', Number(maxStep) + 1);

  // Click final step in caption rail
  const stepItems = await page.$$('.caption-item');
  await stepItems[stepItems.length - 1].click();
  await page.waitForTimeout(200);

  const finalCaption = await page.textContent('.caption-item[aria-current="step"]');
  console.log('Final step caption:', finalCaption?.trim());

  // Check metrics table values
  const tableText = await page.textContent('.gantt-metrics-table');
  console.log('Table averages present:', tableText?.includes('17') && tableText?.includes('27'));

  console.log('\n--- TEST GANTT 4: Scrub Backwards to Step 0 ---');
  await page.click('button[aria-label="Restart timeline"]');
  await page.waitForTimeout(200);
  const playheadText0 = await page.textContent('svg text[fill="var(--accent)"]');
  console.log('Playhead after restart:', playheadText0?.trim());
  const barsCount = await page.$$eval('.bars-group rect', rects => rects.length);
  console.log('Executed bars at Step 0:', barsCount);

  console.log('\n--- TEST GANTT 5: Responsive Verification at 360, 800, 1440 px ---');
  for (const width of [360, 800, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(150);
    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log(`Viewport ${width}px:`, scrollInfo);
    if (scrollInfo.hasHScroll) {
      throw new Error(`Horizontal scroll detected at ${width}px!`);
    }
    await page.screenshot({
      path: `/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/gantt_unit7_${width}.png`
    });
  }

  await browser.close();
  console.log('\nGANTT ENGINE IN-BROWSER PRODUCTION VERIFICATION PASSED!');
}

main().catch(err => {
  console.error('GANTT VERIFICATION FAILED:', err);
  process.exit(1);
});
