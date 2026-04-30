/**
 * Resume Mongoose Model
 *
 * The content structure is derived from the single source of truth:
 * src/lib/resumeFields.js
 *
 * DO NOT add fields here manually. Add them to resumeFields.js instead.
 */

import mongoose from 'mongoose';
import { generateMongooseContentSchema } from '@/lib/resumeFields';

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: generateMongooseContentSchema(),
  metadata: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeMetadata',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default (mongoose.models && mongoose.models.Resume) || mongoose.model('Resume', ResumeSchema);
