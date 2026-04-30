
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  token: { 
    type: String, 
    required: true 
  }, // This will be the hashed version
  expiresAt: { 
    type: Date, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  userAgent: { 
    type: String 
  },
  ip: { 
    type: String 
  },
});

// Compound index for efficient lookups
refreshTokenSchema.index({ userId: 1, token: 1 });

// TTL index: MongoDB automatically deletes documents when expiresAt is in the past
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models && mongoose.models.RefreshToken) || mongoose.model('RefreshToken', refreshTokenSchema);
