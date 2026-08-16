const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String },
  bio: { type: String },
  trustScore: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
