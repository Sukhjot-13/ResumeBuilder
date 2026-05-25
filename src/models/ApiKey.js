import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  keyPrefix: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date },
});

ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ key: 1 });

export default (mongoose.models && mongoose.models.ApiKey) || mongoose.model('ApiKey', ApiKeySchema);
