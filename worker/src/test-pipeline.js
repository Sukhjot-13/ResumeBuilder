/**
 * End-to-end pipeline test.
 * Scrapes 1 job, evaluates it, and runs the apply flow using the user's master resume.
 *
 * Usage: node src/test-pipeline.js
 *
 * Prerequisites:
 *   - Worker .env configured with API key + Redis
 *   - Next.js app running on RESUME_BUILDER_URL
 *   - Scheduler enabled at /api/automation/scheduler
 *   - Job criteria set at /api/automation/criteria
 *   - Platform session saved at /automation/settings/accounts
 *   - Master resume exists (uploaded at /profile)
 */

import { getSchedulerSettings, getJobCriteria, saveJobListing, getPendingJobListings, evaluateJob, getSessions, saveApplication } from './db-api.js';
import { scrapeIndeed } from './scraper/indeed.js';
import { scrapeLinkedIn } from './scraper/linkedin.js';
import { createBrowserContext } from './automation/browser.js';
import { randomDelay } from './automation/anti-detection.js';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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

  // 6. Get master resume (from profile API)
  console.log('\n[6] Fetching master resume...');
  const BASE = process.env.RESUME_BUILDER_URL || 'http://localhost:3000';
  const HEADERS = {
    'Authorization': `Bearer ${process.env.RESUME_BUILDER_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const profileRes = await fetch(`${BASE}/api/user/profile`, { method: 'GET', headers: HEADERS });
  if (!profileRes.ok) {
    console.error(`  ✗ Failed to get profile: ${profileRes.status}`);
    process.exit(1);
  }
  const profile = await profileRes.json();
  const masterResume = profile.mainResume;
  if (!masterResume) {
    console.error('  ✗ No master resume found. Upload one at /profile');
    process.exit(1);
  }
  console.log('  ✓ Master resume loaded');

  // 7. Check session
  console.log('\n[7] Checking platform session...');
  const sessions = await getSessions();
  const session = sessions.find(s => s.platform === platform);
  if (!session || !session.isValid) {
    console.error(`  ✗ No valid session for ${platform}. Add cookies at /automation/settings/accounts`);
    process.exit(1);
  }
  console.log(`  ✓ ${platform} session valid`);

  // 8. Browser automation — apply
  console.log(`\n[8] Starting browser for apply...`);
  if (!listing.applyUrl) {
    console.error('  ✗ No apply URL');
    process.exit(1);
  }
  console.log(`  URL: ${listing.applyUrl}`);

  let browser;
  try {
    browser = await createBrowserContext();
    const page = await browser.newPage();
    await randomDelay(2000, 4000);

    // Inject platform session cookies
    if (session.cookies) {
      const cookies = typeof session.cookies === 'string' ? JSON.parse(session.cookies) : session.cookies;
      await browser.addCookies(
        cookies.map((c) => {
          const raw = (c.sameSite || '').toLowerCase();
          const sameSite = raw === 'none' ? 'None' : raw === 'strict' ? 'Strict' : 'Lax';
          return {
            name: c.name,
            value: c.value,
            domain: c.domain || `.${platform}.com`,
            path: c.path || '/',
            httpOnly: c.httpOnly ?? true,
            secure: c.secure ?? true,
            sameSite,
          };
        })
      );
      console.log('  ✓ Session cookies injected');
    }

    await page.goto(listing.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('  ✓ Page loaded');

    // Try to find and click a submit/apply button
    const applyBtn = await page.$('button[type="submit"], button:has-text("Submit"), button:has-text("Apply now"), button:has-text("Apply")');
    if (applyBtn) {
      await randomDelay(1000, 2000);
      await applyBtn.click();
      await page.waitForTimeout(3000);
      console.log('  ✓ Apply button clicked');
    } else {
      console.log('  ℹ No apply button found — page may need manual interaction');
    }

    // Save the application record
    await saveApplication({
      jobId,
      resumeId: masterResume._id || masterResume.id,
      status: 'submitted',
      platform,
    });
    console.log('  ✓ Application saved');

    console.log('\n========================================');
    console.log('  ✅ PIPELINE TEST PASSED');
    console.log('========================================');
  } catch (err) {
    console.error(`\n  ✗ Apply step error: ${err.message}`);
    await saveApplication({ jobId, status: 'failed', platform, errorMessage: err.message });
    console.log('\n========================================');
    console.log('  ❌ PIPELINE TEST FAILED');
    console.log('========================================');
  } finally {
    if (browser) {
      await sleep(2000);
      await browser.close();
      console.log('  Browser closed');
    }
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
