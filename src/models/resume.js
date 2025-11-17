
import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
  full_name: String,
  email: String,
  phone: String,
  location: String,
  website: String,
  headline: String,
  generic_summary: String,
});

const WorkExperienceSchema = new mongoose.Schema({
  job_title: String,
  company: String,
  start_date: String,
  end_date: String,
  is_current: Boolean,
  responsibilities: [String],
});

const EducationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  field_of_study: String,
  start_date: String,
  end_date: String,
  relevant_coursework: String,
});

const SkillSchema = new mongoose.Schema({
  skill_name: String,
  category: String,
});

const AdditionalInfoSchema = new mongoose.Schema({
  languages: [String],
  certifications: [String],
  awards_activities: [String],
});

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    profile: ProfileSchema,
    work_experience: [WorkExperienceSchema],
    education: [EducationSchema],
    skills: [SkillSchema],
    additional_info: AdditionalInfoSchema,
  },
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
