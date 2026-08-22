import cron from 'node-cron';
import { scrapeQueue } from '../queue/jobs.js';
import { getSchedulerSettings } from '../db-api.js';

/**
 * Check if the current time is within the user's configured time window.
 */
function isWithinWindow(settings) {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: 'numeric',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(now);
  const hourStr = parts.find((p) => p.type === 'hour')?.value;
  const dayStr = parts.find((p) => p.type === 'weekday')?.value;

  if (!hourStr || !dayStr) return false;

  const hour = parseInt(hourStr, 10);
  const day = dayStr.toLowerCase();

  return hour >= settings.startHour && hour < settings.endHour && !!settings.activeDays[day];
}

/**
 * Start the cron scheduler.
 * Runs every 30 minutes and checks time windows before dispatching.
 */
export function startScheduler() {
  console.log('[Scheduler] Starting — runs every 30 minutes');

  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('[Scheduler] Tick — checking settings');

      const settings = await getSchedulerSettings();

      if (!settings) {
        console.log('[Scheduler] No settings found');
        return;
      }

      if (!settings.enabled) {
        console.log('[Scheduler] Master switch is OFF');
        return;
      }

      if (!isWithinWindow(settings)) {
        console.log('[Scheduler] Outside configured time window');
        return;
      }

      console.log('[Scheduler] Within window — dispatching scrape job');
      await scrapeQueue.add('scrape', {});
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });
}
