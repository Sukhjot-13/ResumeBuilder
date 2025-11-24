import mongoose from 'mongoose';
import { ROLES } from '@/lib/constants';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  role: {
    type: Number,
    default: ROLES.USER, // 0: admin, 70: developer, 99: subscriber, 100: user
  },
  creditsUsed: {
    type: Number,
    default: 0, // Track usage instead of balance
  },
  lastCreditResetDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionId: {
    type: String,
  },
  customerId: {
    type: String,
  },
  subscriptionExpiresAt: {
    type: Date,
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'canceled', 'none'],
    default: 'none',
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  mainResume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
  },
  generatedResumes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
  }],
});

export default (mongoose.models && mongoose.models.User) || mongoose.model('User', UserSchema);
