const express = require('express');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const notify = (user, message) => Notification.create({ user, message });

function populated(query) {
  return query
    .populate('student', 'name email')
    .populate('faculty', 'name department status')
    .populate('slot', 'date time');
}

// READ: students see their own, faculty see requests made to them
router.get('/', async (req, res) => {
  try {
    const filter = req.role === 'faculty' ? { faculty: req.userId } : { student: req.userId };
    const list = await populated(Appointment.find(filter).sort({ createdAt: -1 }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE: student books an open slot with a topic
router.post('/', auth.requireRole('student'), async (req, res) => {
  try {
    const { slotId, topic } = req.body || {};
    if (!slotId || !topic || !topic.trim())
      return res.status(400).json({ message: 'Slot and topic are required' });

    // atomic: only one student can grab an open slot
    const slot = await Slot.findOneAndUpdate({ _id: slotId, status: 'open' }, { status: 'booked' }, { new: true });
    if (!slot) return res.status(409).json({ message: 'Sorry, that slot was just taken' });

    const appt = await Appointment.create({
      student: req.userId,
      faculty: slot.faculty,
      slot: slot._id,
      topic: topic.trim(),
    });
    await notify(slot.faculty, `New request for ${slot.date} ${slot.time}: ${appt.topic}`);
    res.status(201).json({ message: 'Appointment requested' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE: students (checkin / edit topic), faculty (approve / reschedule / delegate / complete)
router.put('/:id', async (req, res) => {
  try {
    const appt = await populated(Appointment.findById(req.params.id));
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const isStudent = String(appt.student._id) === String(req.userId);
    const isFaculty = String(appt.faculty._id) === String(req.userId);
    if (!isStudent && !isFaculty) return res.status(403).json({ message: 'Not your appointment' });

    const { action, slotId, delegatedTo, topic } = req.body || {};
    const when = appt.slot ? `${appt.slot.date} ${appt.slot.time}` : '';

    if (isStudent) {
      if (action === 'checkin') {
        if (['completed', 'delegated'].includes(appt.status))
          return res.status(400).json({ message: 'Check-in is not available now' });
        appt.checkedIn = !appt.checkedIn;
        await appt.save();
        if (appt.checkedIn) await notify(appt.faculty._id, `${appt.student.name} is waiting outside your cabin`);
        return res.json({ message: appt.checkedIn ? 'You are in the queue' : 'Left the queue' });
      }
      if (action === 'edit') {
        if (!topic || !topic.trim()) return res.status(400).json({ message: 'Topic is required' });
        appt.topic = topic.trim();
        await appt.save();
        return res.json({ message: 'Topic updated' });
      }
      return res.status(400).json({ message: 'Invalid action' });
    }

    // faculty actions
    if (action === 'approve') {
      appt.status = 'approved';
      await appt.save();
      await notify(appt.student._id, `${appt.faculty.name} approved your request for ${when}`);
      return res.json({ message: 'Approved' });
    }

    if (action === 'reschedule') {
      const newSlot = await Slot.findOneAndUpdate(
        { _id: slotId, faculty: req.userId, status: 'open' },
        { status: 'booked' },
        { new: true }
      );
      if (!newSlot) return res.status(409).json({ message: 'That slot is not available' });
      if (appt.slot) await Slot.findByIdAndUpdate(appt.slot._id, { status: 'open' });
      appt.slot = newSlot._id;
      appt.status = 'rescheduled';
      await appt.save();
      await notify(appt.student._id, `${appt.faculty.name} moved your meeting to ${newSlot.date} ${newSlot.time}`);
      return res.json({ message: 'Rescheduled' });
    }

    if (action === 'delegate') {
      if (!delegatedTo || !delegatedTo.trim()) return res.status(400).json({ message: 'Enter the lab assistant name' });
      appt.status = 'delegated';
      appt.delegatedTo = delegatedTo.trim();
      appt.checkedIn = false;
      await appt.save();
      await notify(appt.student._id, `${appt.faculty.name} delegated your request to ${appt.delegatedTo}`);
      return res.json({ message: 'Delegated' });
    }

    if (action === 'complete') {
      appt.status = 'completed';
      appt.checkedIn = false;
      await appt.save();
      await notify(appt.student._id, `Your discussion with ${appt.faculty.name} is marked completed`);
      return res.json({ message: 'Marked completed' });
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE: cancel an appointment (student or faculty), frees the slot and notifies the other person
router.delete('/:id', async (req, res) => {
  try {
    const appt = await populated(Appointment.findById(req.params.id));
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const isStudent = String(appt.student._id) === String(req.userId);
    const isFaculty = String(appt.faculty._id) === String(req.userId);
    if (!isStudent && !isFaculty) return res.status(403).json({ message: 'Not your appointment' });

    const when = appt.slot ? `${appt.slot.date} ${appt.slot.time}` : '';
    if (appt.slot) await Slot.findByIdAndUpdate(appt.slot._id, { status: 'open' });
    await appt.deleteOne();

    if (isStudent) await notify(appt.faculty._id, `${appt.student.name} cancelled the meeting on ${when}`);
    else await notify(appt.student._id, `${appt.faculty.name} cancelled your meeting on ${when}`);

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
