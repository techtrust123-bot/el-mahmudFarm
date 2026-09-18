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



module.exports = counterSchema;
