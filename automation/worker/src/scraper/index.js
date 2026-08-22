import { scrapeLinkedIn } from './linkedin.js';
import { scrapeIndeed } from './indeed.js';

export async function scrapeJobs(criteria) {
  const results = [];
  const platforms = criteria.platforms || ['linkedin', 'indeed'];

  for (const platform of platforms) {
    try {
      let jobs = [];
      if (platform === 'linkedin') {
        jobs = await scrapeLinkedIn(criteria);
      } else if (platform === 'indeed') {
        jobs = await scrapeIndeed(criteria);
      }
      results.push(...jobs);
    } catch (err) {
      console.error(`[Scraper] Error on platform ${platform}:`, err);
    }
  }

  return results;
}
