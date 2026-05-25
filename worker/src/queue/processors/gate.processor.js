import { generateQueue } from '../jobs.js';
import { getJobListingById, evaluateJob, getSchedulerSettings } from '../../db-api.js';

export async function gateJobProcessor(job) {
  const { jobId } = job.data;
  console.log(`[Gate] Evaluating ${jobId}`);

  const settings = await getSchedulerSettings();
  if (!settings || !settings.enabled) return;

  let listing;
  try {
    listing = await getJobListingById(jobId);
  } catch {
    console.log(`[Gate] Job ${jobId} not found`);
    return;
  }
  if (!listing || !listing.title) {
    console.log(`[Gate] Skipping ${jobId} — no title`);
    return;
  }

  try {
    const decision = await evaluateJob({
      ...listing,
      description: listing.description || `Job title: ${listing.title}. Company: ${listing.company || 'Not specified'}. Location: ${listing.location || 'Not specified'}.`,
    });
    console.log(`[Gate] ${listing.title}: apply=${decision.apply}, confidence=${decision.confidence}`);

    if (decision.apply && decision.confidence >= settings.gatekeeperThreshold) {
      await generateQueue.add('generate', { jobId });
    } else {
      console.log(`[Gate] Skipped ${jobId}: ${decision.reason}`);
    }
  } catch (err) {
    console.error(`[Gate] Error:`, err);
  }
}
