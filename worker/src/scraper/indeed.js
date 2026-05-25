import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
chromium.use(StealthPlugin());

export async function scrapeIndeed(criteria) {
  console.log(`[Indeed] Starting scrape for titles: ${criteria.titles.join(', ')}`);

  const results = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    for (const title of criteria.titles) {
      try {
        const encodedTitle = encodeURIComponent(title);
        const location = criteria.locations.length > 0
          ? `&l=${encodeURIComponent(criteria.locations[0])}`
          : '';

        const url = `https://ca.indeed.com/jobs?q=${encodedTitle}${location}&sort=date`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const jobs = await page.$$eval('.job_seen_beacon, .result', (cards) => {
          return cards.slice(0, 15).map((card) => {
            const titleEl = card.querySelector('h2.jobTitle a, a.jobtitle');
            const companyEl = card.querySelector('.companyName, .company');
            const locationEl = card.querySelector('.companyLocation, .location');
            const linkEl = card.querySelector('h2.jobTitle a, a.jobtitle');

            return {
              title: titleEl?.textContent?.trim() || '',
              company: companyEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              applyUrl: linkEl?.getAttribute('href') || '',
            };
          });
        });

        for (const job of jobs) {
          if (!job.title) continue;
          results.push({
            platform: 'indeed',
            externalId: `${job.company}-${job.title}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
            title: job.title,
            company: job.company,
            location: job.location,
            description: '',
            applyUrl: job.applyUrl.startsWith('http') ? job.applyUrl : `https://ca.indeed.com${job.applyUrl}`,
            isEasyApply: false,
          });
        }

        await page.waitForTimeout(2000 + Math.random() * 3000);
      } catch (err) {
        console.error(`[Indeed] Error scraping title "${title}":`, err);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`[Indeed] Found ${results.length} jobs`);
  return results;
}
