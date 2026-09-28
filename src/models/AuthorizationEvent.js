import mongoose from 'mongoose';

const AuthorizationEventSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  actorRole: { type: Number },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: String, index: true },
  outcome: { type: String, enum: ['allowed', 'denied'], default: 'allowed' },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  requestId: { type: String },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.models?.AuthorizationEvent ||
  mongoose.model('AuthorizationEvent', AuthorizationEventSchema);
