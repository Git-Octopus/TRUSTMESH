const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },
  verifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved: { type: Boolean, required: true },
  comments: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Verification', VerificationSchema);
