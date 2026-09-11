const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // Development / Mock Transporter
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n[EmailService - DEV MODE]');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body: ${mailOptions.text || mailOptions.html}`);
        console.log('------------------------------------\n');
        return { messageId: 'mock-dev-id-' + Date.now() };
      },
    };
  }

  return transporter;
};

/**
 * Sends OTP email to the user.
 * @param {string} to - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 * @param {number} expiryMinutes - Expiration in minutes
 */
const sendOtpEmail = async (to, otpCode, expiryMinutes = 5) => {
  const mailTransporter = getTransporter();
  const subject = 'TrustMesh - Your Verification Code';
  const text = `Your TrustMesh email verification code is: ${otpCode}. It will expire in ${expiryMinutes} minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4F46E5;">TrustMesh Verification</h2>
      <p>Please use the following single-use code to verify your email address:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #F3F4F6; display: inline-block; border-radius: 6px; margin: 16px 0;">
        ${otpCode}
      </div>
      <p style="color: #6B7280; font-size: 14px;">This code expires in <strong>${expiryMinutes} minutes</strong>. If you did not request this, please ignore this email.</p>
    </div>
  `;

  return await mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || '"TrustMesh Verification" <no-reply@trustmesh.network>',
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendOtpEmail,
  getTransporter,
};
