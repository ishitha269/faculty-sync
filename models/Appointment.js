const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    topic: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rescheduled', 'delegated', 'completed'],
      default: 'pending',
    },
    delegatedTo: { type: String, trim: true, default: '' }, // lab assistant name
    checkedIn: { type: Boolean, default: false }, // "I'm waiting outside" (Queue Radar)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
