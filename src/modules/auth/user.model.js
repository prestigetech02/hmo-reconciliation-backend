'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'finance_officer', 'hr'];

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Hashed reset token — store hash, never the raw token
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      select: false, // Store hash of refresh token for validation
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 * Never compare passwords manually outside this method.
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Hash a plain password before storing.
 * Call this from the service layer, never hash in controllers.
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

// ─── Pre-save guard ───────────────────────────────────────────────────────────
// Belt-and-suspenders: ensure passwordHash is never a plain string that
// looks like a password (too short or not a bcrypt hash).
userSchema.pre('save', function (next) {
  if (this.isModified('passwordHash') && this.passwordHash.length < 30) {
    return next(new Error('Attempted to save an unhashed password. Use User.hashPassword() first.'));
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
