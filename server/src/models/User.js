const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['owner', 'verifier', 'admin'],
      default: 'owner',
    },
    accountType: {
      type: String,
      enum: ['user', 'verifier', 'admin'],
      default: 'user',
    },
    verifierStatus: {
      type: String,
      enum: ['none', 'pending_approval', 'approved', 'rejected', 'revoked'],
      default: 'none',
      index: true,
    },
    organization: {
      name: { type: String, default: '' },
      designation: { type: String, default: '' },
      accreditationDocUrl: { type: String, default: '' },
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    suspendedBy: {
      type: String,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    nonce: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
