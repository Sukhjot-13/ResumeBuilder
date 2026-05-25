import { Router } from 'express';
import { getQueueStatus } from '../queue/jobs.js';

export const queueRouter = Router();

queueRouter.get('/status', async (req, res) => {
  try {
    const status = await getQueueStatus();
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
