const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Verification = require('../models/Verification');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { CLAIM_STATUSES } = require('../utils/constants');
const { hashData, findDuplicateHash } = require('../services/hashService');
const { validateEvidenceHash } = require('../services/evidenceValidator');
const { calculateProfileTrustScore } = require('../services/trustScoreService');

/**
 * Compute SHA-256 hash and check duplicates.
 * POST /api/verification/hash
 */
exports.computeHash = async (req, res, next) => {
  try {
    const { data, text, excludeClaimId } = req.body;
    const input = data || text;

    if (!input) {
      return res.status(400).json({
        success: false,
        message: 'Data or text content is required for hashing.',
      });
    }

    const hash = hashData(input);
    const { isDuplicate, existingClaim } = await findDuplicateHash(hash, excludeClaimId);

    return res.status(200).json({
      success: true,
      hash,
      isDuplicate,
      existingClaim: isDuplicate ? existingClaim : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Run automated evidence checks and advance claim status.
 * POST /api/verification/evidence-check
 */
exports.runEvidenceCheck = async (req, res, next) => {
  try {
    const { claimId } = req.body;
    if (!claimId) {
      return res.status(400).json({
        success: false,
        message: 'claimId is required.',
      });
    }

    const claim = await Claim.findById(claimId).populate('userId');
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    const user = claim.userId;
    const hasEvidence = Boolean(claim.evidenceUrl || claim.evidenceHash);
    const isEmailVerified = Boolean(user && user.emailVerified);

    let hashValid = false;
    let hashCheck = { valid: false, errors: [], warnings: [] };

    if (claim.evidenceHash) {
      hashCheck = await validateEvidenceHash(claim.evidenceHash, { claimId: claim._id });
      hashValid = hashCheck.valid;
    }

    const allPassed = hasEvidence && hashValid;

    if (allPassed) {
      claim.status = CLAIM_STATUSES.VERIFICATION_PENDING;
    } else {
      claim.status = CLAIM_STATUSES.EVIDENCE_CHECK;
    }
    await claim.save();

    return res.status(200).json({
      success: true,
      claimId: claim._id,
      status: claim.status,
      checks: {
        hasEvidence,
        hashValid,
        emailVerified: isEmailVerified,
        warnings: hashCheck.warnings,
        errors: hashCheck.errors,
      },
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request claim verification from verifiers.
 * POST /api/verification/request
 */
exports.requestVerification = async (req, res, next) => {
  try {
    const { claimId, verifierWallet } = req.body;
    const userId = req.user._id || req.user.id;

    if (!claimId) {
      return res.status(400).json({
        success: false,
        message: 'claimId is required.',
      });
    }

    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    if (claim.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only request verification for your own claims.',
      });
    }

    if (claim.status === CLAIM_STATUSES.VERIFIED) {
      return res.status(400).json({
        success: false,
        message: 'Claim is already verified.',
      });
    }

    claim.status = CLAIM_STATUSES.VERIFICATION_PENDING;
    if (verifierWallet) {
      claim.verification = {
        ...(claim.verification || {}),
        verifierWallet: verifierWallet.toLowerCase().trim(),
      };
    }
    await claim.save();

    return res.status(200).json({
      success: true,
      message: 'Claim verification requested successfully.',
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record on-chain or off-chain verification result and sync claim state.
 * POST /api/verification/sync
 */
exports.syncVerification = async (req, res, next) => {
  try {
    const {
      claimId,
      onChainClaimId,
      verifierWallet,
      status,
      transactionHash,
      blockchainTimestamp,
      comments,
      approved,
      method,
    } = req.body;

    let claim = null;
    if (claimId) {
      claim = await Claim.findById(claimId).populate('userId');
    } else if (onChainClaimId !== undefined) {
      claim = await Claim.findOne({ onChainClaimId }).populate('userId');
    }

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found for syncing.',
      });
    }

    const wallet = (verifierWallet || req.user?.walletAddress || '').toLowerCase().trim();
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'Verifier wallet address is required.',
      });
    }

    // Look up verifier user in DB if exists
    const verifierUser = await User.findOne({ walletAddress: wallet });
    if (verifierUser && !verifierUser.emailVerified && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Institutional verifier must verify their official email before attesting claims.',
      });
    }
    const isVerifierAuthorized = verifierUser ? ['verifier', 'admin'].includes(verifierUser.role) : true;

    // Apply verification engine rule:
    // If approved on chain (or with valid transactionHash/authorization), claim is VERIFIED
    const isApproved = approved !== undefined ? Boolean(approved) : status === CLAIM_STATUSES.VERIFIED;

    let nextStatus = CLAIM_STATUSES.VERIFICATION_PENDING;
    if (status === CLAIM_STATUSES.REVOKED) {
      nextStatus = CLAIM_STATUSES.REVOKED;
    } else if (isApproved) {
      nextStatus = CLAIM_STATUSES.VERIFIED;
    } else {
      nextStatus = CLAIM_STATUSES.REJECTED;
    }

    claim.status = nextStatus;
    if (onChainClaimId !== undefined) {
      claim.onChainClaimId = onChainClaimId;
    }

    claim.verification = {
      verifierId: verifierUser ? verifierUser._id : null,
      verifierWallet: wallet,
      verificationMethod: method || (transactionHash ? 'smart_contract' : 'manual'),
      verifiedAt: new Date(),
      transactionHash: transactionHash || '',
      status: nextStatus,
      comments: comments || (isApproved ? 'Approved by verifier' : 'Rejected by verifier'),
    };
    await claim.save();

    // Create Verification audit trail record
    const verificationRecord = await Verification.create({
      claimId: claim._id,
      verifierId: verifierUser ? verifierUser._id : null,
      verifierWallet: wallet,
      method: method || (transactionHash ? 'smart_contract' : 'manual'),
      status: nextStatus === CLAIM_STATUSES.VERIFIED ? 'VERIFIED' : (nextStatus === CLAIM_STATUSES.REVOKED ? 'REVOKED' : 'REJECTED'),
      approved: isApproved,
      comments: comments || (isApproved ? 'Approved verification' : 'Rejected verification'),
      transactionHash: transactionHash || '',
      blockchainTimestamp: blockchainTimestamp || Math.floor(Date.now() / 1000),
    });

    return res.status(200).json({
      success: true,
      message: `Verification synced. Claim status: ${nextStatus}`,
      claim,
      verification: verificationRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Directly verify a claim on-chain or off-chain by an authorized verifier.
 * POST /api/verification/:id/verify
 */
exports.verifyClaim = async (req, res, next) => {
  try {
    const claimId = req.params.id || req.body.claimId;
    const { comments, transactionHash, onChainClaimId } = req.body;
    const wallet = (req.user?.walletAddress || '').toLowerCase().trim();

    const claim = await Claim.findById(claimId).populate('userId');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    claim.status = CLAIM_STATUSES.VERIFIED;
    if (onChainClaimId !== undefined) {
      claim.onChainClaimId = onChainClaimId;
    }

    const verifierUser = await User.findOne({ walletAddress: wallet });

    claim.verification = {
      verifierId: verifierUser ? verifierUser._id : (req.user?._id || req.user?.id),
      verifierWallet: wallet,
      verificationMethod: transactionHash ? 'smart_contract' : 'manual',
      verifiedAt: new Date(),
      transactionHash: transactionHash || '',
      status: CLAIM_STATUSES.VERIFIED,
      comments: comments || 'Verified by authorized protocol verifier.',
    };
    await claim.save();

    const verificationRecord = await Verification.create({
      claimId: claim._id,
      verifierId: verifierUser ? verifierUser._id : (req.user?._id || req.user?.id),
      verifierWallet: wallet,
      method: transactionHash ? 'smart_contract' : 'manual',
      status: 'VERIFIED',
      approved: true,
      comments: comments || 'Verified by authorized protocol verifier.',
      transactionHash: transactionHash || '',
      blockchainTimestamp: Math.floor(Date.now() / 1000),
    });

    return res.status(200).json({
      success: true,
      message: 'Claim verified successfully.',
      claim,
      verification: verificationRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Directly reject a claim by an authorized verifier.
 * POST /api/verification/:id/reject
 */
exports.rejectClaim = async (req, res, next) => {
  try {
    const claimId = req.params.id || req.body.claimId;
    const { comments, reason } = req.body;
    const wallet = (req.user?.walletAddress || '').toLowerCase().trim();

    const claim = await Claim.findById(claimId).populate('userId');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    claim.status = CLAIM_STATUSES.REJECTED;
    const verifierUser = await User.findOne({ walletAddress: wallet });

    claim.verification = {
      verifierId: verifierUser ? verifierUser._id : (req.user?._id || req.user?.id),
      verifierWallet: wallet,
      verificationMethod: 'manual',
      verifiedAt: new Date(),
      status: CLAIM_STATUSES.REJECTED,
      comments: comments || reason || 'Rejected by authorized protocol verifier.',
    };
    await claim.save();

    const verificationRecord = await Verification.create({
      claimId: claim._id,
      verifierId: verifierUser ? verifierUser._id : (req.user?._id || req.user?.id),
      verifierWallet: wallet,
      method: 'manual',
      status: 'REJECTED',
      approved: false,
      comments: comments || reason || 'Rejected by authorized protocol verifier.',
      blockchainTimestamp: Math.floor(Date.now() / 1000),
    });

    return res.status(200).json({
      success: true,
      message: 'Claim rejected successfully.',
      claim,
      verification: verificationRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compute and return public trust score for a profile or wallet.
 * GET /api/trust-score/:profileId
 */
exports.getTrustScore = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'profileId parameter is required.',
      });
    }

    let targetProfile = null;
    let targetUser = null;

    // Check if profileId is an Ethereum wallet address (0x...)
    if (typeof profileId === 'string' && profileId.startsWith('0x')) {
      const normalized = profileId.toLowerCase().trim();
      targetUser = await User.findOne({ walletAddress: normalized });
      if (targetUser) {
        targetProfile = await Profile.findOne({ userId: targetUser._id });
      }
    } else if (mongoose.Types.ObjectId.isValid(profileId)) {
      targetProfile = await Profile.findById(profileId);
      if (targetProfile) {
        targetUser = await User.findById(targetProfile.userId);
      }
    }

    // If profile or user doesn't exist yet, return baseline trust score (50)
    if (!targetProfile) {
      return res.status(200).json({
        success: true,
        profileId,
        trustScore: 50,
        score: 50,
        baseScore: 50,
        verifiedPoints: 0,
        maxScore: 100,
        totalClaims: 0,
        totalVerified: 0,
        breakdown: { organization: 0, mentorClient: 0, peer: 0, self: 0, other: 0 },
        badges: ['Rising Member'],
        verifiedClaims: [],
      });
    }

    const trustScoreData = await calculateProfileTrustScore(targetProfile._id);

    // Fetch verified claims for breakdown list in TrustDashboard
    const verifiedClaimsDocs = await Claim.find({
      profileId: targetProfile._id,
      status: CLAIM_STATUSES.VERIFIED,
    }).sort({ updatedAt: -1 });

    const verifiedClaims = verifiedClaimsDocs.map((c) => ({
      claimId: c._id,
      title: c.title,
      type: c.type || 'Other',
      verifierWallet: c.verification?.verifierWallet || '',
      verifiedAt: c.verification?.verifiedAt || c.updatedAt,
      points: (c.type === 'Organization' || c.type === 'Education')
        ? 10
        : (c.type === 'Mentor/Client' || c.type === 'Experience')
        ? 8
        : 3,
    }));

    return res.status(200).json({
      success: true,
      profileId: targetProfile._id,
      walletAddress: targetUser?.walletAddress || '',
      trustScore: trustScoreData.score,
      score: trustScoreData.score,
      ...trustScoreData,
      verifiedClaims,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve verification audit trail history for a claim or profile.
 * GET /api/verification/history/:claimId
 * GET /api/verification/history?profileId=...
 */
exports.getVerificationHistory = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { profileId } = req.query;

    const filter = {};
    if (claimId && claimId !== 'all') {
      filter.claimId = claimId;
    } else if (profileId) {
      const claims = await Claim.find({ profileId }).select('_id');
      const claimIds = claims.map((c) => c._id);
      filter.claimId = { $in: claimIds };
    }

    const history = await Verification.find(filter)
      .populate('claimId', 'title type status evidenceHash onChainClaimId')
      .populate('verifierId', 'walletAddress name role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};
