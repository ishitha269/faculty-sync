const mongoose = require('mongoose');

// One 10-minute slot offered by a faculty member
const slotSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM
    status: { type: String, enum: ['open', 'booked'], default: 'open' },
  },
  { timestamps: true }
);

slotSchema.index({ faculty: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
