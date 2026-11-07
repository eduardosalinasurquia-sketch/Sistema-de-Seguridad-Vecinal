(function () {
  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    message.textContent = 'Ingresando...';
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
      const session = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (!session.ok) throw new Error('El servidor no pudo validar la sesión creada');
      window.location.href = '/';
    } catch (error) { message.textContent = error.message; message.className = 'error'; }
  });
}());
