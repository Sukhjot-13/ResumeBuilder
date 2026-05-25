import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config.js';
import { healthRouter } from './routes/health.js';
import { triggerRouter } from './routes/trigger.js';
import { queueRouter } from './routes/queue.js';
import { startScheduler } from './scheduler/cron.js';
import { startWorkers } from './queue/workers.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/trigger', triggerRouter);
app.use('/queue', queueRouter);

const errors = validateConfig();
if (errors.length > 0) {
  console.error('[Worker] Config errors:', errors);
  if (config.isProduction) process.exit(1);
}

app.listen(config.port, () => {
  console.log(`[Worker] Running on port ${config.port}`);
  console.log(`[Worker] Resume Builder API: ${config.resumeBuilderUrl}`);
  startScheduler();
  startWorkers();
});
