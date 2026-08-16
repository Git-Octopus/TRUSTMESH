exports.calculateTrustScore = (verifications = []) => {
  let score = 50;
  verifications.forEach((v) => {
    score += v.approved ? 10 : -10;
  });
  return Math.max(0, Math.min(100, score));
};
