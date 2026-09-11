const CLAIM_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  EVIDENCE_CHECK: 'EVIDENCE_CHECK',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
};

const USER_ROLES = {
  OWNER: 'owner',
  VERIFIER: 'verifier',
  ADMIN: 'admin',
};

const CLAIM_TYPES = {
  ORGANIZATION: 'Organization',
  MENTOR_CLIENT: 'Mentor/Client',
  PEER: 'Peer',
  SELF: 'Self',
  SKILL: 'Skill',
  EXPERIENCE: 'Experience',
  PROJECT: 'Project',
  EDUCATION: 'Education',
};

const TRUST_WEIGHTS = {
  'Organization': 10,
  'Mentor/Client': 8,
  'Peer': 3,
  'Self': 0,
  // Default mapping for general claim categories:
  'Skill': 3,
  'Experience': 8,
  'Project': 5,
  'Education': 10,
};

module.exports = {
  CLAIM_STATUSES,
  USER_ROLES,
  CLAIM_TYPES,
  TRUST_WEIGHTS,
};
