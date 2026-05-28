import mongoose from 'mongoose';
import { COVER_LETTER_FIELDS } from '@/lib/coverLetterFields';

const CoverLetterContentSchema = new mongoose.Schema({}, { strict: false });

const CoverLetterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: CoverLetterContentSchema,
    required: true,
  },
  metadata: {
    jobTitle: { type: String },
    companyName: { type: String },
    coverLetterName: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
});

export default (mongoose.models && mongoose.models.CoverLetter)
  || mongoose.model('CoverLetter', CoverLetterSchema);
