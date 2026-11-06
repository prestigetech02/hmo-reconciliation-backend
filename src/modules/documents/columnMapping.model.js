'use strict';

const mongoose = require('mongoose');

/**
 * Saved column mappings per HMO + file type.
 * When a confirmed mapping exists, the import flow skips the LLM call
 * and returns the saved mapping directly — saving API cost and latency.
 */
const columnMappingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    hmoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HMO',
      required: true,
    },
    fileType: {
      type: String,
      enum: ['hmo_invoice', 'payroll', 'enrolment', 'payment'],
      required: true,
    },
    // The confirmed mapping: { "Employee Code": "staff_id", ... }
    mapping: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usageCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

// One saved mapping per org + HMO + fileType
columnMappingSchema.index(
  { organizationId: 1, hmoId: 1, fileType: 1 },
  { unique: true },
);

const ColumnMapping = mongoose.model('ColumnMapping', columnMappingSchema);

module.exports = { ColumnMapping };
