'use strict';

/**
 * Operational error class for known, expected failure conditions.
 * The global error handler checks isOperational to distinguish
 * these from programming errors and formats them correctly.
 *
 * @param {string}  message    Human-readable error message
 * @param {number}  statusCode HTTP status code
 * @param {string}  code       Machine-readable error code (e.g. 'NOT_FOUND')
 * @param {Array}   details    Optional field-level validation details
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
