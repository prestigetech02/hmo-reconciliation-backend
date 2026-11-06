'use strict';

const mongoose = require('mongoose');

/**
 * Parsed and normalized employee records from confirmed imports.
 * These are the rows the reconciliation engine reads.
 *
 * IMMUTABILITY RULE:
 * Records are never updated after creation.
 * Re-uploads supersede old records by setting status to 'superseded'.
 * The engine always queries { status: 'active' } only.
 */
const employeeRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportBatch',
      required: true,
    },
    hmoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HMO',
      required: true,
    },
    billingPeriod: {
      type: String, // YYYY-MM
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    recordType: {
      type: String,
      enum: ['invoice_line', 'payroll', 'enrolment', 'payment'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'superseded'],
      default: 'active',
    },

    // ─── Employee Identity ───────────────────────────────────────────────────
    staffId: {
      type: String,
      required: true,
      trim: true,
    },
    hmoMemberId: {
      type: String,
      default: null,
      trim: true,
    },
    employeeName: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },

    // ─── Plan & Financial ────────────────────────────────────────────────────
    planCode: {
      type: String,
      trim: true,
      default: null,
    },
    invoicedAmount: {
      type: String, // Exact decimal string e.g. "15000.00"
      default: null,
    },
    deductionAmount: {
      type: String,
      default: null,
    },
    paymentAmount: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: 'NGN',
    },

    // ─── Audit ───────────────────────────────────────────────────────────────
    rawRow: {
      type: mongoose.Schema.Types.Mixed, // The original parsed row — preserved for traceability
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // updatedAt disabled — immutable
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
employeeRecordSchema.index({
  organizationId: 1,
  billingPeriod: 1,
  staffId: 1,
  recordType: 1,
  status: 1,
});
employeeRecordSchema.index({ importBatchId: 1 });
employeeRecordSchema.index({ organizationId: 1, hmoId: 1, billingPeriod: 1, status: 1 });

const EmployeeRecord = mongoose.model('EmployeeRecord', employeeRecordSchema);

module.exports = { EmployeeRecord };
