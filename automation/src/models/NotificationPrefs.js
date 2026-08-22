import mongoose from 'mongoose';

const NotificationPrefsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  emailOnApply: { type: Boolean, default: true },
  emailOnError: { type: Boolean, default: true },
  emailOnCaptcha: { type: Boolean, default: true },
  emailOnSchedulerStop: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.NotificationPrefs) || mongoose.model('NotificationPrefs', NotificationPrefsSchema);
