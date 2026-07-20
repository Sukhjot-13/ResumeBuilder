import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  group: { type: String, default: 'General' },    // 'Admin', 'AI & Content', etc.
  requiredPlan: { type: String, default: 'FREE' }, // 'FREE', 'PRO', 'DEVELOPER', 'ADMIN'
}, { timestamps: true });

export default mongoose.models?.Permission || mongoose.model('Permission', PermissionSchema);
