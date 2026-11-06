'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Attaches a unique requestId to every incoming request.
 * The ID is returned in all responses and error envelopes
 * so that logs can be correlated to a specific request.
 */
function requestId(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
