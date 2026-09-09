const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema(
  {
    institution: { type: String, default: '' },
    degree: { type: String, default: '' },
    fieldOfStudy: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '' },
  },
  { _id: true }
);

const ExperienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: '' },
    position: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '' },
  },
  { _id: true }
);

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    education: {
      type: [EducationSchema],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: [ExperienceSchema],
      default: [],
    },
    profileImage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', ProfileSchema);
