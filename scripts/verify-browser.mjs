import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('--- TEST 1: Load Shell ---');
  await page.goto('http://127.0.0.1:4173/#/');
  const title = await page.title();
  const brand = await page.textContent('.brand');
  console.log('Title:', title);
  console.log('Brand text:', brand);

  const chapterLinks = await page.$$eval('.chapter-link', els => els.map(e => ({
    text: e.textContent?.trim(),
    href: e.getAttribute('href'),
    current: e.getAttribute('aria-current')
  })));
  console.log('Chapter Links found:', chapterLinks.length);
  console.log(JSON.stringify(chapterLinks, null, 2));

  console.log('\n--- TEST 2: Navigate to L6 and aria-current ---');
  await page.click('a[href="#/lecture-06"]');
  await page.waitForTimeout(200);
  const l6Link = await page.$eval('a[href="#/lecture-06"]', e => ({
    text: e.textContent?.trim(),
    current: e.getAttribute('aria-current')
  }));
  console.log('L6 link state after click:', l6Link);

  const l6Heading = await page.textContent('main h1');
  console.log('Page heading on L6:', l6Heading);

  console.log('\n--- TEST 3: Theme Toggle Both Ways ---');
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Initial data-theme:', initialTheme);

  await page.click('.theme-toggle');
  const themeAfterClick1 = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('os-theme')
  }));
  console.log('Theme after 1st toggle:', themeAfterClick1);

  await page.click('.theme-toggle');
  const themeAfterClick2 = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('os-theme')
  }));
  console.log('Theme after 2nd toggle:', themeAfterClick2);

  console.log('\n--- TEST 4: Hard Refresh on Deep Link ---');
  await page.goto('http://127.0.0.1:4173/#/lecture-06', { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  const reloadedHeading = await page.textContent('main h1');
  const reloadedL6Current = await page.$eval('a[href="#/lecture-06"]', e => e.getAttribute('aria-current'));
  console.log('After hard reload - Heading:', reloadedHeading, 'aria-current on L6:', reloadedL6Current);

  console.log('\n--- TEST 5: Responsive check at 360, 800, 1440 px ---');
  for (const width of [360, 800, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(100);
    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log(`Width ${width}px:`, scrollInfo);
    await page.screenshot({ path: `/home/nidan73/.gemini/antigravity-cli/brain/fa1abc17-0bf7-43f2-929b-5075857145da/preview_${width}.png` });
  }

  await browser.close();
  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY');
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
