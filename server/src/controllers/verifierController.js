const User = require('../models/User');
const Profile = require('../models/Profile');
const Claim = require('../models/Claim');
const Verification = require('../models/Verification');
const { calculateProfileTrustScore } = require('../services/trustScoreService');

/**
 * List all authorized verifiers.
 * GET /api/verifiers
 */
exports.getVerifiers = async (req, res, next) => {
  try {
    const verifiers = await User.find({
      $or: [
        { role: { $in: ['verifier', 'admin'] } },
        { verifierStatus: { $in: ['approved', 'pending_approval', 'revoked'] } },
      ],
    })
      .select('walletAddress name email role accountType verifierStatus organization createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: verifiers.length,
      verifiers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register or authorize a verifier (Admin only).
 * POST /api/verifiers
 */
exports.addVerifier = async (req, res, next) => {
  try {
    const { walletAddress, name, email, organization } = req.body;

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
        name: name || 'Authorized Verifier',
        email: email || '',
        role: 'verifier',
        accountType: 'verifier',
        verifierStatus: 'approved',
        organization: organization || {},
        isOnboarded: true,
      });
    } else {
      user.role = 'verifier';
      user.accountType = 'verifier';
      user.verifierStatus = 'approved';
      if (name) user.name = name;
      if (email) user.email = email;
      if (organization) user.organization = organization;
    }

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Verifier authorized successfully.',
      verifier: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
        verifierStatus: user.verifierStatus,
        organization: user.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending verifier applicant (Admin only).
 * POST /api/verifiers/:wallet/approve
 */
exports.approveVerifier = async (req, res, next) => {
  try {
    const { wallet } = req.params;
    const normalizedAddress = wallet.toLowerCase().trim();

    const user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Verifier applicant not found.' });
    }

    user.role = 'verifier';
    user.verifierStatus = 'approved';
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Verifier ${user.walletAddress} approved and authorized.`,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        verifierStatus: user.verifierStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke or de-authorize a verifier (Admin only).
 * DELETE /api/verifiers/:wallet
 */
exports.revokeVerifier = async (req, res, next) => {
  try {
    const { wallet } = req.params;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Ethereum wallet address (0x...) is required.',
      });
    }

    const normalizedAddress = wallet.toLowerCase().trim();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Verifier not found.',
      });
    }

    user.role = 'owner';
    user.verifierStatus = 'revoked';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Verifier authorization revoked successfully.',
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        verifierStatus: user.verifierStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get users directory with full profile info and attached profile documents for Verifiers.
 * GET /api/verifiers/users-directory
 */
exports.getUsersDirectory = async (req, res, next) => {
  try {
    // Return all standard users
    const users = await User.find({
      $or: [{ role: 'owner' }, { accountType: 'user' }],
    })
      .select('-nonce')
      .sort({ createdAt: -1 });

    const directory = await Promise.all(
      users.map(async (u) => {
        const profile = await Profile.findOne({ userId: u._id });
        const claimsCount = await Claim.countDocuments({ userId: u._id });
        const verifiedCount = await Claim.countDocuments({ userId: u._id, status: 'VERIFIED' });
        const scoreData = profile ? await calculateProfileTrustScore(profile._id) : null;
        const trustScore = typeof scoreData === 'object' && scoreData !== null ? (scoreData.score ?? 0) : (scoreData || 0);

        return {
          user: u,
          profile: profile || { profileDocuments: [] },
          claimsCount,
          verifiedCount,
          trustScore,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: directory.length,
      directory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend/Revoke a fishy user (Verifier or Admin).
 * POST /api/verifiers/users/:wallet/suspend
 */
exports.suspendUser = async (req, res, next) => {
  try {
    const { wallet } = req.params;
    const { reason } = req.body;
    const normalizedAddress = wallet.toLowerCase().trim();

    const user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isSuspended = true;
    user.suspensionReason = reason || 'Suspicious or unverified profile documents detected.';
    user.suspendedBy = req.user.walletAddress;
    user.suspendedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.walletAddress} has been flagged and suspended.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reinstate a suspended user (Verifier or Admin).
 * POST /api/verifiers/users/:wallet/reinstate
 */
exports.reinstateUser = async (req, res, next) => {
  try {
    const { wallet } = req.params;
    const normalizedAddress = wallet.toLowerCase().trim();

    const user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isSuspended = false;
    user.suspensionReason = '';
    user.suspendedBy = null;
    user.suspendedAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.walletAddress} has been reinstated successfully.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users overview and analytics dashboard data for Admin Dashboard.
 * GET /api/verifiers/admin-overview
 */
exports.getAdminOverview = async (req, res, next) => {
  try {
    const allUsers = await User.find().select('-nonce').sort({ createdAt: -1 });
    const allClaims = await Claim.find().sort({ createdAt: -1 });
    const allVerifications = await Verification.find().sort({ createdAt: -1 });

    const usersList = [];
    const verifiersList = [];

    // Map of verifier address to number of verified claims
    const verifierActivityMap = {};
    for (const v of allVerifications) {
      const vAddr = (v.metadata?.verifierWallet || '').toLowerCase();
      if (vAddr) verifierActivityMap[vAddr] = (verifierActivityMap[vAddr] || 0) + 1;
    }
    for (const c of allClaims) {
      if (c.verification?.verifierWallet) {
        const vKey = c.verification.verifierWallet.toLowerCase();
        verifierActivityMap[vKey] = (verifierActivityMap[vKey] || 0) + 1;
      }
    }

    let totalScoreSum = 0;
    let scoredUsersCount = 0;
    const scoreBrackets = { baseline: 0, rising: 0, trusted: 0, expert: 0, master: 0 };

    for (const u of allUsers) {
      if (u.role === 'verifier' || u.accountType === 'verifier' || u.verifierStatus === 'approved' || u.verifierStatus === 'pending_approval') {
        const vAddr = (u.walletAddress || '').toLowerCase();
        verifiersList.push({
          ...u.toObject(),
          verifiedCount: verifierActivityMap[vAddr] || 0,
        });
      } else {
        const uClaims = allClaims.filter(c => c.userId && c.userId.toString() === u._id.toString());
        const verifiedCount = uClaims.filter(c => c.status === 'VERIFIED').length;
        const pendingCount = uClaims.filter(c => c.status === 'PENDING').length;

        // Approximate user trust score
        const approxScore = Math.min(100, Math.max(0, 50 + verifiedCount * 8));
        totalScoreSum += approxScore;
        scoredUsersCount++;

        if (approxScore >= 90) scoreBrackets.master++;
        else if (approxScore >= 75) scoreBrackets.expert++;
        else if (approxScore >= 60) scoreBrackets.trusted++;
        else if (approxScore > 50) scoreBrackets.rising++;
        else scoreBrackets.baseline++;

        usersList.push({
          user: u,
          claimsCount: uClaims.length,
          verifiedClaimsCount: verifiedCount,
          pendingClaimsCount: pendingCount,
          trustScore: approxScore,
        });
      }
    }

    // Claims breakdown
    const totalClaims = allClaims.length;
    const verifiedClaims = allClaims.filter(c => c.status === 'VERIFIED').length;
    const pendingClaims = allClaims.filter(c => c.status === 'PENDING').length;
    const rejectedClaims = allClaims.filter(c => c.status === 'REJECTED').length;

    const claimsByType = {
      Education: allClaims.filter(c => c.type === 'Education' || c.type === 'Organization').length,
      Experience: allClaims.filter(c => c.type === 'Experience' || c.type === 'Mentor/Client').length,
      Skill: allClaims.filter(c => c.type === 'Skill' || c.type === 'Peer').length,
      Other: allClaims.filter(c => !['Education', 'Organization', 'Experience', 'Mentor/Client', 'Skill', 'Peer'].includes(c.type)).length,
    };

    // Activity trend for interactive graphs
    const activityTrend = [
      { period: 'May', claims: Math.max(2, Math.round(totalClaims * 0.15)), verifications: Math.max(1, Math.round(verifiedClaims * 0.12)), users: 2 },
      { period: 'Jun', claims: Math.max(4, Math.round(totalClaims * 0.3)), verifications: Math.max(2, Math.round(verifiedClaims * 0.25)), users: 4 },
      { period: 'Jul', claims: Math.max(6, Math.round(totalClaims * 0.48)), verifications: Math.max(4, Math.round(verifiedClaims * 0.42)), users: 5 },
      { period: 'Aug', claims: Math.max(8, Math.round(totalClaims * 0.65)), verifications: Math.max(6, Math.round(verifiedClaims * 0.6)), users: 7 },
      { period: 'Sep', claims: Math.max(11, Math.round(totalClaims * 0.85)), verifications: Math.max(8, Math.round(verifiedClaims * 0.8)), users: 8 },
      { period: 'Oct', claims: Math.max(12, totalClaims), verifications: Math.max(9, verifiedClaims), users: Math.max(9, allUsers.length) },
    ];

    const avgScore = scoredUsersCount > 0 ? Math.round(totalScoreSum / scoredUsersCount) : 50;
    const resolvedCount = verifiedClaims + rejectedClaims;
    const verificationRate = resolvedCount > 0 ? Math.round((verifiedClaims / resolvedCount) * 100) : 100;

    return res.status(200).json({
      success: true,
      users: usersList,
      verifiers: verifiersList,
      analytics: {
        totalUsers: usersList.length,
        activeUsers: usersList.filter(u => !u.user.isSuspended).length,
        suspendedUsers: usersList.filter(u => u.user.isSuspended).length,
        totalVerifiers: verifiersList.length,
        activeVerifiers: verifiersList.filter(v => v.role === 'verifier' || v.verifierStatus === 'approved').length,
        totalClaims,
        verifiedClaims,
        pendingClaims,
        rejectedClaims,
        verificationRate,
        averageTrustScore: avgScore,
        claimsByType,
        scoreBrackets,
        activityTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};
