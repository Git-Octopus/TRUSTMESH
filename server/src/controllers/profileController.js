const Profile = require('../models/Profile');
const User = require('../models/User');
const Claim = require('../models/Claim');
const { calculateProfileTrustScore } = require('../services/trustScoreService');

/**
 * Create or initialize profile for authenticated user.
 * POST /api/profile
 */
exports.createProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { headline, bio, education, skills, experience, profileImage, name } = req.body;

    let profile = await Profile.findOne({ userId });
    if (profile) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists for this user. Use PUT /api/profile to update.',
        profile,
      });
    }

    profile = await Profile.create({
      userId,
      headline: headline || '',
      bio: bio || '',
      education: education || [],
      skills: skills || [],
      experience: experience || [],
      profileImage: profileImage || '',
    });

    if (name) {
      await User.findByIdAndUpdate(userId, { name });
    }

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public profile by wallet address.
 * GET /api/profile/:wallet
 */
exports.getProfileByWallet = async (req, res, next) => {
  try {
    const { wallet } = req.params;
    let targetWallet = wallet ? wallet.toLowerCase().trim() : '';

    if (targetWallet === 'me' && req.user?.walletAddress) {
      targetWallet = req.user.walletAddress.toLowerCase();
    }

    if (!targetWallet || (!/^0x[a-fA-F0-9]{40}$/.test(targetWallet) && targetWallet !== 'me')) {
      return res.status(400).json({
        success: false,
        message: 'A valid Ethereum wallet address (0x...) is required.',
      });
    }

    const user = await User.findOne({
      walletAddress: targetWallet,
    }).select('-nonce');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No profile found for this wallet address.',
      });
    }

    let profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      profile = await Profile.create({ userId: user._id });
    }

    // Fetch verified and public claims
    const claims = await Claim.find({ profileId: profile._id }).sort({ createdAt: -1 });

    // Compute live trust score
    const trustScore = await calculateProfileTrustScore(profile._id);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
      },
      profile,
      claims,
      trustScore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's profile.
 * PUT /api/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { headline, bio, education, skills, experience, profileImage, name, email } = req.body;

    let profile = await Profile.findOne({ userId });
    if (!profile) {
      profile = new Profile({ userId });
    }

    if (headline !== undefined) profile.headline = headline;
    if (bio !== undefined) profile.bio = bio;
    if (education !== undefined) profile.education = education;
    if (skills !== undefined) profile.skills = skills;
    if (experience !== undefined) profile.experience = experience;
    if (profileImage !== undefined) profile.profileImage = profileImage;

    await profile.save();

    const user = await User.findById(userId);
    if (user) {
      if (name !== undefined) user.name = name;
      if (email !== undefined && email.trim() !== '') {
        const cleanEmail = email.toLowerCase().trim();
        // If email was modified to a different address, mark unverified until OTP confirmed
        if (user.email && user.email !== cleanEmail) {
          user.email = cleanEmail;
          user.emailVerified = false;
        } else if (!user.email) {
          user.email = cleanEmail;
        }
      }
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
      user: user
        ? {
            id: user._id,
            walletAddress: user.walletAddress,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            role: user.role,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};
