const nodemailer = require("nodemailer");

// Lazily created transporter so it picks up env vars loaded from Key Vault
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.solutionspoint.net",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: (process.env.SMTP_PORT || "465") === "465",
      auth: {
        user: process.env.SMTP_USER || "noreply@solutionspoint.net",
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

/**
 * Send an email via BigRock SMTP.
 * Falls back to a console log when SMTP_PASS is not configured (local dev).
 * @param {{ to: string, subject: string, body?: string, html?: string }} options
 */
async function sendEmail({ to, subject, body, html }) {
  if (!process.env.SMTP_PASS) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    if (body) console.log(body);
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"SP HR Portal" <${process.env.SMTP_USER || "noreply@solutionspoint.net"}>`,
    to,
    subject,
    text: body,
    html: html || undefined,
  });
}

const emailTemplates = {
  leaveDecision: (name, status, dates) =>
    `Hi ${name},\n\nYour leave request for ${dates} has been ${status.toLowerCase()}.\n\nHR Portal`,

  payslipPublished: (name, month, year) =>
    `Hi ${name},\n\nYour payslip for ${month}/${year} is ready in the HR portal.\n\nHR Portal`,

  onboardingTaskAssigned: (name, taskName, dueDate) =>
    `Hi ${name},\n\nYou have a new onboarding task: "${taskName}". Due: ${dueDate}.\n\nHR Portal`,

  /**
   * Welcome email sent to a newly created employee.
   * Returns { text, html } for the sendEmail call.
   */
  welcomeEmployee: ({ firstName, lastName, email, employeeCode, tempPassword }) => {
    const portalUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const loginUrl = `${portalUrl}/login`;
    const docsUrl = `${portalUrl}/documents`;
    const fullName = `${firstName} ${lastName}`;

    const text = [
      `Welcome to the team, ${fullName}!`,
      ``,
      `Your HR Portal account has been created. Here are your login details:`,
      ``,
      `  Email:          ${email}`,
      `  Employee Code:  ${employeeCode}`,
      `  Password:       ${tempPassword}`,
      ``,
      `Login here: ${loginUrl}`,
      ``,
      `IMPORTANT: Please change your password after your first login.`,
      ``,
      `Next steps after logging in:`,
      `  1. Change your temporary password`,
      `  2. Upload your required documents (Aadhaar, PAN, Educational Certificates, etc.)`,
      `     at: ${docsUrl}`,
      ``,
      `If you have any issues logging in, please contact your HR team.`,
      ``,
      `Regards,`,
      `SP HR Portal`,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a56db,#0e3fad);padding:36px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:0.5px;">Welcome to SP HR Portal 👋</h1>
            <p style="color:#c7d9ff;margin:8px 0 0;font-size:14px;">Your account is ready</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:16px;color:#1a1a2e;margin:0 0 20px;">Hi <strong>${fullName}</strong>,</p>
            <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 28px;">
              Your HR Portal account has been created. Please use the credentials below to log in for the first time.
            </p>

            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5ff;border:1px solid #dce8ff;border-radius:8px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;width:100%;">
                    <tr>
                      <td style="padding:6px 0;color:#888;width:150px;">Email</td>
                      <td style="padding:6px 0;font-weight:bold;color:#1a1a2e;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#888;">Employee Code</td>
                      <td style="padding:6px 0;font-weight:bold;color:#1a1a2e;">${employeeCode}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#888;">Password</td>
                      <td style="padding:6px 0;">
                        <span style="font-family:monospace;font-size:15px;background:#fff;border:1px solid #c5d6ff;border-radius:4px;padding:3px 10px;color:#1a56db;font-weight:bold;">${tempPassword}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 18px;font-size:13px;color:#7c5a00;">
                  ⚠️ &nbsp;<strong>Please change your password</strong> immediately after your first login for security.
                </td>
              </tr>
            </table>

            <!-- Login Button -->
            <p style="text-align:center;margin:0 0 28px;">
              <a href="${loginUrl}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 40px;border-radius:8px;">
                Login to HR Portal →
              </a>
            </p>

            <!-- Steps -->
            <p style="font-size:14px;color:#333;font-weight:bold;margin:0 0 12px;">📋 Next Steps After Login:</p>
            <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#444;line-height:1.7;">
              <tr>
                <td style="vertical-align:top;padding-right:10px;">1.</td>
                <td>Change your temporary password</td>
              </tr>
              <tr>
                <td style="vertical-align:top;padding-right:10px;">2.</td>
                <td>
                  Upload your required documents (Aadhaar, PAN, Educational Certificates, etc.) via
                  <a href="${docsUrl}" style="color:#1a56db;">My Documents</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="font-size:12px;color:#999;margin:0;">
              This is an automated message from SP HR Portal. Please do not reply to this email.<br/>
              If you have any issues, contact your HR team.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { text, html };
  },
  /**
   * OTP email for forgot-password flow (expires in expiryMinutes, default 10).
   */
  otpEmail: ({ firstName, otp, expiryMinutes = 10 }) => {
    const text = [
      `Hi ${firstName},`,
      ``,
      `You requested a password reset for your HR Portal account.`,
      `Your One-Time Password (OTP) is:`,
      ``,
      `  ${otp}`,
      ``,
      `This OTP is valid for ${expiryMinutes} minutes. Do not share it with anyone.`,
      ``,
      `If you did not request this, please ignore this email.`,
      ``,
      `Regards,`,
      `SP HR Portal`,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a56db,#0e3fad);padding:30px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Password Reset Request 🔑</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <p style="font-size:15px;color:#333;margin:0 0 24px;text-align:left;">Hi <strong>${firstName}</strong>,</p>
            <p style="font-size:14px;color:#555;margin:0 0 28px;text-align:left;line-height:1.6;">
              Use the OTP below to reset your HR Portal password. It expires in <strong>${expiryMinutes} minutes</strong>.
            </p>
            <div style="background:#f0f5ff;border:1px solid #dce8ff;border-radius:10px;padding:24px;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">Your OTP</p>
              <p style="margin:0;font-size:42px;font-weight:bold;letter-spacing:12px;color:#1a56db;font-family:monospace;">${otp}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#7c5a00;text-align:left;">
                  ⚠️ &nbsp;Do not share this OTP with anyone. It expires in <strong>${expiryMinutes} minutes</strong>.
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#aaa;margin:0;text-align:left;">If you did not request a password reset, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="font-size:12px;color:#bbb;margin:0;">SP HR Portal — Automated message, do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { text, html };
  },
};

module.exports = { sendEmail, emailTemplates };
