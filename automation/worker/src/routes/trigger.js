import { Router } from 'express';
import { scrapeQueue, gateQueue } from '../queue/jobs.js';

export const triggerRouter = Router();

triggerRouter.post('/scrape', async (req, res) => {
  try {
    console.log(`[Trigger] Manual scrape triggered`);
    await scrapeQueue.add('scrape', {});
    res.json({ message: 'Scrape job enqueued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

triggerRouter.post('/apply', async (req, res) => {
  try {
    console.log(`[Trigger] Manual apply run triggered`);
    await scrapeQueue.add('scrape', {});
    res.json({ message: 'Apply pipeline triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

triggerRouter.post('/apply-job', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    console.log(`[Trigger] Manual apply for job ${jobId}`);
    await gateQueue.add('gate', { jobId });
    res.json({ message: 'Apply job enqueued for ' + jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

triggerRouter.post('/pause', async (req, res) => {
  try {
    console.log('[Trigger] Emergency stop triggered');
    res.json({ message: 'Automation paused. Update scheduler settings in the dashboard to resume.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
