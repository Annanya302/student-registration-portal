const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (localStorage.getItem('authToken')) {
  window.location.href = '/dashboard.html';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  loginMessage.className = 'message';

  const rollNo = document.getElementById('rollNo').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem('authToken', data.token);
    window.location.href = '/dashboard.html';
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.add('error');
  }
});
