'use strict';

const User         = require('../../shared/models/User.model');
const RefreshToken = require('../../shared/models/RefreshToken.model');
const { hashPassword, comparePassword } = require('../../shared/utils/bcrypt');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getAccessTtlMs } = require('../../shared/utils/jwt');
const { generateToken, hashToken } = require('../../shared/utils/crypto');
const AppError   = require('../../shared/utils/AppError');
const eventBus   = require('../../shared/events/eventBus');
const env        = require('../../config/env');

// ── Helpers ───────────────────────────────────────────────────────────────────

function refreshExpiresAt() {
  const str  = env.JWT_REFRESH_EXPIRES;
  const unit = str.slice(-1);
  const val  = parseInt(str, 10);
  const map  = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + val * (map[unit] || 86_400_000));
}

function verificationExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}

function resetExpiresAt() {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
}

async function issueTokenPair(user, { userAgent = '', ip = '' } = {}) {
  const rawRefreshToken = generateToken(48);
  const tokenDoc = await RefreshToken.create({
    user:      user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshExpiresAt(),
    userAgent,
    ip,
  });

  const accessToken  = signAccessToken({ sub: user._id.toString(), email: user.email });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti: tokenDoc._id.toString() });

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(getAccessTtlMs() / 1000),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

const authService = {

  async register({ name, email, password }, meta = {}) {
    const existing = await User.findOne({ email });
    if (existing) throw AppError.conflict('An account with that email already exists');

    const passwordHash = await hashPassword(password);

    const rawVerificationToken       = generateToken(32);
    const emailVerificationToken     = hashToken(rawVerificationToken);
    const emailVerificationExpires   = verificationExpiresAt();

    const user = await User.create({
      name,
      email,
      passwordHash,
      emailVerificationToken,
      emailVerificationExpires,
    });

    const tokens = await issueTokenPair(user, meta);

    const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${rawVerificationToken}`;

    eventBus.emit('auth.registered', {
      user:      user.toJSON(),
      verifyUrl,
    });

    return { user: user.toJSON(), ...tokens };
  },

  async login({ email, password }, meta = {}) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw AppError.unauthorized('Invalid email or password');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    if (!user.isActive) throw AppError.forbidden('This account has been deactivated. Contact support.');

    // Detect new device — compare against the most recent refresh token
    const lastToken = await RefreshToken.findOne({ user: user._id }).sort({ createdAt: -1 });
    const isNewDevice = !lastToken || lastToken.ip !== meta.ip || lastToken.userAgent !== meta.userAgent;

    const tokens = await issueTokenPair(user, meta);

    eventBus.emit('auth.login', {
      user:        user.toJSON(),
      ip:          meta.ip || '',
      userAgent:   meta.userAgent || '',
      isNewDevice,
    });

    return { user: user.toJSON(), ...tokens };
  },

  async refresh(jwtRefreshToken, meta = {}) {
    let payload;
    try {
      payload = verifyRefreshToken(jwtRefreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token — please log in again');
    }

    const tokenDoc = await RefreshToken.findById(payload.jti);
    if (!tokenDoc) {
      throw AppError.unauthorized('Session not found — your session may have been revoked');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw AppError.unauthorized('User not found');

    // Rotate — delete old token, issue new pair
    await tokenDoc.deleteOne();
    const tokens = await issueTokenPair(user, {
      userAgent: tokenDoc.userAgent,
      ip:        tokenDoc.ip,
    });

    return { user: user.toJSON(), ...tokens };
  },

  async logout(jti) {
    if (jti) await RefreshToken.findByIdAndDelete(jti);
  },

  async logoutAll(userId) {
    await RefreshToken.deleteMany({ user: userId });
  },

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User');
    return user.toJSON();
  },

  async forgotPassword({ email }) {
    // Always return 200 — never reveal whether an email exists
    const user = await User.findOne({ email });
    if (!user) return;

    const rawToken            = generateToken(32);
    user.passwordResetToken   = hashToken(rawToken);
    user.passwordResetExpires = resetExpiresAt();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${rawToken}`;

    eventBus.emit('auth.forgotPassword', {
      user:     user.toJSON(),
      resetUrl,
    });
  },

  async resetPassword({ token, newPassword }, meta = {}) {
    const hashed = hashToken(token);

    const user = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw AppError.badRequest('Reset token is invalid or has expired');

    user.passwordHash         = await hashPassword(newPassword);
    user.passwordResetToken   = null;
    user.passwordResetExpires = null;
    await user.save({ validateBeforeSave: false });

    // Revoke all sessions — user must log in again on all devices
    await RefreshToken.deleteMany({ user: user._id });

    eventBus.emit('auth.passwordReset', {
      user: user.toJSON(),
      ip:   meta.ip || '',
    });
  },

  async verifyEmail({ token }) {
    const hashed = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken:   hashed,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) throw AppError.badRequest('Verification token is invalid or has expired');

    user.emailVerified            = true;
    user.emailVerificationToken   = null;
    user.emailVerificationExpires = null;
    await user.save({ validateBeforeSave: false });

    eventBus.emit('auth.emailVerified', { user: user.toJSON() });

    return user.toJSON();
  },

  async resendVerification(userId) {
    const user = await User.findById(userId).select('+emailVerificationToken');
    if (!user) throw AppError.notFound('User');
    if (user.emailVerified) throw AppError.badRequest('Email is already verified');

    const rawToken                    = generateToken(32);
    user.emailVerificationToken       = hashToken(rawToken);
    user.emailVerificationExpires     = verificationExpiresAt();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${rawToken}`;

    eventBus.emit('auth.registered', {
      user:      user.toJSON(),
      verifyUrl,
      resend:    true,
    });
  },
};

module.exports = authService;
