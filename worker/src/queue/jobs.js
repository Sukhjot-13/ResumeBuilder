import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../redis.js';

export const scrapeQueue = new Queue('scrape', { connection });
export const gateQueue = new Queue('gate', { connection });
export const generateQueue = new Queue('generate', { connection });
export const applyQueue = new Queue('apply', { connection });

export const scrapeQueueEvents = new QueueEvents('scrape', { connection });
export const gateQueueEvents = new QueueEvents('gate', { connection });
export const generateQueueEvents = new QueueEvents('generate', { connection });
export const applyQueueEvents = new QueueEvents('apply', { connection });

export async function getQueueStatus() {
  const queues = [scrapeQueue, gateQueue, generateQueue, applyQueue];
  return Promise.all(queues.map(async (q) => {
    const [waiting, active, completed, failed] = await Promise.all([
      q.getWaitingCount(), q.getActiveCount(), q.getCompletedCount(), q.getFailedCount(),
    ]);
    return { name: q.name, waiting, active, completed, failed };
  }));
}

export async function clearQueues() {
  await Promise.all([scrapeQueue.drain(), gateQueue.drain(), generateQueue.drain(), applyQueue.drain()]);
}
