import mongoose from 'mongoose';

const ApplyInstructionsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  instructions: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.ApplyInstructions) || mongoose.model('ApplyInstructions', ApplyInstructionsSchema);
