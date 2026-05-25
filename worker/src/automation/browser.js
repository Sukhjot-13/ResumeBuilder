import { chromium } from 'playwright';

/**
 * Create a Playwright browser context with anti-detection measures.
 * Returns a context ready for automation.
 */
export async function createBrowserContext() {
  const viewportWidth = 1280 + Math.floor(Math.random() * 640); // 1280–1920
  const viewportHeight = 720 + Math.floor(Math.random() * 280);  // 720–1000

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

  // Remove webdriver detection — runs inside Playwright's browser context
  await context.addInitScript(() => {
    navigator.webdriver = false;
    window.chrome = { runtime: {} };
  });

  return context;
}

/**
 * Get a random modern browser user agent.
 */
function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}
