import mongoose from 'mongoose';

const DailyCountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 },
});

DailyCountSchema.index({ userId: 1, date: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.DailyCount) || mongoose.model('DailyCount', DailyCountSchema);
