const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { verifySignature, getAuthMessage } = require('../utils/signatureVerify');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');

/**
 * Issue a nonce for wallet signature login.
 * POST /api/auth/nonce
 */
exports.getNonce = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Ethereum walletAddress (0x...) is required.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');

    const ADMIN_WALLET = (process.env.ADMIN_WALLET || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').toLowerCase();
    const isAdmin = normalizedAddress === ADMIN_WALLET;

    // Find existing user or create default
    let user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      user = new User({
        walletAddress: normalizedAddress,
        role: isAdmin ? 'admin' : 'owner',
        nonce,
      });
      await user.save();

      // Create default empty profile
      await Profile.create({ userId: user._id });
    } else {
      user.nonce = nonce;
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      await user.save();
    }

    const message = getAuthMessage(normalizedAddress, nonce);

    return res.status(200).json({
      success: true,
      walletAddress: normalizedAddress,
      nonce,
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify wallet signature and issue JWT session.
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress and signature are required.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user || !user.nonce) {
      return res.status(400).json({
        success: false,
        message: 'No active login session/nonce found for this wallet. Request a nonce first.',
      });
    }

    const expectedMessage = getAuthMessage(normalizedAddress, user.nonce);
    const isValid = verifySignature(expectedMessage, signature, normalizedAddress);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid cryptographic signature.',
      });
    }

    const ADMIN_WALLET = (process.env.ADMIN_WALLET || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').toLowerCase();
    if (normalizedAddress === ADMIN_WALLET && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Invalidate nonce after successful login
    user.nonce = null;
    await user.save();

    // Issue JWT
    const secret = process.env.JWT_SECRET || 'trustmesh-jwt-secret-key';
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountType: user.accountType || null,
        verifierStatus: user.verifierStatus || (user.role === 'verifier' ? 'approved' : 'none'),
        organization: user.organization || {},
        isSuspended: Boolean(user.isSuspended),
        suspensionReason: user.suspensionReason || '',
        isOnboarded: Boolean(user.isOnboarded && user.accountType),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP verification code to user email.
 * POST /api/auth/send-otp
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    const userId = req.user._id || req.user.id;
    const { otpCode, expiresAt } = await otpService.createAndStoreOtp(userId, email);

    await emailService.sendOtpEmail(email, otpCode);

    return res.status(200).json({
      success: true,
      message: 'OTP verification code sent to your email address.',
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify submitted OTP and update user emailVerified status.
 * POST /api/auth/verify-otp
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.',
      });
    }

    const userId = req.user._id || req.user.id;
    const result = await otpService.verifyOtpCode(userId, email, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        email: email.toLowerCase().trim(),
        emailVerified: true,
      },
      { new: true }
    );

    // Re-issue JWT session with emailVerified: true
    const secret = process.env.JWT_SECRET || 'trustmesh-jwt-secret-key';
    const token = jwt.sign(
      {
        id: updatedUser._id,
        userId: updatedUser._id,
        walletAddress: updatedUser.walletAddress,
        role: updatedUser.role,
        emailVerified: true,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email successfully verified.',
      token,
      role: updatedUser.role,
      emailVerified: true,
      user: {
        id: updatedUser._id,
        walletAddress: updatedUser.walletAddress,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: true,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register or update user profile with wallet and details.
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { walletAddress, name, email, role } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Ethereum walletAddress (0x...) is required.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase().trim();
    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      user = new User({
        walletAddress: normalizedAddress,
        name: name ? name.trim() : '',
        email: email ? email.toLowerCase().trim() : '',
        role: role && ['owner', 'verifier', 'admin'].includes(role) ? role : 'owner',
      });
      await user.save();
      await Profile.create({ userId: user._id });
    } else {
      if (name !== undefined) user.name = name.trim();
      if (email !== undefined) user.email = email.toLowerCase().trim();
      if (role && ['owner', 'verifier', 'admin'].includes(role)) {
        user.role = role;
      }
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Switch role for testing/demo purposes.
 * POST /api/auth/switch-role
 */
exports.switchRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['owner', 'verifier', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be owner, verifier, or admin.',
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    const secret = process.env.JWT_SECRET || 'trustmesh-jwt-secret-key';
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Role switched to ${role}.`,
      token,
      role: user.role,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountType: user.accountType,
        verifierStatus: user.verifierStatus,
        organization: user.organization,
        isSuspended: Boolean(user.isSuspended),
        suspensionReason: user.suspensionReason || '',
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Onboard newly connected wallet with designated account type.
 * POST /api/auth/onboard
 */
exports.onboard = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { accountType, name, organization, adminSecretKey } = req.body;

    if (!['user', 'verifier', 'admin'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Account type must be "user", "verifier", or "admin".',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const ADMIN_WALLET = (process.env.ADMIN_WALLET || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').toLowerCase();
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'trustmesh_admin_secret_2026';

    if (accountType === 'user') {
      user.accountType = 'user';
      user.role = 'owner';
      user.verifierStatus = 'none';
      user.isOnboarded = true;
    } else if (accountType === 'verifier') {
      user.accountType = 'verifier';
      user.role = 'owner'; // Unapproved until admin authorizes
      user.verifierStatus = 'pending_approval';
      if (organization) {
        user.organization = {
          name: organization.name || '',
          designation: organization.designation || '',
          accreditationDocUrl: organization.accreditationDocUrl || '',
        };
      }
      user.isOnboarded = true;
    } else if (accountType === 'admin') {
      const isDeployer = user.walletAddress.toLowerCase() === ADMIN_WALLET;
      const isAuthorizedKey = adminSecretKey && adminSecretKey.trim() === ADMIN_SECRET;

      if (!isDeployer && !isAuthorizedKey) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Admin account creation requires deployer wallet or valid Admin Secret Key.',
        });
      }
      user.accountType = 'admin';
      user.role = 'admin';
      user.verifierStatus = 'approved';
      user.isOnboarded = true;
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    await user.save();

    const secret = process.env.JWT_SECRET || 'trustmesh-jwt-secret-key';
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Onboarding completed successfully as ${accountType}.`,
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountType: user.accountType,
        verifierStatus: user.verifierStatus,
        organization: user.organization,
        isSuspended: Boolean(user.isSuspended),
        suspensionReason: user.suspensionReason || '',
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve active authenticated session and account profile.
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountType: user.accountType || null,
        verifierStatus: user.verifierStatus || (user.role === 'verifier' ? 'approved' : 'none'),
        organization: user.organization || {},
        isSuspended: Boolean(user.isSuspended),
        suspensionReason: user.suspensionReason || '',
        isOnboarded: Boolean(user.isOnboarded && user.accountType),
      },
    });
  } catch (error) {
    next(error);
  }
};

