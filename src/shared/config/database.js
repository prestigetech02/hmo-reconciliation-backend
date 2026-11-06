'use strict';

const mongoose = require('mongoose');
const config = require('../config');

/**
 * Establishes a connection to MongoDB Atlas.
 * Mongoose manages the connection pool internally.
 * Call this once at application startup.
 */
async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[DB] MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });

  await mongoose.connect(config.db.uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

/**
 * Returns the current Mongoose connection state as a human-readable string.
 * Used by the health check endpoint.
 */
function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
}

module.exports = { connectDatabase, getDatabaseStatus };
