exports.verifyClaim = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'Claim verification submitted' });
  } catch (error) {
    next(error);
  }
};

exports.getVerificationHistory = async (req, res, next) => {
  try {
    res.status(200).json({ history: [] });
  } catch (error) {
    next(error);
  }
};
