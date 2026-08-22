import mongoose from 'mongoose';

const PlatformSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['linkedin', 'indeed'], required: true },
  cookiesEncrypted: { type: String, required: true },
  lastRefreshed: { type: Date },
  isValid: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

PlatformSessionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.PlatformSession) || mongoose.model('PlatformSession', PlatformSessionSchema);
