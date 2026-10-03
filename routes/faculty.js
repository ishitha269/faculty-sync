const express = require('express');
const User = require('../models/User');
const Slot = require('../models/Slot');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const STATUSES = ['In Cabin', 'In Class', 'In Meeting', 'On Leave'];

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toStr(n) {
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
}

// READ: all faculty with live status, open slots and Queue Radar count
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const faculty = await User.find({ role: 'faculty' })
      .select('name department status')
      .sort({ name: 1 })
      .lean();
    const ids = faculty.map((f) => f._id);

    const slots = await Slot.find({ faculty: { $in: ids }, status: 'open', date: { $gte: today } })
      .sort({ date: 1, time: 1 })
      .lean();

    // Queue Radar = students who tapped "I'm outside the cabin"
    const waiting = await Appointment.find({
      faculty: { $in: ids },
      checkedIn: true,
      status: { $in: ['pending', 'approved', 'rescheduled'] },
    })
      .select('faculty')
      .lean();

    faculty.forEach((f) => {
      f.slots = slots.filter((s) => String(s.faculty) === String(f._id));
      f.queue = waiting.filter((w) => String(w.faculty) === String(f._id)).length;
    });
    res.json(faculty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE: faculty changes their live status badge
router.put('/status', auth.requireRole('faculty'), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    await User.findByIdAndUpdate(req.userId, { status });
    res.json({ message: 'Status set to ' + status });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// READ: my slots (faculty)
router.get('/slots', auth.requireRole('faculty'), async (req, res) => {
  try {
    const slots = await Slot.find({ faculty: req.userId }).sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE: add 10-minute slots between two times on a date
router.post('/slots', auth.requireRole('faculty'), async (req, res) => {
  try {
    const { date, from, to } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(from || '') || !/^\d{2}:\d{2}$/.test(to || ''))
      return res.status(400).json({ message: 'Pick a date, a start time and an end time' });
    if (toMin(to) - toMin(from) < 10)
      return res.status(400).json({ message: 'End time must be at least 10 minutes after start' });
    if (toMin(to) - toMin(from) > 600)
      return res.status(400).json({ message: 'Maximum window is 10 hours' });

    let created = 0;
    for (let m = toMin(from); m + 10 <= toMin(to); m += 10) {
      try {
        await Slot.create({ faculty: req.userId, date, time: toStr(m) });
        created++;
      } catch (e) {
        if (e.code !== 11000) throw e; // 11000 = duplicate slot, just skip it
      }
    }
    if (!created) return res.status(409).json({ message: 'Those slots already exist' });
    res.status(201).json({ message: `${created} slot(s) added` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE: remove one of my open slots
router.delete('/slots/:id', auth.requireRole('faculty'), async (req, res) => {
  try {
    const slot = await Slot.findOneAndDelete({ _id: req.params.id, faculty: req.userId, status: 'open' });
    if (!slot) return res.status(404).json({ message: 'Slot not found or already booked' });
    res.json({ message: 'Slot removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
