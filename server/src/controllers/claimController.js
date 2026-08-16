exports.createClaim = async (req, res, next) => {
  try {
    res.status(201).json({ message: 'Claim created' });
  } catch (error) {
    next(error);
  }
};

exports.getClaims = async (req, res, next) => {
  try {
    res.status(200).json({ claims: [] });
  } catch (error) {
    next(error);
  }
};

exports.getClaimById = async (req, res, next) => {
  try {
    res.status(200).json({ claim: null });
  } catch (error) {
    next(error);
  }
};
