exports.validateEvidence = (file) => {
  if (!file) return { valid: false, message: 'No evidence file provided' };
  return { valid: true };
};
