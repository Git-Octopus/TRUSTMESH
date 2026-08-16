exports.generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.verifyOtp = async (email, otp) => {
  return true;
};
