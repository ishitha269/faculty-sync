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
