const nodemailer = require('nodemailer');
const crypto = require('crypto');

let transporter = null;

/**
 * Initializes and returns a singleton Nodemailer transporter.
 * Uses configured SMTP credentials if provided in the environment.
 * If SMTP is not configured (such as during local development or testing),
 * initializes a JSON stream transport that formats and logs dispatches.
 */
const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const cleanPass = pass ? pass.replace(/\s+/g, '') : pass;

  if (host && user && cleanPass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: user.trim(), pass: cleanPass },
    });
  } else if (process.env.NODE_ENV === 'test') {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  } else {
    // Local developer stream transport
    transporter = {
      sendMail: async (mailOptions) => {
        const messageId = `<${crypto.randomBytes(16).toString('hex')}@trustmesh.network>`;
        if (process.env.NODE_ENV !== 'test') {
          const matchCode = mailOptions.text.match(/\b\d{6}\b/);
          console.log(`[EmailService] Outgoing Notification -> To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          if (matchCode) {
            console.log(`[EmailService] ⚡ DEV OTP CODE: [ ${matchCode[0]} ] (Valid for 5 mins)`);
          }
        }
        return {
          messageId,
          accepted: [mailOptions.to],
          rejected: [],
          response: '250 Message accepted for delivery',
          envelope: {
            from: mailOptions.from,
            to: [mailOptions.to],
          },
        };
      },
    };
  }

  return transporter;
};

/**
 * Dispatches an OTP verification email to the user.
 * @param {string} to - Recipient email address
 * @param {string} otpCode - 6-digit verification code
 * @param {number} expiryMinutes - Code expiration in minutes
 * @returns {Promise<object>} Send result object
 */
const sendOtpEmail = async (to, otpCode, expiryMinutes = 5) => {
  const mailTransporter = getTransporter();
  const subject = 'TrustMesh - Your Verification Code';
  const text = `Your TrustMesh email verification code is: ${otpCode}. It will expire in ${expiryMinutes} minutes.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">TrustMesh Verification</h2>
      <p style="font-size: 15px; line-height: 1.5;">Please use the following single-use code to verify your email address:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 24px; background: #f8fafc; border: 1px solid #cbd5e1; display: inline-block; border-radius: 6px; margin: 16px 0; color: #0f172a;">
        ${otpCode}
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in <strong>${expiryMinutes} minutes</strong>. If you did not request this verification, please disregard this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 11px;">TrustMesh Decentralized Identity & Verification Network</p>
    </div>
  `;

  const fromSender = process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"TrustMesh" <${process.env.EMAIL_USER}>` : '"TrustMesh Verification" <no-reply@trustmesh.network>');
  return await mailTransporter.sendMail({
    from: fromSender,
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
