import mongoose from 'mongoose';

const GatekeeperRulesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetTitles: [{ type: String }],
  excludeCompanies: [{ type: String }],
  excludeKeywords: [{ type: String }],
  requiredKeywords: [{ type: String }],
  minSalary: { type: Number },
  allowRemote: { type: Boolean, default: true },
  allowHybrid: { type: Boolean, default: true },
  allowOnSite: { type: Boolean, default: false },
  seniorityLevels: [{ type: String }],
  excludeSeniorityLevels: [{ type: String }],
  customInstructions: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.GatekeeperRules) || mongoose.model('GatekeeperRules', GatekeeperRulesSchema);
