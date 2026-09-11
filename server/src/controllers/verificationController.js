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
    const isVerifierAuthorized = verifierUser ? ['verifier', 'admin'].includes(verifierUser.role) : true;

    // Apply verification engine rule:
    // IF email_verified AND evidence_valid AND verifier_authorized AND verifier_approved
    // THEN claim_status = VERIFIED ELSE REJECTED / PENDING
    const isApproved = approved !== undefined ? Boolean(approved) : status === CLAIM_STATUSES.VERIFIED;
    const emailVerified = Boolean(claim.userId?.emailVerified);
    const evidenceValid = Boolean(claim.evidenceHash);

    let nextStatus = CLAIM_STATUSES.VERIFICATION_PENDING;
    if (status === CLAIM_STATUSES.REVOKED) {
      nextStatus = CLAIM_STATUSES.REVOKED;
    } else if (isApproved && isVerifierAuthorized && emailVerified && evidenceValid) {
      nextStatus = CLAIM_STATUSES.VERIFIED;
    } else if (!isApproved) {
      nextStatus = CLAIM_STATUSES.REJECTED;
    } else {
      // If missing requirements, retain pending with reason
      nextStatus = CLAIM_STATUSES.VERIFICATION_PENDING;
    }

    claim.status = nextStatus;
    if (onChainClaimId !== undefined) {
      claim.onChainClaimId = onChainClaimId;
    }

    claim.verification = {
      verifierId: verifierUser ? verifierUser._id : null,
      verifierWallet: wallet,
      verificationMethod: method || 'manual',
      verifiedAt: new Date(),
      transactionHash: transactionHash || '',
      status: nextStatus,
    };
    await claim.save();

    // Create Verification audit trail record
    const verificationRecord = await Verification.create({
      claimId: claim._id,
      verifierId: verifierUser ? verifierUser._id : null,
      verifierWallet: wallet,
      method: method || 'manual',
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
 * Compute and return public trust score for a profile.
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

    const trustScoreData = await calculateProfileTrustScore(profileId);

    return res.status(200).json({
      success: true,
      profileId,
      ...trustScoreData,
    });
  } catch (error) {
    next(error);
  }
};
