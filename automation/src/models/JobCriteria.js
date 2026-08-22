import mongoose from 'mongoose';

const JobCriteriaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  titles: [{ type: String }],
  locations: [{ type: String }],
  remote: { type: Boolean, default: true },
  hybrid: { type: Boolean, default: true },
  onSite: { type: Boolean, default: false },
  minSalary: { type: Number },
  maxSalary: { type: Number },
  platforms: [{ type: String, enum: ['linkedin', 'indeed'] }],
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.JobCriteria) || mongoose.model('JobCriteria', JobCriteriaSchema);
