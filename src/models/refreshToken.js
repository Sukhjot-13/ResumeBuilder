
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

// Create a compound index for efficient lookups and to prevent duplicate tokens for the same user
refreshTokenSchema.index({ userId: 1, token: 1 });

export default (mongoose.models && mongoose.models.RefreshToken) || mongoose.model('RefreshToken', refreshTokenSchema);
