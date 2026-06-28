'use strict';

const authService    = require('./auth.service');
const asyncHandler   = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');
const { decodeToken } = require('../../shared/utils/jwt');
const env             = require('../../config/env');

// ── Cookie config ─────────────────────────────────────────────────────────────
const COOKIE_NAME = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.isProduction(),
  sameSite: env.isProduction() ? 'strict' : 'lax',
  path:     '/',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
}

function getMeta(req) {
  return {
    ip:        req.ip || req.socket?.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, expiresIn } = await authService.register(req.body, getMeta(req));
  setRefreshCookie(res, refreshToken);
  created(res, { user, accessToken, expiresIn });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, expiresIn } = await authService.login(req.body, getMeta(req));
  setRefreshCookie(res, refreshToken);
  success(res, { user, accessToken, expiresIn });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    clearRefreshCookie(res);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No refresh token — please log in' },
    });
  }

  const { user, accessToken, refreshToken, expiresIn } = await authService.refresh(token, getMeta(req));
  setRefreshCookie(res, refreshToken);
  success(res, { user, accessToken, expiresIn });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (token) {
    // Extract the jti (document ID) from the JWT so we can delete the specific session
    const payload = decodeToken(token);
    if (payload?.jti) {
      await authService.logout(payload.jti);
    }
  }

  clearRefreshCookie(res);
  success(res, { message: 'Logged out successfully' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  success(res, { message: 'All sessions revoked — you have been logged out on all devices' });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  success(res, { user });
});

const forgotPassword = asyncHandler(async (req, res) => {
  // Service silently does nothing if email not found — prevents enumeration
  await authService.forgotPassword(req.body);
  success(res, { message: 'If an account with that email exists, a reset link has been sent' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body, getMeta(req));
  success(res, { message: 'Password reset successfully. Please log in with your new password.' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body);
  success(res, { user, message: 'Email verified successfully' });
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user.id);
  success(res, { message: 'Verification email sent' });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
