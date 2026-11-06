'use strict';

/**
 * Global error handler middleware.
 * Must be registered LAST in Express — after all routes.
 *
 * All thrown or next(err) errors land here and are
 * formatted into the standard API error envelope.
 */
function errorHandler(err, req, res, _next) {
  // Operational errors we threw intentionally
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
        requestId: req.id,
      },
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        details,
        requestId: req.id,
      },
    });
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A resource with this ${field} already exists.`,
        details: [],
        requestId: req.id,
      },
    });
  }

  // JWT errors — treat as authentication failures
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token.',
        details: [],
        requestId: req.id,
      },
    });
  }

  // Unknown / programming errors — never expose internals
  console.error('[ERROR]', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
      requestId: req.id,
    },
  });
}

module.exports = errorHandler;
