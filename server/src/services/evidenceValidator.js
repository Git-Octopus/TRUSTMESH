const path = require('path');
const fs = require('fs');
const { hashData, hashFile, findDuplicateHash } = require('./hashService');

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx', '.txt'];
const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * Validates an uploaded evidence file against size, MIME, duplicate hash, and profile matching.
 * @param {object} file - Multer file object
 * @param {object} options - Options including user/profile data and claim ID
 * @returns {Promise<{ valid: boolean, errors: string[], warnings: string[], hash: string, metadata: object }>}
 */
const validateEvidenceFile = async (file, options = {}) => {
  const errors = [];
  const warnings = [];
  let computedHash = null;

  if (!file) {
    return {
      valid: false,
      errors: ['No evidence file provided.'],
      warnings: [],
      hash: null,
      metadata: {},
    };
  }

  // 1. File extension validation
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid file extension: '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // 2. MIME type validation
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    errors.push(`Invalid MIME type: '${file.mimetype}'.`);
  }

  // 3. File size limit
  const maxMb = parseInt(process.env.MAX_UPLOAD_MB, 10) || 5;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${maxMb}MB.`);
  }

  // 4. Compute SHA-256 hash
  try {
    if (file.path && fs.existsSync(file.path)) {
      computedHash = await hashFile(file.path);
    } else if (file.buffer) {
      computedHash = hashData(file.buffer);
    }
  } catch (err) {
    errors.push(`Failed to calculate file hash: ${err.message}`);
  }

  // 5. Duplicate Hash Check
  if (computedHash) {
    const { isDuplicate, existingClaim } = await findDuplicateHash(
      computedHash,
      options.claimId || null
    );
    if (isDuplicate) {
      warnings.push(`Identical evidence hash previously used in claim '${existingClaim?.title || existingClaim?._id}'.`);
    }
  }

  // 6. Name match validation against profile/user
  const claimantName = options.claimantName || options.user?.name || '';
  if (claimantName && claimantName.trim().length > 0) {
    const normalizedClaimant = claimantName.toLowerCase().trim();
    const filenameLower = file.originalname.toLowerCase();
    
    // Check if filename contains parts of claimant's name or metadata
    const nameParts = normalizedClaimant.split(/\s+/).filter((p) => p.length > 2);
    const hasNameMatch = nameParts.some((part) => filenameLower.includes(part));
    
    if (!hasNameMatch) {
      warnings.push(`Claimant name '${claimantName}' was not detected in evidence filename '${file.originalname}'.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hash: computedHash,
    metadata: {
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      extension: ext,
      validatedAt: new Date(),
    },
  };
};

/**
 * Validates raw evidence content / hash directly.
 * @param {string} hash - SHA-256 hash
 * @param {object} metadata - Optional claim metadata
 * @returns {Promise<{ valid: boolean, errors: string[], warnings: string[] }>}
 */
const validateEvidenceHash = async (hash, metadata = {}) => {
  const errors = [];
  const warnings = [];

  if (!hash || !/^[a-fA-F0-9]{64}$/.test(hash)) {
    errors.push('Invalid SHA-256 evidence hash format (must be 64-character hex string).');
    return { valid: false, errors, warnings };
  }

  const { isDuplicate, existingClaim } = await findDuplicateHash(hash, metadata.claimId);
  if (isDuplicate) {
    warnings.push(`Evidence hash is already linked to claim '${existingClaim?.title || existingClaim?._id}'.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

module.exports = {
  validateEvidenceFile,
  validateEvidenceHash,
};
