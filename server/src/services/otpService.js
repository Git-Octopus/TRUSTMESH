const crypto = require('crypto');
const Otp = require('../models/Otp');
const { hashData } = require('./hashService');

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown between OTP requests

/**
 * Generates a random 6-digit numeric OTP.
 * @returns {string} 6-digit string
 */
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hashes an OTP code for safe storage.
 * @param {string} code 
 * @returns {string} Hashed OTP
 */
const hashOtp = (code) => {
  return hashData(`trustmesh_otp_salt_${code}`);
};

/**
 * Creates and stores a new OTP for a user, invalidating prior pending OTPs.
 * @param {string} userId - User ObjectId
 * @param {string} email - Recipient email
 * @returns {Promise<{ otpCode: string, expiresAt: Date }>}
 */
const createAndStoreOtp = async (userId, email) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check resend cooldown
  const recentOtp = await Otp.findOne({
    userId,
    email: normalizedEmail,
    verified: false,
  }).sort({ createdAt: -1 });

  if (recentOtp && Date.now() - new Date(recentOtp.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(recentOtp.createdAt).getTime())) / 1000
    );
    const error = new Error(`Please wait ${waitSec} seconds before requesting a new OTP.`);
    error.statusCode = 429;
    throw error;
  }

  // Invalidate all previous active OTPs for this user & email
  await Otp.deleteMany({ userId, email: normalizedEmail });

  const otpCode = generateOtpCode();
  const otpHash = hashOtp(otpCode);
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await Otp.create({
    userId,
    email: normalizedEmail,
    otpHash,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return { otpCode, expiresAt };
};

/**
 * Verifies a supplied OTP against the database record.
 * @param {string} userId - User ObjectId
 * @param {string} email - Email address
 * @param {string} enteredCode - 6-digit OTP
 * @returns {Promise<{ success: boolean, message: string }>}
 */
const verifyOtpCode = async (userId, email, enteredCode) => {
  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await Otp.findOne({
    userId,
    email: normalizedEmail,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return {
      success: false,
      message: 'No active OTP found. Please request a new verification code.',
    };
  }

  // Check expiration
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return {
      success: false,
      message: 'OTP has expired. Please request a new code.',
    };
  }

  // Check attempt limiter
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new code.',
    };
  }

  // Verify hash
  const enteredHash = hashOtp(enteredCode.trim());
  if (enteredHash !== otpRecord.otpHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = MAX_ATTEMPTS - otpRecord.attempts;
    return {
      success: false,
      message: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Mark as verified
  otpRecord.verified = true;
  await otpRecord.save();

  return {
    success: true,
    message: 'OTP verified successfully.',
  };
};

module.exports = {
  generateOtpCode,
  createAndStoreOtp,
  verifyOtpCode,
};
