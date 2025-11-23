import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripePaymentId: {
    type: String,
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
  },
  stripeCustomerId: {
    type: String,
  },
  amount: {
    type: Number,
    required: true, // Amount in cents
  },
  currency: {
    type: String,
    default: 'usd',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  planName: {
    type: String,
    required: true, // e.g., 'PRO'
  },
  type: {
    type: String,
    enum: ['subscription', 'one-time'],
    default: 'subscription',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // For any additional Stripe metadata
  },
});

export default (mongoose.models && mongoose.models.Transaction) || mongoose.model('Transaction', TransactionSchema);
