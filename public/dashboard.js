// ================================
// Authentication Helpers
// ================================

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


// ================================
// Logout
// ================================

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('student');

    window.location.href = '/';
}

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}


// ================================
// Load Dashboard
// ================================

async function loadDashboard() {

    // Check whether user is logged in
    if (!requireLogin()) {
        return;
    }

    const message = document.getElementById('dashboardMessage');

    // Clear previous message
    if (message) {
        message.textContent = '';
        message.className = 'message';
    }

    try {

        // Send request to backend
        const response = await fetch('/api/student', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });


        // ================================
        // Session Expired / Unauthorized
        // ================================

        if (response.status === 401) {
            logout();
            return;
        }


        // ================================
        // Read Server Response
        // ================================

        const responseText = await response.text();

        let data;

        try {
            data = responseText
                ? JSON.parse(responseText)
                : {};
        } catch (error) {

            console.error(
                'Invalid JSON response from server:',
                responseText
            );

            throw new Error(
                `Server returned an invalid response. Status: ${response.status}`
            );
        }


        // ================================
        // Handle API Error
        // ================================

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to load dashboard.'
            );
        }


        // ================================
        // Validate Student Data
        // ================================

        if (!data.student) {
            throw new Error(
                'Student information was not received from the server.'
            );
        }

        const student = data.student;


        // ================================
        // Display Student Information
        // ================================

        const welcomeText =
            document.getElementById('welcomeText');

        const studentName =
            document.getElementById('studentName');

        const studentRollNo =
            document.getElementById('studentRollNo');

        const studentDepartment =
            document.getElementById('studentDepartment');

        const studentSemester =
            document.getElementById('studentSemester');


        if (welcomeText) {
            welcomeText.textContent =
                `Welcome, ${student.name}`;
        }

        if (studentName) {
            studentName.textContent =
                student.name || '-';
        }

        if (studentRollNo) {
            studentRollNo.textContent =
                student.roll_no || '-';
        }

        if (studentDepartment) {
            studentDepartment.textContent =
                student.department || '-';
        }

        if (studentSemester) {
            studentSemester.textContent =
                student.semester || '-';
        }


        // ================================
        // Registration Status
        // ================================

        const status =
            document.getElementById('registrationStatus');

        const registerBtn =
            document.getElementById('registerBtn');

        const registrationStatus =
            data.registrationStatus || 'Not Registered';


        if (status) {

            status.textContent =
                registrationStatus;

            // Remove previous status classes
            status.classList.remove(
                'registered',
                'not-registered'
            );

            // Add appropriate class
            if (registrationStatus === 'Registered') {

                status.classList.add('registered');

            } else {

                status.classList.add('not-registered');
            }
        }


        // ================================
        // Registration Button
        // ================================

        if (registerBtn) {

            if (registrationStatus === 'Registered') {

                registerBtn.textContent =
                    'Already Registered';

                registerBtn.classList.add('disabled');

                registerBtn.setAttribute(
                    'aria-disabled',
                    'true'
                );

                registerBtn.addEventListener(
                    'click',
                    function (event) {
                        event.preventDefault();
                    }
                );

            } else {

                registerBtn.textContent =
                    'Register for Semester';

                registerBtn.classList.remove('disabled');

                registerBtn.removeAttribute(
                    'aria-disabled'
                );
            }
        }


    } catch (error) {

        console.error(
            'Dashboard error:',
            error
        );

        if (message) {

            message.textContent =
                error.message ||
                'Unable to load dashboard. Please try again.';

            message.className =
                'message error';
        }
    }
}


// ================================
// Start Dashboard
// ================================

loadDashboard();