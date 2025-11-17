
import mongoose from 'mongoose';

const ResumeMetadataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default (mongoose.models && mongoose.models.ResumeMetadata) || mongoose.model('ResumeMetadata', ResumeMetadataSchema);
