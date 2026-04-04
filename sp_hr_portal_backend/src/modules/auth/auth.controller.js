const authService = require("./auth.service");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token required" });
    const result = await authService.refreshUserToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.triggerPasswordReset(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await authService.resetPasswordWithToken(resetToken, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both old and new passwords are required" });
    }
    const result = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, forgotPassword, verifyOtp, resetPassword, changePassword };
