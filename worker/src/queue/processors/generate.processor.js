import { applyQueue } from '../jobs.js';
import { getPendingJobListings, generateResume, getSchedulerSettings } from '../../db-api.js';

export async function generateJobProcessor(job) {
  const { jobId } = job.data;
  console.log(`[Generate] Creating resume for job ${jobId}`);

  const settings = await getSchedulerSettings();
  if (!settings || !settings.enabled) return;

  const listings = await getPendingJobListings();
  const listing = listings.find(l => l._id === jobId);
  if (!listing) { console.log(`[Generate] Job ${jobId} not found`); return; }

  try {
    const desc = listing.description || `Job title: ${listing.title}. Company: ${listing.company || 'Not specified'}. Location: ${listing.location || 'Not specified'}.`;
    const result = await generateResume(desc, {});
    console.log(`[Generate] Resume ready for ${listing.title}`);
    await applyQueue.add('apply', { jobId, resumeId: result.resumeId });
  } catch (err) {
    console.error(`[Generate] Error:`, err);
  }
}
