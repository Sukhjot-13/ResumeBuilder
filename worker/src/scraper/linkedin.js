import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
chromium.use(StealthPlugin());

export async function scrapeLinkedIn(criteria) {
  console.log(`[LinkedIn] Starting scrape for titles: ${criteria.titles.join(', ')}`);

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
        const locations = criteria.locations.length > 0
          ? criteria.locations.map((l) => encodeURIComponent(l)).join('%2C')
          : '';

        const url = locations
          ? `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}&location=${locations}&f_AL=true`
          : `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}&f_AL=true`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const jobs = await page.$$eval('.job-card-container, .jobs-search-results__list-item', (cards) => {
          return cards.slice(0, 15).map((card) => {
            const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link');
            const companyEl = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle');
            const locationEl = card.querySelector('.job-card-container__metadata-wrapper, .job-card-container__metadata-item');
            const linkEl = card.querySelector('a');

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
            platform: 'linkedin',
            externalId: `${job.company}-${job.title}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
            title: job.title,
            company: job.company,
            location: job.location,
            description: '',
            applyUrl: job.applyUrl.startsWith('http') ? job.applyUrl : `https://www.linkedin.com${job.applyUrl}`,
            isEasyApply: true,
          });
        }

        await page.waitForTimeout(2000 + Math.random() * 3000);
      } catch (err) {
        console.error(`[LinkedIn] Error scraping title "${title}":`, err);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`[LinkedIn] Found ${results.length} jobs`);
  return results;
}
