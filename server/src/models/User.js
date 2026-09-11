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
    nonce: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
