import { config } from '../config.js';

/**
 * Send an email notification via Resend.
 *
 * Future: In production, replace with Resend SDK:
 *   import { Resend } from 'resend';
 *   const resend = new Resend(config.resendApiKey);
 */
export async function sendNotification(payload) {
  if (!config.resendApiKey) {
    console.log(`[Notification] Would send email to ${payload.to}: ${payload.subject}`);
    return;
  }

  try {
    // Placeholder: Replace with actual Resend call in production
    console.log(`[Notification] Sending email to ${payload.to}: ${payload.subject}`);
  } catch (err) {
    console.error('[Notification] Failed to send:', err);
  }
}

// ── Convenience functions ───────────────────────────────────────────

export async function notifySessionExpired(platform, email) {
  await sendNotification({
    to: email,
    subject: `[Automation] ${platform} session expired`,
    text: `Your ${platform} session has expired. Please re-authenticate in the dashboard.`,
  });
}

export async function notifyDailyCapReached(email) {
  await sendNotification({
    to: email,
    subject: '[Automation] Daily application cap reached',
    text: 'The automation has reached your daily application limit. It will resume tomorrow.',
  });
}

export async function notifyApplicationFailed(jobTitle, email) {
  await sendNotification({
    to: email,
    subject: `[Automation] Application failed: ${jobTitle}`,
    text: `The automation failed to apply to "${jobTitle}". Check the dashboard for details.`,
  });
}
