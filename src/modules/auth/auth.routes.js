'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('./auth.service');
const { authenticate, authorize } = require('../../shared/middleware/authenticate');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  inviteUserSchema,
  validate,
} = require('./auth.validation');
const config = require('../../shared/config');

const router = express.Router();

// ─── Stricter rate limiter for auth endpoints ──────────────────────────────
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again later.',
      details: [],
    },
  },
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/v1/auth/forgot-password ───────────────────────────────────────
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    // Always return 200 — never reveal if email exists
    res.status(200).json({
      success: true,
      data: {
        message: 'If that email is registered, a reset link has been sent.',
        ...(result.mocked && { _dev_resetToken: result.resetToken }), // Remove in production
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/v1/auth/reset-password ────────────────────────────────────────
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    res.status(200).json({ success: true, data: { message: 'Password reset successfully.' } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// User Management Routes (Admin only)
// Mounted at /api/v1/users in app.js
// ─────────────────────────────────────────────────────────────────────────────
const userRouter = express.Router();

// ─── GET /api/v1/users ───────────────────────────────────────────────────────
userRouter.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await authService.listUsers({
      organizationId: req.user.organizationId,
      page,
      limit,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/v1/users ──────────────────────────────────────────────────────
userRouter.post('/', authenticate, authorize('admin'), validate(inviteUserSchema), async (req, res, next) => {
  try {
    const result = await authService.inviteUser({
      organizationId: req.user.organizationId,
      invitedBy: req.user.id,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = { authRouter: router, userRouter };
