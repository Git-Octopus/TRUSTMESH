exports.getVerifiers = async (req, res, next) => {
  try {
    res.status(200).json({ verifiers: [] });
  } catch (error) {
    next(error);
  }
};

exports.addVerifier = async (req, res, next) => {
  try {
    res.status(201).json({ message: 'Verifier added' });
  } catch (error) {
    next(error);
  }
};
