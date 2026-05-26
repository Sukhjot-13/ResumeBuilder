import mongoose from 'mongoose';

// NOTE: salary and work-mode fields (minSalary, allowRemote, etc.) are
// consolidated in JobCriteria — the single source of truth for those values.
const GatekeeperRulesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetTitles: [{ type: String }],
  excludeCompanies: [{ type: String }],
  excludeKeywords: [{ type: String }],
  requiredKeywords: [{ type: String }],
  seniorityLevels: [{ type: String }],
  excludeSeniorityLevels: [{ type: String }],
  customInstructions: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.GatekeeperRules) || mongoose.model('GatekeeperRules', GatekeeperRulesSchema);
