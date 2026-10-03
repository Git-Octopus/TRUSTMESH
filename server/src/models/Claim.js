const mongoose = require('mongoose');

const ClaimVerificationSchema = new mongoose.Schema(
  {
    verifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifierWallet: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'automated', 'smart_contract'],
      default: 'manual',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    transactionHash: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const ClaimSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    onChainClaimId: {
      type: Number,
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Claim type is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Claim title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    evidenceUrl: {
      type: String,
      default: '',
    },
    evidenceHash: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'EVIDENCE_CHECK',
        'VERIFICATION_PENDING',
        'VERIFIED',
        'REJECTED',
        'REVOKED',
      ],
      default: 'DRAFT',
      index: true,
    },
    verification: {
      type: ClaimVerificationSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Claim', ClaimSchema);
