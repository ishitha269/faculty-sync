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
