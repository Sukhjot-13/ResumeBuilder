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

        const jobs = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.job_seen_beacon, .result, .cardOutline, .jobCard')];
          return cards.slice(0, 15).map((card) => {
            // Title: try multiple selectors Indeed uses
            const titleEl = card.querySelector('h2.jobTitle a, a.jobtitle, [data-jk] a, .jobTitle a');
            const title = titleEl?.textContent?.trim() || '';

            // Company name
            const companyEl = card.querySelector('[data-testid="company-name"], .companyName, .company, .jobCardCompany, [class*="company"]');
            const company = companyEl?.textContent?.trim() || '';

            // Location
            const locationEl = card.querySelector('[data-testid="text-location"], .companyLocation, .location, [class*="location"]');
            const location = locationEl?.textContent?.trim() || '';

            // Description snippet
            const descEl = card.querySelector('.job-snippet, .jobCardDescription, [class*="summary"], [class*="description"]');
            const description = descEl?.textContent?.trim() || '';

            // Link
            const linkEl = titleEl || card.querySelector('a[data-jk], a[class*="title"]');
            const href = linkEl?.getAttribute('href') || '';

            return { title, company, location, description, applyUrl: href };
          });
        });

        for (const job of jobs) {
          if (!job.title) continue;

          // Build the full redirect URL, then extract the jk param for a proper viewjob URL
          const redirectUrl = job.applyUrl.startsWith('http') ? job.applyUrl : `https://ca.indeed.com${job.applyUrl}`;
          const jkMatch = redirectUrl.match(/[?&]jk=([^&]+)/);
          const viewUrl = jkMatch
            ? `https://ca.indeed.com/viewjob?jk=${jkMatch[1]}`
            : redirectUrl;

          const extLoc = (job.location || 'unknown').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

          // Navigate to job detail page for full description
          let fullDescription = job.description;
          if (jkMatch) {
            try {
              await page.goto(viewUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              await page.waitForTimeout(1000);
              const fullDesc = await page.evaluate(() => {
                const descEl = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText, [class*="description"]');
                return descEl?.textContent?.trim() || '';
              });
              if (fullDesc) {
                fullDescription = fullDesc;
              }
            } catch (navErr) {
              console.log(`[Indeed] Could not load detail page for ${viewUrl}, using snippet`);
            }
          }

          results.push({
            platform: 'indeed',
            externalId: `${job.company || 'unknown'}-${job.title}-${extLoc}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
            title: job.title,
            company: job.company,
            location: job.location,
            description: fullDescription,
            applyUrl: viewUrl,
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
