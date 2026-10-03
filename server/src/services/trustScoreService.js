const { TRUST_WEIGHTS, CLAIM_STATUSES } = require('../utils/constants');
const Claim = require('../models/Claim');
const Profile = require('../models/Profile');

/**
 * Calculates the trust score for a profile based on its verified claims.
 * 
 * Rules:
 * - Base starting score: 50
 * - Verified Organization: +10 pts
 * - Verified Mentor/Client: +8 pts
 * - Verified Peer: +3 pts
 * - Verified Self: +0 pts
 * - Duplicate verifier dampening: Max 2 full-credit verifications per unique verifier;
 *   subsequent verifications from the same verifier receive 50% credit.
 * - Score range: Min 0, Max 100
 * 
 * @param {string} profileId - ObjectId of the Profile
 * @returns {Promise<{ score: number, maxScore: number, totalClaims: number, totalVerified: number, breakdown: object, badges: string[] }>}
 */
const calculateProfileTrustScore = async (profileId) => {
  const claims = await Claim.find({ profileId });

  const breakdown = {
    organization: 0,
    mentorClient: 0,
    peer: 0,
    self: 0,
    other: 0,
  };

  const verifierCounts = {};
  let rawPoints = 0;
  let verifiedCount = 0;

  for (const claim of claims) {
    if (claim.status === CLAIM_STATUSES.VERIFIED) {
      verifiedCount++;
      const type = claim.type || 'Other';
      let points = 0;

      if (type === 'Organization' || type === 'Education') {
        points = TRUST_WEIGHTS.Organization || 10;
        breakdown.organization++;
      } else if (type === 'Mentor/Client' || type === 'Experience') {
        points = TRUST_WEIGHTS['Mentor/Client'] || 8;
        breakdown.mentorClient++;
      } else if (type === 'Peer' || type === 'Skill' || type === 'Project') {
        points = TRUST_WEIGHTS.Peer || 3;
        breakdown.peer++;
      } else if (type === 'Self') {
        points = TRUST_WEIGHTS.Self || 0;
        breakdown.self++;
      } else {
        points = 2;
        breakdown.other++;
      }

      // Duplicate verifier dampening
      const verifierKey = (claim.verification?.verifierWallet || 'unknown').toLowerCase();
      verifierCounts[verifierKey] = (verifierCounts[verifierKey] || 0) + 1;
      if (verifierCounts[verifierKey] > 2) {
        points = Math.round(points * 0.5);
      }

      rawPoints += points;
    }
  }

  // Calculate final clamped score (base 50 + accumulated points up to 100)
  const baseScore = 50;
  const computedScore = Math.min(100, Math.max(0, baseScore + rawPoints));

  // Determine reputation badges
  const badges = [];
  if (computedScore >= 90) badges.push('Master of Trust');
  else if (computedScore >= 75) badges.push('Verified Expert');
  else if (computedScore >= 60) badges.push('Trusted Contributor');
  else badges.push('Rising Member');

  if (breakdown.organization >= 2) badges.push('Institutional Endorsed');
  if (breakdown.mentorClient >= 3) badges.push('Client Approved');

  return {
    score: computedScore,
    baseScore,
    verifiedPoints: rawPoints,
    maxScore: 100,
    totalClaims: claims.length,
    totalVerified: verifiedCount,
    breakdown,
    badges,
  };
};

module.exports = {
  calculateProfileTrustScore,
};
