'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Verifies the Bearer access token on protected routes.
 * On success, attaches req.user = { id, organizationId, role }.
 * On failure, throws a 401 — never a 403 (that would reveal the resource exists).
 */
async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    const payload = jwt.verify(token, config.jwt.accessSecret);

    // Attach only what downstream middleware and handlers need.
    // Never attach the full DB document to req.
    req.user = {
      id: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control middleware factory.
 * Usage: authorize('admin', 'finance_officer')
 * Throws 403 if the authenticated user's role is not in the allowed list.
 */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          403,
          'FORBIDDEN',
        ),
      );
    }
    next();
  };
}

module.exports = { authenticate, authorize };
