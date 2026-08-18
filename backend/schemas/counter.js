const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
  },
  seq: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

counterSchema.index({ _id: 1 }, { unique: true });

module.exports = counterSchema;
