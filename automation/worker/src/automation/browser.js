import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

/**
 * Create a Playwright browser + context with anti-detection and stealth measures.
 * Returns `{ browser, context }` so callers can create pages from the context
 * (preserving stealth settings) and close the browser with `browser.close()`.
 */
export async function createBrowserContext() {
  const viewportWidth = 1280 + Math.floor(Math.random() * 640);
  const viewportHeight = 720 + Math.floor(Math.random() * 280);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    userAgent: getRandomUserAgent(),
    locale: 'en-US',
    timezoneId: 'America/Toronto',
    permissions: ['geolocation'],
    geolocation: { latitude: 43.6532, longitude: -79.3832 },
  });

  await context.addInitScript(() => {
    window.chrome = { runtime: {} };
  });

  return { browser, context };
}

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}
