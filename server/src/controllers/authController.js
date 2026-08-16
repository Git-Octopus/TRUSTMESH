exports.register = async (req, res, next) => {
  try {
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    res.status(200).json({ token: 'jwt-token-placeholder' });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    next(error);
  }
};
