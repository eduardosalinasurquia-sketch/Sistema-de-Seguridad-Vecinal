(function () {
  const form = document.getElementById('register-form');
  const message = document.getElementById('register-message');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (document.getElementById('password').value !== document.getElementById('password-confirm').value) { message.textContent = 'Las contraseñas no coinciden'; return; }
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('name').value, email: document.getElementById('email').value, password: document.getElementById('password').value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la cuenta');
      window.location.href = '/login?created=1';
    } catch (error) { message.textContent = error.message; message.className = 'error'; }
  });
}());
