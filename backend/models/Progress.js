/**
 * models/Progress.js
 * MongoDB Progress schema — replaces data/progress.json
 */
const mongoose = require('mongoose');

const progressEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  caloriesConsumed: { type: Number, required: true },
  calorieTarget: { type: Number, required: true, default: 2000 },
  weight: { type: Number, required: true },
  workoutDone: { type: Boolean, default: false }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  entries: [progressEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
