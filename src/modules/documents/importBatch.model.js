'use strict';

const mongoose = require('mongoose');

const IMPORT_STATUSES = [
  'uploaded',
  'columns_detected',
  'mapping_suggested',
  'mapping_confirmed',
  'processing',
  'completed',
  'failed',
];

const FILE_TYPES = ['hmo_invoice', 'payroll', 'enrolment', 'payment'];

const parseErrorSchema = new mongoose.Schema(
  {
    row: { type: Number },
    field: { type: String },
    message: { type: String },
  },
  { _id: false },
);

const importBatchSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hmoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HMO',
      required: true,
    },
    fileType: {
      type: String,
      enum: FILE_TYPES,
      required: true,
    },
    billingPeriod: {
      type: String, // YYYY-MM
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    status: {
      type: String,
      enum: IMPORT_STATUSES,
      default: 'uploaded',
    },

    // ─── File Metadata ──────────────────────────────────────────────────────
    originalFileName: { type: String, required: true },
    storageKey: { type: String, required: true },       // Server-generated private path
    fileSizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    checksum: { type: String, required: true },         // SHA-256 — deduplication key

    // ─── Column Detection (after upload) ───────────────────────────────────
    detectedColumns: { type: [String], default: [] },
    sampleRows: { type: [mongoose.Schema.Types.Mixed], default: [] }, // First 3 rows

    // ─── AI Mapping ─────────────────────────────────────────────────────────
    suggestedMapping: { type: mongoose.Schema.Types.Mixed, default: null },
    mappingConfidence: { type: Number, default: null }, // 0-1
    mappingSource: {
      type: String,
      enum: ['llm', 'saved', null],
      default: null,
    },

    // ─── Confirmed Mapping (HR-approved) ────────────────────────────────────
    confirmedMapping: { type: mongoose.Schema.Types.Mixed, default: null },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: { type: Date, default: null },

    // ─── Processing Results ──────────────────────────────────────────────────
    rowCount: { type: Number, default: 0 },
    validRowCount: { type: Number, default: 0 },
    invalidRowCount: { type: Number, default: 0 },
    parseErrors: { type: [parseErrorSchema], default: [] },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null }, // Safe error message if status = failed
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
importBatchSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
importBatchSchema.index({ organizationId: 1, billingPeriod: 1, fileType: 1 });
importBatchSchema.index(
  { checksum: 1, organizationId: 1 },
  { unique: true }, // Prevent duplicate file uploads
);

const ImportBatch = mongoose.model('ImportBatch', importBatchSchema);

module.exports = { ImportBatch, IMPORT_STATUSES, FILE_TYPES };
