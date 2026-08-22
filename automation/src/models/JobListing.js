import mongoose from 'mongoose';

const JobListingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['linkedin', 'indeed'], required: true },
  externalId: { type: String },
  title: { type: String, required: true },
  company: { type: String },
  location: { type: String },
  salary: { type: String },
  description: { type: String },
  applyUrl: { type: String },
  isEasyApply: { type: Boolean, default: false },
  postedDate: { type: Date },
  scrapedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'skipped', 'applied', 'failed', 'review', 'external_apply'], default: 'pending' },
});

JobListingSchema.index({ userId: 1, status: 1 });
JobListingSchema.index({ platform: 1, externalId: 1, userId: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.JobListing) || mongoose.model('JobListing', JobListingSchema);
