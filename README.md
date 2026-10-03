# 🎓 Faculty Sync (Office Hours & Slot Booker): Full Step-by-Step Guide

A micro-scheduling app where students book 10-minute slots with professors, see live faculty status badges, and check how many students are waiting outside a cabin.

**Stack:** Node.js + Express (backend), MongoDB Atlas + Mongoose (database), plain HTML/CSS/JavaScript (frontend), bcrypt + JWT cookie (login). Express serves both the pages and the API, so you deploy **one** project.

Two kinds of accounts: **student** and **faculty** (chosen on the sign-up page).

## What this project does (CRUD)

| | What the user can do |
|---|---|
| **Create** | Students request a topic and book an open slot. Faculty create 10-minute slots. |
| **Read** | Live status badges (In Cabin / In Class / In Meeting / On Leave), open slots, appointments, notifications. |
| **Update** | Faculty approve, reschedule, delegate to a lab assistant, or mark completed. Students edit the topic and check in. |
| **Delete** | Cancel an appointment; the other person gets an automatic notification and the slot reopens. |

**Unique edge:** **Queue Radar**: a student taps "I'm outside the cabin" and every student sees how many are waiting outside that professor's cabin.

> **Shortcut:** a ready-made copy of this whole project is included in the zip. If you only want to run it, unzip it, open the folder in VS Code, run `npm install`, create the `.env` file from Step 7 and run `npm run dev`. Follow the steps below if you want to build it file by file and understand each part.

---

## STEP 1: Install the things we need

On your laptop install:

1. **VS Code** from the official site (code.visualstudio.com). Install normally.
2. **Node.js (LTS version)** from nodejs.org. Install with the default settings.

---

## STEP 2: Check Node.js

Open Command Prompt or PowerShell and run:
```
node --version
npm --version
```
You should see version numbers (for example `v22.x.x` and `10.x.x`). If you do, you are ready.

---

## STEP 3: Create the project

Create a new folder, for example `Faculty-Sync` on your Desktop, and open that folder in VS Code. Then open **Terminal → New Terminal** and run:
```
npm init -y
```
A file called `package.json` appears.

---

## STEP 4: Install the backend packages

In the VS Code terminal run:
```
npm install express mongoose bcryptjs jsonwebtoken cookie-parser dotenv
```
Wait for it to finish, then install the development helper (it restarts the server automatically when you save a file):
```
npm install --save-dev nodemon
```

---

## STEP 5: Set up MongoDB Atlas

1. Go to **mongodb.com/atlas** and sign up or log in.
2. **Already made a cluster for another project? Reuse it.** You do not need a new cluster. Skip to point 5 and just use a new database name (`facultysync`) in the connection string.
3. Otherwise create a **free cluster (M0)** in any region and create a **database user** (username + password). Use a password with only letters and numbers, because special characters break the connection string.
4. Go to **Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**. This is needed so your deployed site can connect later.
5. Go to **Database → Connect → Drivers** and copy the connection string, which looks like:
```
mongodb+srv://myuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```
6. Replace `<password>` with your real password and add the database name `facultysync` just before the `?`:
```
mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/facultysync?retryWrites=true&w=majority
```
Atlas creates the database automatically the first time the app saves data.

---

## STEP 6: Create the folders and files

In the VS Code terminal run these one by one:
```
mkdir models
mkdir middleware
mkdir routes
mkdir public
mkdir public\css
mkdir public\js
```
Then create the empty files with right-click → **New File** in the Explorer. The final structure is:

```
Faculty-Sync/
├── middleware
│   └── auth.js
├── models
│   ├── Appointment.js
│   ├── Notification.js
│   ├── Slot.js
│   └── User.js
├── public
│   ├── css
│   │   └── style.css
│   ├── js
│   │   ├── auth.js
│   │   ├── common.js
│   │   └── dashboard.js
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   └── signup.html
├── routes
│   ├── appointments.js
│   ├── auth.js
│   ├── faculty.js
│   └── notifications.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

---

## STEP 7: Config files

**`.env`** (create this file in the main folder. Use your own values and never share or upload this file):
```
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/facultysync?retryWrites=true&w=majority
JWT_SECRET=change_this_to_any_long_random_text_12345xyz
PORT=5000
```

**`.gitignore`** (stops your secrets and the huge `node_modules` folder going to GitHub):
```
node_modules
.env
```

**`package.json`**: open it and change **only** the `"scripts"` part to the following, then press **Ctrl + S** to save:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
},
```
Keep the commas correct: there is a comma after the `"start"` line but not after the `"dev"` line. Leave the `dependencies` part as it is.

---

## STEP 8: Backend code

Copy each block into the file named above it.

**`server.js`**
```js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // needed for secure cookies on Render

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notifications', require('./routes/notifications'));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));
```

**`models/Appointment.js`**
```js
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
```

**`models/Notification.js`**
```js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
```

**`models/Slot.js`**
```js
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
```

**`models/User.js`**
```js
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
```

**`middleware/auth.js`**
```js
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

// Usage: router.post('/x', requireRole('faculty'), handler)
auth.requireRole = (role) => (req, res, next) => {
  if (req.role !== role) return res.status(403).json({ message: `Only ${role} accounts can do this` });
  next();
};

module.exports = auth;
```

**`routes/auth.js`** (sign up, log in, log out)
```js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function setTokenCookie(res, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// SIGN UP (role is "student" or "faculty")
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body || {};

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role === 'faculty' ? 'faculty' : 'student',
      department: role === 'faculty' ? department || '' : '',
    });

    setTokenCookie(res, user);
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOG IN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    setTokenCookie(res, user);
    res.json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOG OUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// WHO AM I
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(401).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
```

**`routes/appointments.js`**
```js
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
```

**`routes/faculty.js`**
```js
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
```

**`routes/notifications.js`**
```js
const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const list = await Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, read: false }, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

---

## STEP 9: Frontend code

**`public/css/style.css`**
```css
:root { --accent: #4338ca; --accent-dark: #3730a3; }
.queue { font-weight: 600; color: var(--info); font-size: 14px; }
.card h3 { overflow-wrap: anywhere; }
:root {
  --bg: #f6f7fb; --card: #ffffff; --text: #1c1f2a; --muted: #6b7280; --line: #e5e7eb;
  --good: #15803d; --good-bg: #dcfce7; --warn: #b45309; --warn-bg: #fef3c7;
  --bad: #b91c1c; --bad-bg: #fee2e2; --info: #1d4ed8; --info-bg: #dbeafe;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.45; min-height: 100vh; }
a { color: inherit; text-decoration: none; }
h2 { font-size: 22px; margin-bottom: 12px; }
h3 { font-size: 18px; }
.hidden { display: none !important; }
.muted { color: var(--muted); font-size: 14px; }
.note { color: var(--muted); font-size: 13px; margin: 6px 0; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.between { justify-content: space-between; }
.empty { color: var(--muted); padding: 14px 0; }
.msg { color: var(--bad); min-height: 20px; margin-bottom: 8px; font-size: 14px; }

/* Navbar */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 28px; background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 10; flex-wrap: wrap; gap: 10px; }
.brand { font-weight: 800; font-size: 22px; color: var(--accent); letter-spacing: -0.3px; }
.nav-right { display: flex; gap: 12px; align-items: center; }

/* Buttons */
.btn { padding: 10px 18px; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: inline-block; text-align: center; transition: background .15s; }
.btn-accent { background: var(--accent); color: #fff; }
.btn-accent:hover { background: var(--accent-dark); }
.btn-light { background: #eceef3; color: var(--text); }
.btn-light:hover { background: #dfe2ea; }
.btn-danger { background: var(--bad-bg); color: var(--bad); }
.btn-danger:hover { background: #fecaca; }
.btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 10px; }
.btn-block { width: 100%; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Layout */
.container { max-width: 1100px; margin: 0 auto; padding: 20px 20px 60px; }
.tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.tab { padding: 10px 18px; border: 1px solid var(--line); background: var(--card); border-radius: 999px; font-size: 15px; font-weight: 600; cursor: pointer; }
.tab.active { background: var(--text); color: #fff; border-color: var(--text); }
.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 0; }
.card > * + * { margin-top: 8px; }
.card .row { margin-top: 10px; }
.stack > * + * { margin-top: 16px; }

/* Forms */
input, select, textarea { width: 100%; padding: 11px 12px; border: 1.5px solid #d1d5db; border-radius: 10px; font-size: 15px; background: #fff; font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin: 10px 0 4px; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.form-card input, .form-card select { margin-bottom: 4px; }

/* Badges & banners */
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge.good { background: var(--good-bg); color: var(--good); }
.badge.warn { background: var(--warn-bg); color: var(--warn); }
.badge.bad { background: var(--bad-bg); color: var(--bad); }
.badge.info { background: var(--info-bg); color: var(--info); }
.badge.gray { background: #eceef3; color: #4b5563; }
.banner { padding: 14px 18px; border-radius: 14px; font-weight: 600; margin-bottom: 18px; }
.banner.good { background: var(--good-bg); color: var(--good); }
.banner.warn { background: var(--warn-bg); color: var(--warn); }
.banner.bad { background: var(--bad-bg); color: var(--bad); }

/* Toast */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111827; color: #fff; padding: 12px 20px; border-radius: 12px; z-index: 100; font-size: 15px; max-width: 90vw; }
.toast-error { background: var(--bad); }

/* Auth pages */
.auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: var(--card); width: 100%; max-width: 400px; padding: 32px; border-radius: 22px; border: 1px solid var(--line); text-align: center; }
.auth-card h2 { margin: 12px 0 16px; }
.auth-card input, .auth-card select { margin-bottom: 12px; }
.switch { margin-top: 16px; font-size: 14px; color: var(--muted); }
.switch a { color: var(--accent); font-weight: 700; }

/* Landing page */
.hero { text-align: center; padding: 70px 20px 40px; max-width: 760px; margin: 0 auto; }
.hero h1 { font-size: 46px; line-height: 1.1; margin-bottom: 14px; letter-spacing: -1px; }
.hero p { font-size: 19px; color: var(--muted); margin-bottom: 26px; }
.features { max-width: 1000px; margin: 20px auto 60px; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.features .card h3 { margin-bottom: 4px; }
@media (max-width: 600px) { .hero h1 { font-size: 32px; } }
```

**`public/index.html`** (landing page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faculty Sync - Office hours without the wait</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <nav class="navbar">
    <a href="/" class="brand">🎓 Faculty Sync</a>
    <div class="nav-right">
      <a href="/login.html" class="btn btn-light">Log in</a>
      <a href="/signup.html" class="btn btn-accent">Sign up</a>
    </div>
  </nav>

  <section class="hero">
    <h1>Stop waiting outside staff rooms.</h1>
    <p>Book a 10-minute slot with your professor, see whether they are in their cabin, and check how many students are ahead of you.</p>
    <a href="/signup.html" class="btn btn-accent">Get started</a>
  </section>

  <section class="features">
    <div class="card"><h3>Live status</h3><p class="muted">In Cabin, In Class, In Meeting or On Leave, updated by the professor.</p></div>
    <div class="card"><h3>Quick slots</h3><p class="muted">Pick from open 10-minute slots and state your topic.</p></div>
    <div class="card"><h3>Queue Radar</h3><p class="muted">See how many students are waiting outside a cabin right now.</p></div>
    <div class="card"><h3>Notifications</h3><p class="muted">Approvals, reschedules and cancellations reach you instantly.</p></div>
  </section>
</body>
</html>
```

**`public/signup.html`** (sign up page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign up - Faculty Sync</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="auth-wrap">
    <div class="auth-card">
      <a href="/" class="brand">🎓 Faculty Sync</a>
      <h2>Create your account</h2>
      <p class="msg" id="msg"></p>
      <form data-url="/api/auth/signup">
        <select name="role" id="role">
          <option value="student">I am a student</option>
          <option value="faculty">I am a faculty member</option>
        </select>
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input type="text" name="department" id="department" placeholder="Department (e.g. Computer Science)" class="hidden" />
        <input type="password" name="password" placeholder="Password (min 6 characters)" required />
        <button type="submit" class="btn btn-accent btn-block">Sign up</button>
      </form>
      <p class="switch">Already have an account? <a href="/login.html">Log in</a></p>
    </div>
  </div>
  <script>
    // show the department box only for faculty
    document.getElementById('role').addEventListener('change', (e) => {
      document.getElementById('department').classList.toggle('hidden', e.target.value !== 'faculty');
    });
  </script>
  <script src="/js/auth.js"></script>
</body>
</html>
```

**`public/login.html`** (log in page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Log in - Faculty Sync</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="auth-wrap">
    <div class="auth-card">
      <a href="/" class="brand">🎓 Faculty Sync</a>
      <h2>Welcome back</h2>
      <p class="msg" id="msg"></p>
      <form data-url="/api/auth/login">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit" class="btn btn-accent btn-block">Log in</button>
      </form>
      <p class="switch">New here? <a href="/signup.html">Create an account</a></p>
    </div>
  </div>
  <script src="/js/auth.js"></script>
</body>
</html>
```

**`public/js/auth.js`** (used by the sign up and log in pages)
```js
// Used by login.html and signup.html. Sends every named input in the form to the URL in data-url.
const msg = document.getElementById('msg');
const form = document.querySelector('form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const body = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(form.dataset.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      msg.textContent = data.message || 'Something went wrong';
      return;
    }
    window.location.href = '/dashboard.html';
  } catch (err) {
    msg.textContent = 'Network error, try again';
  }
});
```

**`public/js/common.js`** (small helpers used by the dashboard)
```js
// Small helpers shared by every dashboard page
const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function toast(text, isError) {
  const t = el('div', 'toast' + (isError ? ' toast-error' : ''), text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

async function api(url, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    toast('Network error, try again', true);
    return { ok: false, data: null };
  }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401) {
    window.location.href = '/login.html';
    return { ok: false, data };
  }
  return { ok: res.ok, data };
}

// Builds a row of tabs inside <div id="tabs">. Returns a function to switch tabs.
function makeTabs(list, onSelect) {
  const box = $('tabs');
  box.innerHTML = '';
  list.forEach(([key, label]) => {
    const b = el('button', 'tab', label);
    b.dataset.key = key;
    b.onclick = () => select(key);
    box.append(b);
  });
  function select(key) {
    box.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.key === key));
    onSelect(key);
  }
  return select;
}

async function loadMe() {
  const { ok, data } = await api('/api/auth/me');
  if (!ok) return null;
  if ($('welcome')) $('welcome').textContent = 'Hi, ' + data.name;
  return data;
}

if ($('logoutBtn')) {
  $('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', 'POST');
    window.location.href = '/';
  });
}
```

**`public/dashboard.html`** (the main page after login)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard - Faculty Sync</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <nav class="navbar">
    <a href="/" class="brand">🎓 Faculty Sync</a>
    <div class="nav-right">
      <span id="welcome" class="muted"></span>
      <button class="btn btn-light" id="logoutBtn">Log out</button>
    </div>
  </nav>

  <div class="container">
    <div class="tabs" id="tabs"></div>
    <div id="view"></div>
  </div>

  <script src="/js/common.js"></script>
  <script src="/js/dashboard.js"></script>
</body>
</html>
```

**`public/js/dashboard.js`** (all the dashboard behaviour)
```js
let me = null;
const view = $('view');
const STATUSES = ['In Cabin', 'In Class', 'In Meeting', 'On Leave'];

/* ---------- small helpers ---------- */
const statusClass = (s) => ({ 'In Cabin': 'good', 'In Class': 'warn', 'In Meeting': 'warn', 'On Leave': 'bad' }[s] || 'gray');
const apptClass = (s) => ({ pending: 'warn', approved: 'good', rescheduled: 'info', delegated: 'info', completed: 'gray' }[s] || 'gray');
const badge = (text, cls) => el('span', 'badge ' + cls, text);
const slotText = (s) => (s ? `${s.date} at ${s.time}` : 'Slot removed');
const sortBySlot = (list) => list.sort((a, b) => slotText(a.slot).localeCompare(slotText(b.slot)));

async function updateUnread() {
  const { data } = await api('/api/notifications');
  const n = (data || []).filter((x) => !x.read).length;
  const b = document.querySelector('.tab[data-key="notifications"]');
  if (b) b.textContent = n ? `Notifications (${n})` : 'Notifications';
}

/* =====================  STUDENT: FACULTY LIST  ===================== */
async function renderFaculty() {
  const { data } = await api('/api/faculty');
  view.innerHTML = '';
  view.append(el('h2', '', 'Faculty availability'));
  if (!data || data.length === 0) {
    view.append(el('p', 'empty', 'No faculty have signed up yet.'));
    return;
  }
  const grid = el('div', 'grid-cards');
  data.forEach((f) => {
    const card = el('div', 'card');
    const top = el('div', 'row between');
    top.append(el('h3', '', f.name), badge(f.status, statusClass(f.status)));
    card.append(top, el('p', 'muted', f.department || 'Faculty'));
    card.append(el('p', 'queue', `Queue Radar: ${f.queue} student(s) waiting outside`));

    if (f.slots.length === 0) {
      card.append(el('p', 'muted', 'No open slots right now'));
    } else {
      const sel = el('select');
      f.slots.forEach((s) => {
        const o = document.createElement('option');
        o.value = s._id;
        o.textContent = `${s.date} at ${s.time}`;
        sel.append(o);
      });
      const topic = el('input');
      topic.placeholder = 'Discussion topic';
      const btn = el('button', 'btn btn-accent', 'Book 10-minute slot');
      btn.onclick = async () => {
        if (!topic.value.trim()) return toast('Enter a discussion topic first', true);
        const { ok, data } = await api('/api/appointments', 'POST', { slotId: sel.value, topic: topic.value });
        toast((data && data.message) || (ok ? 'Requested' : 'Error'), !ok);
        renderFaculty();
      };
      card.append(sel, topic, btn);
    }
    grid.append(card);
  });
  view.append(grid);
}

/* =====================  STUDENT: MY APPOINTMENTS  ===================== */
async function studentAction(id, body) {
  const { ok, data } = await api('/api/appointments/' + id, 'PUT', body);
  toast((data && data.message) || (ok ? 'Done' : 'Error'), !ok);
  renderAppointments();
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment? The other person will be notified.')) return;
  const { ok, data } = await api('/api/appointments/' + id, 'DELETE');
  toast((data && data.message) || (ok ? 'Cancelled' : 'Error'), !ok);
  me.role === 'faculty' ? renderRequests() : renderAppointments();
}

async function renderAppointments() {
  const { data } = await api('/api/appointments');
  view.innerHTML = '';
  view.append(el('h2', '', 'My appointments'));
  if (!data || data.length === 0) {
    view.append(el('p', 'empty', 'Nothing booked yet. Open the Faculty tab and pick a slot.'));
    return;
  }
  const grid = el('div', 'grid-cards');
  sortBySlot(data).forEach((a) => {
    const card = el('div', 'card');
    const top = el('div', 'row between');
    top.append(el('h3', '', a.faculty.name), badge(a.status, apptClass(a.status)));
    card.append(top, el('p', 'muted', a.faculty.department || ''));
    card.append(el('p', '', 'When: ' + slotText(a.slot)), el('p', '', 'Topic: ' + a.topic));
    if (a.status === 'delegated') card.append(el('p', 'note', 'Delegated to: ' + a.delegatedTo));
    if (a.status === 'rescheduled') card.append(el('p', 'note', 'Your professor moved this to a new time.'));

    const actions = el('div', 'row');
    if (!['completed', 'delegated'].includes(a.status)) {
      const c = el('button', 'btn btn-sm ' + (a.checkedIn ? 'btn-accent' : 'btn-light'),
        a.checkedIn ? "I'm outside (tap to undo)" : "I'm outside the cabin");
      c.onclick = () => studentAction(a._id, { action: 'checkin' });
      actions.append(c);
    }
    if (a.status !== 'completed') {
      const e = el('button', 'btn btn-sm btn-light', 'Edit topic');
      e.onclick = () => {
        const t = prompt('Update the topic', a.topic);
        if (t && t.trim()) studentAction(a._id, { action: 'edit', topic: t });
      };
      actions.append(e);
    }
    const x = el('button', 'btn btn-sm btn-danger', 'Cancel');
    x.onclick = () => cancelAppt(a._id);
    actions.append(x);
    card.append(actions);
    grid.append(card);
  });
  view.append(grid);
}

/* =====================  FACULTY: REQUESTS  ===================== */
async function facultyAction(id, body) {
  const { ok, data } = await api('/api/appointments/' + id, 'PUT', body);
  toast((data && data.message) || (ok ? 'Done' : 'Error'), !ok);
  renderRequests();
}

async function renderRequests() {
  const [reqs, slots] = await Promise.all([api('/api/appointments'), api('/api/faculty/slots')]);
  const openSlots = (slots.data || []).filter((s) => s.status === 'open');
  view.innerHTML = '';

  // live status buttons
  const sc = el('div', 'card');
  sc.append(el('h3', '', 'Your live status (students see this)'));
  const row = el('div', 'row');
  STATUSES.forEach((s) => {
    const b = el('button', 'btn btn-sm ' + (me.status === s ? 'btn-accent' : 'btn-light'), s);
    b.onclick = async () => {
      const { ok, data } = await api('/api/faculty/status', 'PUT', { status: s });
      if (ok) me.status = s;
      toast((data && data.message) || 'Updated', !ok);
      renderRequests();
    };
    row.append(b);
  });
  sc.append(row);
  view.append(sc, el('h2', '', 'Student requests'));
  const list = reqs.data || [];
  if (list.length === 0) {
    view.append(el('p', 'empty', 'No requests yet. Add slots in the My Slots tab so students can book.'));
    return;
  }
  const grid = el('div', 'grid-cards');
  sortBySlot(list).forEach((a) => {
    const card = el('div', 'card');
    const top = el('div', 'row between');
    top.append(el('h3', '', a.student.name), badge(a.status, apptClass(a.status)));
    card.append(top, el('p', 'muted', a.student.email));
    card.append(el('p', '', 'When: ' + slotText(a.slot)), el('p', '', 'Topic: ' + a.topic));
    if (a.checkedIn) card.append(el('p', 'queue', 'Waiting outside your cabin now'));
    if (a.status === 'delegated') card.append(el('p', 'note', 'Delegated to: ' + a.delegatedTo));

    if (a.status !== 'completed') {
      const actions = el('div', 'row');
      if (a.status === 'pending') {
        const ap = el('button', 'btn btn-sm btn-accent', 'Approve');
        ap.onclick = () => facultyAction(a._id, { action: 'approve' });
        actions.append(ap);
      }
      if (a.status !== 'delegated') {
        const dl = el('button', 'btn btn-sm btn-light', 'Delegate to lab assistant');
        dl.onclick = () => {
          const n = prompt('Lab assistant name');
          if (n && n.trim()) facultyAction(a._id, { action: 'delegate', delegatedTo: n });
        };
        actions.append(dl);
      }
      const dn = el('button', 'btn btn-sm btn-light', 'Mark completed');
      dn.onclick = () => facultyAction(a._id, { action: 'complete' });
      const cn = el('button', 'btn btn-sm btn-danger', 'Cancel');
      cn.onclick = () => cancelAppt(a._id);
      actions.append(dn, cn);
      card.append(actions);

      if (openSlots.length) {
        const rs = el('div', 'row');
        const sel = el('select');
        openSlots.forEach((s) => {
          const o = document.createElement('option');
          o.value = s._id;
          o.textContent = `${s.date} at ${s.time}`;
          sel.append(o);
        });
        const rb = el('button', 'btn btn-sm btn-light', 'Reschedule');
        rb.onclick = () => facultyAction(a._id, { action: 'reschedule', slotId: sel.value });
        rs.append(sel, rb);
        card.append(rs);
      }
    }
    grid.append(card);
  });
  view.append(grid);
}

/* =====================  FACULTY: MY SLOTS  ===================== */
async function renderSlots() {
  const { data } = await api('/api/faculty/slots');
  view.innerHTML = '';

  const form = el('div', 'card form-card');
  form.innerHTML = `
    <h3>Add 10-minute slots</h3>
    <p class="muted">Choose a date and a time window. A slot is created every 10 minutes.</p>
    <div class="form-row">
      <div><label>Date</label><input type="date" id="sDate"></div>
      <div><label>From</label><input type="time" id="sFrom" value="10:00"></div>
      <div><label>To</label><input type="time" id="sTo" value="11:00"></div>
    </div>`;
  const add = el('button', 'btn btn-accent', 'Add slots');
  add.onclick = async () => {
    const { ok, data } = await api('/api/faculty/slots', 'POST', {
      date: $('sDate').value, from: $('sFrom').value, to: $('sTo').value,
    });
    toast((data && data.message) || (ok ? 'Added' : 'Error'), !ok);
    if (ok) renderSlots();
  };
  form.append(add);
  view.append(form, el('h2', '', 'Your slots'));

  if (!data || data.length === 0) {
    view.append(el('p', 'empty', 'No slots yet. Add some above.'));
    return;
  }
  const grid = el('div', 'grid-cards');
  data.forEach((s) => {
    const card = el('div', 'card');
    const top = el('div', 'row between');
    top.append(el('h3', '', `${s.date} at ${s.time}`), badge(s.status, s.status === 'open' ? 'good' : 'gray'));
    card.append(top);
    if (s.status === 'open') {
      const d = el('button', 'btn btn-sm btn-danger', 'Remove');
      d.onclick = async () => {
        const { ok, data } = await api('/api/faculty/slots/' + s._id, 'DELETE');
        toast((data && data.message) || 'Done', !ok);
        renderSlots();
      };
      card.append(d);
    }
    grid.append(card);
  });
  view.append(grid);
}

/* =====================  NOTIFICATIONS  ===================== */
async function renderNotifications() {
  const { data } = await api('/api/notifications');
  view.innerHTML = '';
  view.append(el('h2', '', 'Notifications'));
  if (!data || data.length === 0) {
    view.append(el('p', 'empty', 'No notifications yet.'));
    return;
  }
  const box = el('div', 'stack');
  data.forEach((n) => {
    const card = el('div', 'card');
    card.append(el('p', '', n.message), el('p', 'note', new Date(n.createdAt).toLocaleString()));
    if (!n.read) card.prepend(badge('new', 'info'));
    box.append(card);
  });
  view.append(box);
  await api('/api/notifications/read-all', 'PUT');
}

/* =====================  START  ===================== */
(async function init() {
  me = await loadMe();
  if (!me) return;
  const list = me.role === 'faculty'
    ? [['requests', 'Requests'], ['slots', 'My Slots'], ['notifications', 'Notifications']]
    : [['faculty', 'Faculty'], ['appointments', 'My Appointments'], ['notifications', 'Notifications']];
  const renderers = {
    faculty: renderFaculty, appointments: renderAppointments,
    requests: renderRequests, slots: renderSlots, notifications: renderNotifications,
  };
  const select = makeTabs(list, async (key) => {
    await renderers[key]();
    updateUnread();
  });
  select(list[0][0]);
})();
```

---

## STEP 10: Run it locally and test

In the VS Code terminal run:
```
npm run dev
```
You should see:
```
MongoDB connected
Server running on http://localhost:5000
```
Open **http://localhost:5000** in your browser.

**Test checklist:**

1. Open the site in two browsers (one normal window, one incognito). Sign up as **faculty** in one (add a department) and as **student** in the other.
2. **Faculty:** go to **My Slots**, pick a date, set 10:00 to 11:00 and click **Add slots**. Six 10-minute slots appear.
3. **Student:** open the **Faculty** tab. You see the professor, a status badge, Queue Radar and the open slots. Choose a slot, type a topic and click **Book**.
4. **Faculty:** open **Requests**. Test **Approve**, **Reschedule** (pick another slot), **Delegate to lab assistant** and **Mark completed**.
5. **Student:** in **My Appointments** click **I'm outside the cabin**. Then open the Faculty tab again: Queue Radar now shows 1.
6. **Faculty:** change the live status to **On Leave**. The student's Faculty tab shows the new badge after a refresh.
7. **Student:** click **Cancel** on an appointment. The faculty gets a notification and the slot becomes open again.
8. In Atlas, **Browse Collections** shows `users`, `slots`, `appointments` and `notifications`. Show that passwords start with `$2a$10$`.

**If something fails:**

- `Missing script: "dev"` means the `"scripts"` edit in Step 7 was not saved. Fix it and press Ctrl + S.
- `MongoDB connection error: bad auth` means the username or password in `.env` is wrong.
- `ENOTFOUND`, `ECONNREFUSED` or a timeout means Atlas Network Access (0.0.0.0/0) is not set.
- `Cannot find module ...` means a file is missing, in the wrong folder, or named differently. Compare with the structure in Step 6. If it names a package, run `npm install`.
- Changes not showing in the browser: hard refresh with **Ctrl + Shift + R**.

---

## STEP 11: Put the code on GitHub

1. Install **Git** from git-scm.com and create an account at github.com.
2. On GitHub click **New repository**, name it `faculty-sync` and keep it empty.
3. In the VS Code terminal:
```
git init
git add .
git commit -m "Faculty Sync (Office Hours & Slot Booker)"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/faculty-sync.git
git push -u origin main
```
Check on GitHub that `.env` and `node_modules` were **not** uploaded.

---

## STEP 12: Deploy on Render (free)

1. Go to **render.com** and sign up with GitHub.
2. Click **New → Web Service** and select your `faculty-sync` repository.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables** add:
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret text
   - `NODE_ENV` = `production`
5. Click **Deploy**. After a few minutes you get a public link like `https://faculty-sync-xxxx.onrender.com`.

The free plan sleeps when idle, so the first load can take about 50 seconds. Repeat the test checklist on the live link.

---

## What to submit

- The **Render link** (live site)
- The **GitHub repository link**

This covers: working sign up and log in, hashed passwords, a real database, a full CRUD feature, and public deployment.
