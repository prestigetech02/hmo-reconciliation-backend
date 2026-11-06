'use strict';

const mongoose = require('mongoose');

/**
 * Append-only audit log.
 * Every significant system action writes a record here.
 * No update or delete operations should ever be performed on this collection.
 */
const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /**
     * Action constants — use AUDIT_ACTIONS enum when writing logs.
     * Examples: 'USER_LOGIN', 'IMPORT_CONFIRMED', 'EXCEPTION_RESOLVED'
     */
    action: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String, // e.g. 'ImportBatch', 'Exception', 'User'
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // IP address, before/after state, etc.
      default: {},
    },
  },
  {
    // Only createdAt — audit logs are immutable
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, action: 1 });
auditLogSchema.index({ organizationId: 1, performedBy: 1 });

// ─── Action Constants ─────────────────────────────────────────────────────────
const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  // Users
  USER_INVITED: 'USER_INVITED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  // HMO
  HMO_CREATED: 'HMO_CREATED',
  HMO_UPDATED: 'HMO_UPDATED',
  // Imports
  IMPORT_UPLOADED: 'IMPORT_UPLOADED',
  IMPORT_AI_MAPPED: 'IMPORT_AI_MAPPED',
  IMPORT_CONFIRMED: 'IMPORT_CONFIRMED',
  // Reconciliation
  RECONCILIATION_STARTED: 'RECONCILIATION_STARTED',
  RECONCILIATION_COMPLETED: 'RECONCILIATION_COMPLETED',
  // Exceptions
  EXCEPTION_STATUS_UPDATED: 'EXCEPTION_STATUS_UPDATED',
  EXCEPTION_RESOLVED: 'EXCEPTION_RESOLVED',
  // Reports
  REPORT_DOWNLOADED: 'REPORT_DOWNLOADED',
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog, AUDIT_ACTIONS };
