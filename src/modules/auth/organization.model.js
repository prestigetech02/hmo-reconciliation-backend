'use strict';

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    settings: {
      currency: { type: String, default: 'NGN' },
      maxFileSizeMb: { type: Number, default: 20 },
      features: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  },
);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = { Organization };
