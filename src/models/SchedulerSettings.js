import mongoose from 'mongoose';

const SchedulerSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  enabled: { type: Boolean, default: false },
  startHour: { type: Number, default: 9 },
  endHour: { type: Number, default: 18 },
  timezone: { type: String, default: 'America/Toronto' },
  activeDays: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false },
  },
  maxPerDay: { type: Number, default: 20 },
  maxPerWeek: { type: Number, default: 80 },
  maxPerRun: { type: Number, default: 5 },
  minDelaySeconds: { type: Number, default: 60 },
  maxDelaySeconds: { type: Number, default: 180 },
  gatekeeperThreshold: { type: Number, default: 75 },
  reviewQueueThreshold: { type: Number, default: 40 },
  pipelineMode: { type: String, enum: ['scrape_only', 'scrape_gate', 'full'], default: 'scrape_only' },
  dailyRateLimit: { type: Number, default: 100 },
  pauseOnError: { type: Boolean, default: true },
  pauseOnSessionExpiry: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.SchedulerSettings) || mongoose.model('SchedulerSettings', SchedulerSettingsSchema);
