'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('./user.model');
const { Organization } = require('./organization.model');
const { AuditLog, AUDIT_ACTIONS } = require('../dashboard/auditLog.model');
const AppError = require('../../shared/utils/AppError');
const config = require('../../shared/config');

// ─── Token Helpers ────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email and password.
 * Returns access + refresh tokens on success.
 * Always returns a generic error — never discloses whether an email exists.
 */
async function login({ email, password, ipAddress }) {
  // Fetch user including passwordHash (select: false on schema)
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+passwordHash')
    .lean(false);

  const GENERIC_ERROR = new AppError(
    'Invalid email or password.',
    401,
    'UNAUTHORIZED',
  );

  if (!user || !user.isActive) throw GENERIC_ERROR;

  const passwordValid = await user.comparePassword(password);
  if (!passwordValid) throw GENERIC_ERROR;

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store hashed refresh token on user document
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  // Audit log
  await AuditLog.create({
    organizationId: user.organizationId,
    performedBy: user._id,
    action: AUDIT_ACTIONS.USER_LOGIN,
    resourceType: 'User',
    resourceId: user._id,
    metadata: { ip: ipAddress },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}

/**
 * Issue a new access token using a valid refresh token.
 */
async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, 'UNAUTHORIZED');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive) {
    throw new AppError('Invalid or expired refresh token.', 401, 'UNAUTHORIZED');
  }

  const tokenHash = hashToken(refreshToken);
  if (user.refreshTokenHash !== tokenHash) {
    // Token reuse detected — invalidate all sessions
    user.refreshTokenHash = null;
    await user.save();
    throw new AppError('Invalid or expired refresh token.', 401, 'UNAUTHORIZED');
  }

  return { accessToken: signAccessToken(user) };
}

/**
 * Invalidate the current refresh session.
 */
async function logout({ userId, organizationId, ipAddress }) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });

  await AuditLog.create({
    organizationId,
    performedBy: userId,
    action: AUDIT_ACTIONS.USER_LOGOUT,
    resourceType: 'User',
    resourceId: userId,
    metadata: { ip: ipAddress },
  });
}

/**
 * Generate and store a password reset token.
 * In production, send this via email. Currently returns the token for mocking.
 */
async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success — never disclose whether email exists
  if (!user || !user.isActive) return { mocked: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  await AuditLog.create({
    organizationId: user.organizationId,
    performedBy: user._id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    resourceType: 'User',
    resourceId: user._id,
    metadata: { email },
  });

  // TODO: Send rawToken via email provider
  // For now, return it so frontend can mock the reset flow
  return { mocked: true, resetToken: rawToken };
}

/**
 * Reset a user's password using a valid reset token.
 */
async function resetPassword({ token, newPassword }) {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiresAt');

  if (!user) {
    throw new AppError('Reset token is invalid or has expired.', 400, 'VALIDATION_ERROR');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = null; // Invalidate all sessions
  await user.save();

  await AuditLog.create({
    organizationId: user.organizationId,
    performedBy: user._id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    resourceType: 'User',
    resourceId: user._id,
    metadata: {},
  });
}

/**
 * Return the current authenticated user's profile.
 */
async function getMe(userId) {
  const user = await User.findById(userId)
    .populate('organizationId', 'name settings')
    .lean();

  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    organization: user.organizationId,
  };
}

/**
 * Admin: List all users in the organization.
 */
async function listUsers({ organizationId, page, limit }) {
  const skip = (page - 1) * limit;

  const [users, totalItems] = await Promise.all([
    User.find({ organizationId })
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ organizationId }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

/**
 * Admin: Invite a new user by creating an account with a temporary password.
 * In production the temp password is emailed. Currently returned for mocking.
 */
async function inviteUser({ organizationId, invitedBy, name, email, role }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('A user with this email already exists.', 409, 'CONFLICT');
  }

  // Ensure the organization exists
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404, 'NOT_FOUND');

  const tempPassword = crypto.randomBytes(8).toString('hex'); // 16-char hex
  const passwordHash = await User.hashPassword(tempPassword);

  const user = await User.create({
    organizationId,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    invitedBy,
  });

  await AuditLog.create({
    organizationId,
    performedBy: invitedBy,
    action: AUDIT_ACTIONS.USER_INVITED,
    resourceType: 'User',
    resourceId: user._id,
    metadata: { email, role },
  });

  // TODO: Email tempPassword to the new user
  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    tempPassword, // Remove once email sending is wired up
  };
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  listUsers,
  inviteUser,
};
