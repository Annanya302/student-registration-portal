const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = '/';
});

const courseList = document.getElementById('courseList');
const message = document.getElementById('registrationMessage');
const successPanel = document.getElementById('successPanel');

async function loadRegistrationPage() {
  try {
    const [studentResponse, coursesResponse] = await Promise.all([
      fetch('/api/student', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (studentResponse.status === 401 || coursesResponse.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return;
    }

    const studentData = await studentResponse.json();
    const courseData = await coursesResponse.json();

    if (!studentResponse.ok) throw new Error(studentData.message);
    if (!coursesResponse.ok) throw new Error(courseData.message);

    const student = studentData.student;
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentRollNo').textContent = student.roll_no;
    document.getElementById('studentDepartment').textContent = student.department;
    document.getElementById('studentSemester').textContent = student.semester;
    document.getElementById('academicYear').textContent = courseData.academicYear;

    courseList.innerHTML = courseData.courses.map(course => `
      <label class="course-item">
        <input type="checkbox" name="courseIds" value="${course.id}">
        <span class="course-details">
          <strong>${escapeHtml(course.course_code)} - ${escapeHtml(course.course_name)}</strong>
          <span class="course-meta">${course.credits} Credits</span>
        </span>
      </label>
    `).join('');
  } catch (error) {
    message.textContent = error.message || 'Unable to load registration details.';
    message.classList.add('error');
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

document.getElementById('registrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'message';

  const selected = [...document.querySelectorAll('input[name="courseIds"]:checked')]
    .map(input => Number(input.value));
  const academicYear = document.getElementById('academicYear').textContent;

  if (selected.length === 0) {
    message.textContent = 'Please select at least one course.';
    message.classList.add('error');
    return;
  }

  const confirmed = window.confirm('Are you sure you want to submit your semester registration?');
  if (!confirmed) return;

  try {
    const response = await fetch('/api/registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ courseIds: selected, academicYear })
    });

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed.');

    document.getElementById('confirmationId').textContent = data.registrationId;
    document.getElementById('confirmationDate').textContent = new Date().toLocaleString('en-IN');
    document.getElementById('confirmationSemester').textContent = document.getElementById('studentSemester').textContent;
    document.getElementById('confirmationYear').textContent = academicYear;
    document.getElementById('confirmationStatus').textContent = 'Registered';
    document.getElementById('downloadPdfBtn').dataset.registrationId = data.registrationId;

    document.getElementById('registrationForm').classList.add('hidden');
    successPanel.classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  }
});

loadRegistrationPage();


document.getElementById('downloadPdfBtn').addEventListener('click', async (event) => {
  event.preventDefault();
  const registrationId = event.currentTarget.dataset.registrationId;
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
