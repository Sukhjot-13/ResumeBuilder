import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },       // 'USER', 'SUBSCRIBER', 'DEVELOPER', 'ADMIN'
  value: { type: Number, required: true, unique: true },      // 100, 99, 70, 0
  permissions: [{ type: String }],                             // ['view_own_profile', ...]
  isAdmin: { type: Boolean, default: false },                  // true -> 'ALL' wildcard
  description: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models?.Role || mongoose.model('Role', RoleSchema);
