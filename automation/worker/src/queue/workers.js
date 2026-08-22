import { Worker } from 'bullmq';
import { connection } from '../redis.js';
import { scrapeJobProcessor } from './processors/scrape.processor.js';
import { gateJobProcessor } from './processors/gate.processor.js';
import { generateJobProcessor } from './processors/generate.processor.js';
import { applyJobProcessor } from './processors/apply.processor.js';

export function startWorkers() {
  const opts = { connection, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } };

  new Worker('scrape', scrapeJobProcessor, { ...opts, concurrency: 1 });
  new Worker('gate', gateJobProcessor, { ...opts, concurrency: 3 });
  new Worker('generate', generateJobProcessor, { ...opts, concurrency: 2 });
  new Worker('apply', applyJobProcessor, { ...opts, concurrency: 1 });

  console.log('[Worker] BullMQ workers started');
}
