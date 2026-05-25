import mongoose from 'mongoose';

const GatekeeperDecisionSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobListing', required: true },
  apply: { type: Boolean, required: true },
  confidence: { type: Number },
  reason: { type: String },
  flags: [{ type: mongoose.Schema.Types.Mixed }],
  keywordsFound: [{ type: String }],
  keywordsMissing: [{ type: String }],
  overriddenByUser: { type: Boolean, default: false },
  overrideDecision: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
});

GatekeeperDecisionSchema.index({ jobId: 1 });

export default (mongoose.models && mongoose.models.GatekeeperDecision) || mongoose.model('GatekeeperDecision', GatekeeperDecisionSchema);
