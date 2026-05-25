/**
 * End-to-end pipeline test.
 * Scrapes 1 job, evaluates it, and runs the production applyJobProcessor.
 *
 * Usage: node src/test-pipeline.js
 *
 * Prerequisites:
 *   - Worker .env configured with API key + Redis + DEEPSEEK_API_KEY
 *   - Next.js app running on RESUME_BUILDER_URL
 *   - Scheduler enabled at /api/automation/scheduler
 *   - Job criteria set at /api/automation/criteria
 *   - Platform session saved at /automation/settings/accounts
 *   - Master resume exists (uploaded at /profile)
 */

import { getSchedulerSettings, getJobCriteria, saveJobListing, evaluateJob } from './db-api.js';
import { scrapeIndeed } from './scraper/indeed.js';
import { scrapeLinkedIn } from './scraper/linkedin.js';
import { applyJobProcessor } from './queue/processors/apply.processor.js';

async function main() {
  console.log('========================================');
  console.log('  Pipeline Test — 1 Job');
  console.log('========================================\n');

  // 1. Check settings
  console.log('[1] Checking scheduler settings...');
  const settings = await getSchedulerSettings();
  if (!settings || !settings.enabled) {
    console.error('  ✗ Scheduler is disabled. Enable it first.');
    process.exit(1);
  }
  console.log('  ✓ Scheduler enabled');

  // 2. Check criteria
  console.log('\n[2] Checking job criteria...');
  const criteria = await getJobCriteria();
  if (!criteria || !criteria.titles || criteria.titles.length === 0) {
    console.error('  ✗ No job criteria found. Set titles at /automation/settings/criteria');
    process.exit(1);
  }
  console.log(`  ✓ Criteria found: ${criteria.titles.join(', ')}`);

  // 3. Scrape 1 job
  const platform = (criteria.platforms && criteria.platforms.includes('linkedin')) ? 'linkedin' : 'indeed';
  console.log(`\n[3] Scraping 1 job from ${platform}...`);
  const scraper = platform === 'linkedin' ? scrapeLinkedIn : scrapeIndeed;
  const allListings = await scraper({ ...criteria, titles: [criteria.titles[0]] });
  const listing = allListings.find(l => l.title);
  if (!listing) {
    console.error('  ✗ No jobs found');
    process.exit(1);
  }
  console.log(`  ✓ Found: ${listing.title} at ${listing.company || '?'}`);

  // 4. Save the job
  console.log('\n[4] Saving job listing...');
  const saved = await saveJobListing(listing);
  const jobId = saved._id || saved.id;
  console.log(`  ✓ Saved (id: ${jobId})`);

  // 5. Gatekeeper evaluation
  console.log('\n[5] Running gatekeeper evaluation...');
  const decision = await evaluateJob({
    ...listing,
    description: listing.description || `Job title: ${listing.title}. Company: ${listing.company || 'Unknown'}. Location: ${listing.location || 'Unknown'}.`,
  });
  console.log(`  Decision: ${decision.apply ? 'APPLY' : 'SKIP'} (confidence: ${decision.confidence}%)`);
  if (decision.reason) console.log(`  Reason: ${decision.reason}`);

  if (!decision.apply || decision.confidence < settings.gatekeeperThreshold) {
    console.log('\n  ⚠ Gatekeeper says skip. Forcing apply for test anyway...');
  }

  // 6. Run the production apply processor
  console.log('\n[6] Running production applyJobProcessor...');
  console.log('  (This uses the same DeepSeek AI loop as test-apply-with-ai.js)\n');

  // Build a mock BullMQ job object matching what the real queue would send
  const mockJob = { data: { jobId, resumeId: null } };

  try {
    await applyJobProcessor(mockJob);
    console.log('\n========================================');
    console.log('  ✅ PIPELINE TEST PASSED');
    console.log('========================================');
  } catch (err) {
    console.error(`\n  ✗ applyJobProcessor error: ${err.message}`);
    console.log('\n========================================');
    console.log('  ❌ PIPELINE TEST FAILED');
    console.log('========================================');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
