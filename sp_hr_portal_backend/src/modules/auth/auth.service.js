const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../../lib/prisma");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../lib/jwt");
const jwt = require("jsonwebtoken");
const { sendEmail, emailTemplates } = require("../../lib/notifications");



const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_SECONDS = 5 * 60; // 5 minutes

async function loginUser(email, password) {
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) {
    throw { status: 401, message: "Invalid credentials" };
  }
  if (employee.status !== "ACTIVE") {
    throw { status: 403, message: "Account is inactive" };
  }
  const isMatch = await bcrypt.compare(password, employee.passwordHash);
  if (!isMatch) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const accessToken = signAccessToken({
    sub: employee.id,
    role: employee.role,
  });
  const refreshToken = signRefreshToken({ sub: employee.id });

  const decodedRefresh = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      employeeId: employee.id,
      expiresAt: new Date(decodedRefresh.exp * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: employee.id,
      role: employee.role,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`.trim(),
      requiresOnboarding: employee.requiresOnboarding,
    },
  };
}

async function refreshUserToken(token) {
  const existingToken = await prisma.refreshToken.findUnique({
    where: { token },
  });
  if (!existingToken) {
    throw { status: 401, message: "Invalid refresh token" };
  }

  try {
    const decoded = verifyRefreshToken(token);
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.sub },
    });

    if (!employee || employee.status !== "ACTIVE") {
      throw new Error();
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: existingToken.id } });

    const newAccessToken = signAccessToken({
      sub: employee.id,
      role: employee.role,
    });
    const newRefreshToken = signRefreshToken({ sub: employee.id });
    const newDecodedRefresh = verifyRefreshToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        employeeId: employee.id,
        expiresAt: new Date(newDecodedRefresh.exp * 1000),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    await prisma.refreshToken
      .delete({ where: { id: existingToken.id } })
      .catch(() => {});
    throw { status: 401, message: "Invalid or expired refresh token" };
  }
}

async function logoutUser(token) {
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
}

/**
 * Step 1 — Request OTP.
 * Generates a 6-digit OTP, stores its bcrypt hash, and emails it to the user.
 * Always returns the same message to avoid leaking account existence.
 */
async function triggerPasswordReset(email) {
  const SAFE_MSG = { message: "If an account with that email exists, an OTP has been sent." };

  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) return SAFE_MSG;

  // Invalidate any previous unused OTPs for this employee
  await prisma.passwordResetOtp.updateMany({
    where: { employeeId: employee.id, used: false },
    data: { used: true },
  });

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetOtp.create({
    data: { employeeId: employee.id, otpHash, expiresAt },
  });

  // Send OTP email — fire and forget
  const { text, html } = emailTemplates.otpEmail({
    firstName: employee.firstName,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  });
  sendEmail({
    to: email,
    subject: "Your HR Portal Password Reset OTP",
    body: text,
    html,
  }).catch((err) => console.error("[email] OTP email failed:", err.message));

  return SAFE_MSG;
}

/**
 * Step 2 — Verify OTP.
 * Validates the 6-digit OTP. On success, marks it used and returns a
 * short-lived JWT `resetToken` that authorises the password-reset call.
 */
async function verifyOtp(email, otp) {
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) {
    throw { status: 400, message: "Invalid or expired OTP" };
  }

  // Find the most recent unused, non-expired OTP
  const record = await prisma.passwordResetOtp.findFirst({
    where: {
      employeeId: employee.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw { status: 400, message: "Invalid or expired OTP" };
  }

  const isMatch = await bcrypt.compare(otp, record.otpHash);
  if (!isMatch) {
    throw { status: 400, message: "Invalid or expired OTP" };
  }

  // Mark OTP as used
  await prisma.passwordResetOtp.update({
    where: { id: record.id },
    data: { used: true },
  });

  // Issue a short-lived reset token
  const resetToken = jwt.sign(
    { sub: employee.id, purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY_SECONDS }
  );

  return { resetToken };
}

/**
 * Step 3 — Reset password using the resetToken from step 2.
 */
async function resetPasswordWithToken(resetToken, newPassword) {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw { status: 400, message: "Reset link is invalid or has expired" };
  }

  if (decoded.purpose !== "password-reset") {
    throw { status: 400, message: "Invalid reset token" };
  }

  const employee = await prisma.employee.findUnique({ where: { id: decoded.sub } });
  if (!employee) {
    throw { status: 404, message: "User not found" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.employee.update({
    where: { id: decoded.sub },
    data: { passwordHash },
  });

  return { message: "Password reset successfully. You can now log in." };
}

async function changePassword(userId, oldPassword, newPassword) {
  const employee = await prisma.employee.findUnique({ where: { id: userId } });
  if (!employee) {
    throw { status: 404, message: "User not found" };
  }

  const isMatch = await bcrypt.compare(oldPassword, employee.passwordHash);
  if (!isMatch) {
    throw { status: 401, message: "Incorrect current password" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.employee.update({
    where: { id: userId },
    data: {
      passwordHash,
      requiresOnboarding: false,
    },
  });

  return { message: "Password updated successfully" };
}

module.exports = {
  loginUser,
  refreshUserToken,
  logoutUser,
  triggerPasswordReset,
  verifyOtp,
  resetPasswordWithToken,
  changePassword,
};
