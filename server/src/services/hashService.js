const crypto = require('crypto');
const fs = require('fs');
const Claim = require('../models/Claim');

/**
 * Computes SHA-256 hash for a Buffer or String.
 * @param {Buffer|string} input 
 * @returns {string} Hex-encoded SHA-256 digest
 */
const hashData = (input) => {
  if (!input) {
    throw new Error('Input is required for hashing');
  }
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Computes SHA-256 hash of a file on disk.
 * @param {string} filePath 
 * @returns {Promise<string>} Hex-encoded SHA-256 digest
 */
const hashFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Checks whether an evidence hash is already linked to another claim.
 * @param {string} evidenceHash - SHA-256 hash
 * @param {string} [excludeClaimId] - Optional claim ID to ignore
 * @returns {Promise<{ isDuplicate: boolean, existingClaim: object|null }>}
 */
const findDuplicateHash = async (evidenceHash, excludeClaimId = null) => {
  if (!evidenceHash) {
    return { isDuplicate: false, existingClaim: null };
  }

  const query = { evidenceHash };
  if (excludeClaimId) {
    query._id = { $ne: excludeClaimId };
  }

  const existingClaim = await Claim.findOne(query).select('title profileId status createdAt');
  return {
    isDuplicate: Boolean(existingClaim),
    existingClaim,
  };
};

module.exports = {
  hashData,
  hashFile,
  findDuplicateHash,
};
