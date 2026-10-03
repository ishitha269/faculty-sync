const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plain text
    role: { type: String, enum: ['student', 'faculty'], default: 'student' },
    department: { type: String, trim: true, default: '' },
    // live status badge shown to students (only used by faculty)
    status: { type: String, enum: ['In Cabin', 'In Class', 'In Meeting', 'On Leave'], default: 'In Cabin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
