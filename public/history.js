const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = '/';
});

async function loadHistory() {
  const body = document.getElementById('historyBody');
  const message = document.getElementById('historyMessage');

  try {
    const response = await fetch('/api/registrations', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load registration history.');

    if (data.registrations.length === 0) {
      body.innerHTML = '<tr><td colspan="6">No registration history found.</td></tr>';
      return;
    }

    body.innerHTML = data.registrations.map(registration => `
      <tr>
        <td>${escapeHtml(registration.registration_id)}</td>
        <td>${escapeHtml(registration.academic_year)}</td>
        <td>${registration.semester}</td>
        <td>${formatDate(registration.registration_date)}</td>
        <td><span class="status-text">${escapeHtml(registration.status)}</span></td>
        <td>
          <button class="btn secondary small-btn pdf-btn" type="button" data-registration-id="${escapeHtml(registration.registration_id)}">PDF</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  }
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

loadHistory();


document.getElementById('historyBody').addEventListener('click', async (event) => {
  const button = event.target.closest('.pdf-btn');
  if (!button) return;

  const registrationId = button.dataset.registrationId;
  const message = document.getElementById('historyMessage');
  try {
    const response = await fetch(`/api/registrations/${encodeURIComponent(registrationId)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Unable to download PDF.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${registrationId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
  }
});
