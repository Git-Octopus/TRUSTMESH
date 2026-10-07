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
  const subject = `[TrustMesh] Your Verification Code: ${otpCode}`;
  const text = `Your TrustMesh email verification code is: ${otpCode}. It will expire in ${expiryMinutes} minutes. If you did not request this, please disregard this email.`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrustMesh Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    Your TrustMesh verification code is ${otpCode}. Valid for ${expiryMinutes} minutes.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Bar with Logo -->
          <tr>
            <td style="padding: 28px 32px 22px; border-bottom: 1px solid #1f2937; background: linear-gradient(180deg, #162032 0%, #111827 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #7c3aed 100%); border-radius: 9px; text-align: center; line-height: 36px; font-size: 18px; color: #ffffff; box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);">
                            🛡️
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <div style="font-size: 19px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">
                            TRUST<span style="color: #38bdf8;">MESH</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 500; color: #94a3b8; letter-spacing: 0.5px;">
                            Decentralized Trust &amp; Verification Network
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 0.5px;">
                      AUTH SECURITY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Confirm Your Email Address
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                A request was made to verify this email address on the <strong style="color: #f3f4f6;">TrustMesh Protocol</strong>. Use the single-use cryptographic verification code below to authorize your identity profile:
              </p>

              <!-- Hero OTP Code Block -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #030712; border: 1px solid #1e3a8a; border-radius: 12px; padding: 22px 28px; text-align: center; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 235, 0.15);">
                      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #60a5fa; margin-bottom: 8px;">
                        One-Time Verification Code
                      </div>
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; text-indent: 10px;">
                        ${otpCode}
                      </div>
                      <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        ⏱️ Valid for <strong style="color: #cbd5e1;">${expiryMinutes} minutes</strong>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information Callout -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; border-left: 3px solid #38bdf8; border-radius: 6px; margin: 24px 0 0; padding: 14px 18px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8;">
                      🔒 <strong style="color: #e2e8f0;">Security Notice:</strong> Never share this code with anyone. TrustMesh administrators and verifiers will never ask for your verification code or private keys. If you did not initiate this request, you can safely disregard this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 22px 32px 28px; background-color: #0d131f; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #cbd5e1; letter-spacing: 0.5px;">
                TrustMesh Decentralized Identity &amp; Verification Network
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #64748b;">
                Ethereum Smart Contracts • Cryptographic Proof Verification • Self-Sovereign Identity<br>
                Automated security notification dispatched by the TrustMesh Gateway. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
