import { Router } from 'express';
import { getQueueStatus } from '../queue/jobs.js';
import { startScheduler } from '../scheduler/cron.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    const queueStatus = await getQueueStatus();

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      queue: queueStatus.reduce((acc, q) => {
        acc[q.name] = {
          waiting: q.waiting,
          active: q.active,
          completed: q.completed,
          failed: q.failed,
        };
        return acc;
      }, {}),
      scheduler: {
        enabled: true,
        nextRun: null,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});
