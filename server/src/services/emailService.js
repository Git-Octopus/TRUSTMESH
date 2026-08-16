exports.sendEmail = async (to, subject, text) => {
  console.log(`[Email] Sending email to ${to}: ${subject}`);
  return true;
};
