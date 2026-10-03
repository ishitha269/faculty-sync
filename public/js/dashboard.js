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
