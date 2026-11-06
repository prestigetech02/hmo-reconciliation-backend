'use strict';

const mongoose = require('mongoose');

const RUN_STATUSES = ['queued', 'processing', 'completed', 'failed'];

const reconciliationRunSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    billingPeriod: {
      type: String, // YYYY-MM
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    dateRangeFrom: { type: Date, default: null },
    dateRangeTo: { type: Date, default: null },

    status: {
      type: String,
      enum: RUN_STATUSES,
      default: 'queued',
    },

    /**
     * Hardcoded engine version string.
     * When reconciliation logic changes, bump this version.
     * Old runs remain explainable under their original rules.
     */
    ruleVersion: {
      type: String,
      required: true,
      default: '1.0.0',
    },

    /**
     * Exact snapshot of which import batches were used.
     * Ensures the run is reproducible even if new batches are uploaded later.
     */
    inputSnapshot: {
      invoiceBatchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch' }],
      payrollBatchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch' }],
      enrolmentBatchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch' }],
      paymentBatchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch' }],
    },

    summary: {
      totalEmployees: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      exceptions: { type: Number, default: 0 },
      totalInvoiced: { type: String, default: '0.00' },
      totalDeducted: { type: String, default: '0.00' },
      totalPaid: { type: String, default: '0.00' },
      variance: { type: String, default: '0.00' },
      currency: { type: String, default: 'NGN' },
    },

    errorMessage: { type: String, default: null }, // Safe error if status = failed
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
reconciliationRunSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
reconciliationRunSchema.index({ organizationId: 1, billingPeriod: 1 });

const ReconciliationRun = mongoose.model('ReconciliationRun', reconciliationRunSchema);

module.exports = { ReconciliationRun, RUN_STATUSES };
