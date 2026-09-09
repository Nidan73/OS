import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });

  console.log('--- TEST 2A: Launch with colorScheme: dark and NO stored preference ---');
  const contextDark = await browser.newContext({ colorScheme: 'dark' });
  const pageDark = await contextDark.newPage();
  await pageDark.goto('http://127.0.0.1:4173/#/');

  const darkAttr = await pageDark.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const darkBg = await pageDark.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  const darkStored = await pageDark.evaluate(() => localStorage.getItem('os-theme'));

  console.log('Dark context data-theme attr:', darkAttr); // should be null
  console.log('Dark context body bg:', darkBg); // should be rgb(11, 16, 21)
  console.log('Dark context localStorage:', darkStored); // should be null

  if (darkAttr !== null) throw new Error('Expected data-theme to be null (unstamped) on clean dark load!');
  if (darkStored !== null) throw new Error('Expected localStorage to be null on clean load!');

  console.log('\n--- TEST 2B: Launch with colorScheme: light and NO stored preference ---');
  const contextLight = await browser.newContext({ colorScheme: 'light' });
  const pageLight = await contextLight.newPage();
  await pageLight.goto('http://127.0.0.1:4173/#/');

  const lightAttr = await pageLight.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const lightBg = await pageLight.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  const lightStored = await pageLight.evaluate(() => localStorage.getItem('os-theme'));

  console.log('Light context data-theme attr:', lightAttr); // should be null
  console.log('Light context body bg:', lightBg); // should be rgb(238, 240, 242)
  console.log('Light context localStorage:', lightStored); // should be null

  if (lightAttr !== null) throw new Error('Expected data-theme to be null (unstamped) on clean light load!');

  console.log('\n--- TEST 2C: Explicit toggle from system dark ---');
  await pageDark.click('.theme-toggle');
  const toggledTheme = await pageDark.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const toggledStored = await pageDark.evaluate(() => localStorage.getItem('os-theme'));
  console.log('After toggling from system dark -> data-theme:', toggledTheme, 'localStorage:', toggledStored);
  if (toggledTheme !== 'light') throw new Error('Toggling from dark should switch to light');

  await pageDark.click('.theme-toggle');
  const toggledBack = await pageDark.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('After 2nd toggle -> data-theme:', toggledBack);
  if (toggledBack !== 'dark') throw new Error('2nd toggle should switch to dark');

  await browser.close();
  console.log('\nTHEME UNSTAMPED VERIFICATION PASSED PERFECTLY!');
}

main().catch(err => {
  console.error('THEME VERIFICATION FAILED:', err);
  process.exit(1);
});
