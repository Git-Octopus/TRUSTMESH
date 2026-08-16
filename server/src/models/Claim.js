const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  evidenceUrl: { type: String },
  evidenceHash: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  onChainTxHash: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Claim', ClaimSchema);
