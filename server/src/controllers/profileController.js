exports.getProfile = async (req, res, next) => {
  try {
    res.status(200).json({ profile: {} });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};
