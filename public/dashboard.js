function getToken() {
  return localStorage.getItem('authToken');
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('authToken');
  window.location.href = '/';
}

document.getElementById('logoutBtn').addEventListener('click', logout);

async function loadDashboard() {
  if (!requireLogin()) return;

  try {
    const response = await fetch('/api/student', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load dashboard.');

    const student = data.student;
    document.getElementById('welcomeText').textContent = `Welcome, ${student.name}`;
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentRollNo').textContent = student.roll_no;
    document.getElementById('studentDepartment').textContent = student.department;
    document.getElementById('studentSemester').textContent = student.semester;

    const status = document.getElementById('registrationStatus');
    status.textContent = data.registrationStatus;
    status.classList.toggle('registered', data.registrationStatus === 'Registered');
  } catch (error) {
    const message = document.getElementById('dashboardMessage');
    message.textContent = error.message;
    message.classList.add('error');
  }
}

loadDashboard();
