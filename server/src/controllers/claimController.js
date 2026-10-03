const Claim = require('../models/Claim');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { CLAIM_STATUSES } = require('../utils/constants');
const { validateEvidenceFile } = require('../services/evidenceValidator');

/**
 * Create a new claim.
 * POST /api/claims
 */
exports.createClaim = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, type, description, evidenceUrl, evidenceHash, status, onChainClaimId } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Claim title and type are required.',
      });
    }

    let profile = await Profile.findOne({ userId });
    if (!profile) {
      profile = await Profile.create({ userId });
    }

    const claimStatus = status && CLAIM_STATUSES[status] ? status : CLAIM_STATUSES.DRAFT;

    const claim = await Claim.create({
      profileId: profile._id,
      userId,
      title,
      type,
      description: description || '',
      evidenceUrl: evidenceUrl || '',
      evidenceHash: evidenceHash || '',
      status: claimStatus,
      onChainClaimId: onChainClaimId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Claim created successfully.',
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get claim by ID with verification details.
 * GET /api/claims/:id
 */
exports.getClaimById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findById(id)
      .populate('profileId')
      .populate('userId', 'walletAddress name email emailVerified role')
      .populate('verification.verifierId', 'walletAddress name role');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    return res.status(200).json({
      success: true,
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List claims with optional filtering.
 * GET /api/claims
 */
exports.getClaims = async (req, res, next) => {
  try {
    const { profileId, userId, status, type } = req.query;
    const filter = {};

    if (profileId) filter.profileId = profileId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const claims = await Claim.find(filter)
      .populate('userId', 'walletAddress name role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: claims.length,
      claims,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload evidence file for a claim and run validation checks.
 * POST /api/claims/:id/evidence
 */
exports.uploadClaimEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    // Ensure only the claim owner or admin can upload evidence
    if (claim.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only upload evidence for your own claims.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No evidence file uploaded.',
      });
    }

    const user = await User.findById(userId);

    // Validate evidence file
    const validationResult = await validateEvidenceFile(req.file, {
      claimId: claim._id,
      claimantName: user?.name,
      user,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Evidence file validation failed.',
        errors: validationResult.errors,
      });
    }

    // Update claim with evidence details
    const relativeEvidencePath = `/uploads/${req.file.filename}`;
    claim.evidenceUrl = relativeEvidencePath;
    claim.evidenceHash = validationResult.hash;
    claim.status = CLAIM_STATUSES.EVIDENCE_CHECK;
    await claim.save();

    return res.status(200).json({
      success: true,
      message: 'Evidence uploaded and validated successfully.',
      evidenceUrl: relativeEvidencePath,
      evidenceHash: validationResult.hash,
      validation: validationResult,
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing claim (owner or admin).
 * PUT /api/claims/:id
 */
exports.updateClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { title, type, description, status, onChainClaimId, evidenceUrl, evidenceHash } = req.body;

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    if (claim.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own claims.',
      });
    }

    // Prohibit editing verified or revoked claims
    if ([CLAIM_STATUSES.VERIFIED, CLAIM_STATUSES.REVOKED].includes(claim.status) && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit claim in '${claim.status}' status.`,
      });
    }

    if (title !== undefined) claim.title = title;
    if (type !== undefined) claim.type = type;
    if (description !== undefined) claim.description = description;
    if (onChainClaimId !== undefined) claim.onChainClaimId = onChainClaimId;
    if (evidenceUrl !== undefined) claim.evidenceUrl = evidenceUrl;
    if (evidenceHash !== undefined) claim.evidenceHash = evidenceHash;
    if (status && CLAIM_STATUSES[status]) claim.status = status;

    await claim.save();

    return res.status(200).json({
      success: true,
      message: 'Claim updated successfully.',
      claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a claim (owner or admin).
 * DELETE /api/claims/:id
 */
exports.deleteClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found.',
      });
    }

    if (claim.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own claims.',
      });
    }

    if ([CLAIM_STATUSES.VERIFIED].includes(claim.status) && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an already verified claim.',
      });
    }

    await Claim.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Claim deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
