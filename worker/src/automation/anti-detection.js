export const SAFETY_RULES = {
  // Browser
  headless: false,
  useStealthPlugin: true,

  // Rate limits (always check against DB before applying)
  maxApplicationsPerDay: 40,
  maxApplicationsPerHour: 8,

  // Timing (randomized — never mechanical)
  delayBetweenApplications: {
    min: 60_000,       // 1 minute minimum
    max: 180_000,      // 3 minutes maximum
  },
  delayBetweenClicks: {
    min: 800,
    max: 2500,
  },
  delayBetweenKeystrokes: {
    min: 50,
    max: 150,
  },

  // Human simulation
  randomMouseMovements: true,
  scrollBeforeClick: true,
  randomViewportSize: true,
};

/**
 * Random delay for human-like timing.
 * @param {number} min Minimum milliseconds
 * @param {number} max Maximum milliseconds
 */
export const randomDelay = (min, max) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/**
 * Simulate human-like mouse movement to a target element.
 */
export async function humanLikeMove(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return;

    const box = await element.boundingBox();
    if (!box) return;

    const startX = 100 + Math.random() * 500;
    const startY = 100 + Math.random() * 500;
    const steps = 5 + Math.floor(Math.random() * 5);

    for (let i = 1; i <= steps; i++) {
      const x = startX + ((box.x + box.width / 2 - startX) * i) / steps + (Math.random() - 0.5) * 10;
      const y = startY + ((box.y + box.height / 2 - startY) * i) / steps + (Math.random() - 0.5) * 10;
      await page.mouse.move(x, y);
      await randomDelay(30, 80);
    }

    await randomDelay(100, 300);
  } catch {
    // Silently skip if element is gone
  }
}

/**
 * Scroll to a random position on the page to simulate human behavior.
 */
export async function randomScroll(page) {
  try {
    const height = await page.evaluate(() => document.body.scrollHeight);
    const scrollY = Math.random() * height * 0.7;
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollY);
    await randomDelay(500, 1500);
  } catch {
    // Ignore scroll errors
  }
}
