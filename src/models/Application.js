import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobListing' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeId: { type: String },
  resumeUrl: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'failed', 'pending', 'external_apply'], default: 'pending' },
  errorMessage: { type: String },
  platform: { type: String },
});

ApplicationSchema.index({ userId: 1 });
ApplicationSchema.index({ jobId: 1 });

export default (mongoose.models && mongoose.models.Application) || mongoose.model('Application', ApplicationSchema);
