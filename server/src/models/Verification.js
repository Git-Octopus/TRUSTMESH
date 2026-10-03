const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
      index: true,
    },
    verifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    verifierWallet: {
      type: String,
      lowercase: true,
      trim: true,
      required: [true, 'Verifier wallet address is required'],
      index: true,
    },
    method: {
      type: String,
      enum: ['manual', 'automated', 'smart_contract'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['VERIFIED', 'REJECTED', 'REVOKED'],
      required: true,
      index: true,
    },
    approved: {
      type: Boolean,
      default: true,
    },
    comments: {
      type: String,
      default: '',
    },
    transactionHash: {
      type: String,
      default: '',
    },
    blockchainTimestamp: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Verification', VerificationSchema);
