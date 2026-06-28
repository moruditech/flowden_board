'use strict';

const { Router } = require('express');

const authenticate   = require('../../shared/middleware/authenticate');
const validate       = require('../../shared/middleware/validate');
const { authLimiter } = require('../../shared/middleware/rateLimiter');
const schemas        = require('./auth.validation');
const ctrl           = require('./auth.controller');

const router = Router();

// ── Public routes (no auth required) ─────────────────────────────────────────

// Rate-limited auth actions — 10 req / 15 min per IP
router.post('/register',    authLimiter, validate(schemas.register),        ctrl.register);
router.post('/login',       authLimiter, validate(schemas.login),            ctrl.login);
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), ctrl.forgotPassword);

// Token management — no rate limit (already guarded by httpOnly cookie)
router.post('/refresh',       ctrl.refresh);
router.post('/logout',        ctrl.logout);
router.post('/verify-email',  validate(schemas.verifyEmail),  ctrl.verifyEmail);
router.post('/reset-password',validate(schemas.resetPassword),ctrl.resetPassword);

// ── Protected routes (valid JWT required) ─────────────────────────────────────

router.post('/logout-all',            authenticate, ctrl.logoutAll);
router.get('/me',                     authenticate, ctrl.getMe);
router.post('/resend-verification',   authenticate, ctrl.resendVerification);

module.exports = router;
