import { gateQueue } from '../jobs.js';
import { getPendingJobListings, getJobCriteria, saveJobListing, getSchedulerSettings } from '../../db-api.js';
import { scrapeLinkedIn } from '../../scraper/linkedin.js';
import { scrapeIndeed } from '../../scraper/indeed.js';

export async function scrapeJobProcessor(job) {
  console.log('[Scrape] Starting');
  const settings = await getSchedulerSettings();
  if (!settings || !settings.enabled) { console.log('[Scrape] Scheduler disabled'); return; }

  const criteria = await getJobCriteria();
  if (!criteria || !criteria.titles || criteria.titles.length === 0) { console.log('[Scrape] No criteria'); return; }

  const platforms = criteria.platforms || ['linkedin', 'indeed'];
  console.log(`[Scrape] Searching: ${criteria.titles.join(', ')} on ${platforms.join(', ')}`);

  for (const platform of platforms) {
    try {
      const listings = platform === 'linkedin' ? await scrapeLinkedIn(criteria) : await scrapeIndeed(criteria);
      console.log(`[Scrape] ${platform}: ${listings.length} found`);
      let saved = 0;
      for (const listing of listings) {
        try {
          await saveJobListing(listing);
          saved++;
        } catch (err) {
          console.error(`[Scrape] Error saving listing:`, err.message);
        }
      }
      console.log(`[Scrape] ${platform}: ${saved} saved`);
    } catch (err) {
      console.error(`[Scrape] Error on ${platform}:`, err);
    }
  }

  // Enqueue gate evaluation for all pending jobs
  try {
    const pending = await getPendingJobListings();
    console.log(`[Scrape] Enqueuing ${pending.length} jobs for gate evaluation`);
    for (const listing of pending) {
      await gateQueue.add('gate', { jobId: listing._id });
    }
  } catch (err) {
    console.error(`[Scrape] Error enqueuing gate jobs:`, err.message);
  }
}
