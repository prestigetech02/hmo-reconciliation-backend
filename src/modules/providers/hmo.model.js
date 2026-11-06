'use strict';

const mongoose = require('mongoose');

const planRateSchema = new mongoose.Schema(
  {
    planCode: { type: String, required: true, trim: true },
    planName: { type: String, required: true, trim: true },
    monthlyRate: { type: String, required: true }, // Exact decimal string e.g. "15000.00"
    currency: { type: String, required: true, default: 'NGN' },
    effectiveFrom: { type: String, required: true }, // YYYY-MM
    effectiveTo: { type: String, default: null },    // YYYY-MM or null = still active
  },
  { _id: false },
);

const hmoSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    planRates: {
      type: [planRateSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
hmoSchema.index({ organizationId: 1, isActive: 1 });
hmoSchema.index({ organizationId: 1, code: 1 }, { unique: true });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Returns the active plan rate for a given planCode and billing period (YYYY-MM).
 * The reconciliation engine uses this to determine the expected charge.
 */
hmoSchema.methods.getPlanRate = function (planCode, billingPeriod) {
  return this.planRates.find((rate) => {
    const codeMatch = rate.planCode === planCode;
    const periodMatch =
      rate.effectiveFrom <= billingPeriod &&
      (rate.effectiveTo === null || rate.effectiveTo >= billingPeriod);
    return codeMatch && periodMatch;
  }) ?? null;
};

const HMO = mongoose.model('HMO', hmoSchema);

module.exports = { HMO };
