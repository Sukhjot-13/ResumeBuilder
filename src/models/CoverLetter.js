import mongoose from 'mongoose';
import { generateCoverLetterContentSchema } from '@/lib/coverLetterFields';

const CoverLetterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: generateCoverLetterContentSchema(),
  metadata: {
    jobTitle: { type: String },
    companyName: { type: String },
    coverLetterName: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.CoverLetter)
  || mongoose.model('CoverLetter', CoverLetterSchema);
