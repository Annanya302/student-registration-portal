// ========================================
// Authentication Helpers
// ========================================

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


// ========================================
// Logout
// ========================================

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('student');

    window.location.href = '/';
}

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}


// ========================================
// Page Elements
// ========================================

const courseList =
    document.getElementById('courseList');

const message =
    document.getElementById('registrationMessage');

const successPanel =
    document.getElementById('successPanel');

const registrationForm =
    document.getElementById('registrationForm');

const downloadPdfBtn =
    document.getElementById('downloadPdfBtn');


// ========================================
// Safely Read JSON
// ========================================

async function getJsonResponse(response) {

    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {

        console.error(
            'Invalid JSON response from server:',
            responseText
        );

        throw new Error(
            `Server returned an invalid response. Status: ${response.status}`
        );
    }
}


// ========================================
// Load Registration Page
// ========================================

async function loadRegistrationPage() {

    if (!requireLogin()) {
        return;
    }

    message.textContent = '';
    message.className = 'message';

    try {

        // Load student and courses together
        const [
            studentResponse,
            coursesResponse
        ] = await Promise.all([
            fetch('/api/student', {
                method: 'GET',
                headers: {
                    Authorization:
                        `Bearer ${getToken()}`
                }
            }),

            fetch('/api/courses', {
                method: 'GET',
                headers: {
                    Authorization:
                        `Bearer ${getToken()}`
                }
            })
        ]);


        // ========================================
        // Session Expired
        // ========================================

        if (
            studentResponse.status === 401 ||
            coursesResponse.status === 401
        ) {
            logout();
            return;
        }


        // ========================================
        // Read Responses
        // ========================================

        const studentData =
            await getJsonResponse(studentResponse);

        const courseData =
            await getJsonResponse(coursesResponse);


        // ========================================
        // Check API Errors
        // ========================================

        if (!studentResponse.ok) {
            throw new Error(
                studentData.message ||
                'Unable to load student information.'
            );
        }

        if (!coursesResponse.ok) {
            throw new Error(
                courseData.message ||
                'Unable to load courses.'
            );
        }


        // ========================================
        // Validate Student Data
        // ========================================

        if (!studentData.student) {
            throw new Error(
                'Student information was not received.'
            );
        }

        const student =
            studentData.student;


        // ========================================
        // Display Student Information
        // ========================================

        document.getElementById(
            'studentName'
        ).textContent =
            student.name || '-';

        document.getElementById(
            'studentRollNo'
        ).textContent =
            student.roll_no || '-';

        document.getElementById(
            'studentDepartment'
        ).textContent =
            student.department || '-';

        document.getElementById(
            'studentSemester'
        ).textContent =
            student.semester || '-';


        // ========================================
        // Display Academic Year
        // ========================================

        document.getElementById(
            'academicYear'
        ).textContent =
            courseData.academicYear || '-';


        // ========================================
        // Validate Course Data
        // ========================================

        const courses =
            Array.isArray(courseData.courses)
                ? courseData.courses
                : [];


        // ========================================
        // No Courses
        // ========================================

        if (courses.length === 0) {

            courseList.innerHTML = `
                <div class="empty-state">
                    <p>
                        No courses are available
                        for your current semester.
                    </p>
                </div>
            `;

            const submitButton =
                registrationForm.querySelector(
                    'button[type="submit"]'
                );

            if (submitButton) {
                submitButton.disabled = true;
            }

            return;
        }


        // ========================================
        // Display Courses
        // ========================================

        courseList.innerHTML =
            courses.map((course) => {

                return `
                    <label class="course-item">

                        <input
                            type="checkbox"
                            name="courseIds"
                            value="${Number(course.id)}"
                        >

                        <span class="course-details">

                            <strong>
                                ${escapeHtml(
                                    course.course_code
                                )}
                                -
                                ${escapeHtml(
                                    course.course_name
                                )}
                            </strong>

                            <span class="course-meta">
                                ${escapeHtml(
                                    course.credits
                                )}
                                Credits
                            </span>

                        </span>

                    </label>
                `;

            }).join('');


    } catch (error) {

        console.error(
            'Registration page error:',
            error
        );

        message.textContent =
            error.message ||
            'Unable to load registration details.';

        message.className =
            'message error';
    }
}


// ========================================
// Escape HTML
// ========================================

function escapeHtml(value) {

    return String(value ?? '').replace(
        /[&<>'"]/g,
        (char) => {

            const entities = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            };

            return entities[char];
        }
    );
}


// ========================================
// Registration Form Submission
// ========================================

registrationForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();


        // Clear previous message

        message.textContent = '';
        message.className = 'message';


        // ========================================
        // Get Selected Courses
        // ========================================

        const selected = [
            ...document.querySelectorAll(
                'input[name="courseIds"]:checked'
            )
        ].map((input) => Number(input.value));


        // ========================================
        // Get Academic Year
        // ========================================

        const academicYear =
            document.getElementById(
                'academicYear'
            ).textContent.trim();


        // ========================================
        // Validate Courses
        // ========================================

        if (selected.length === 0) {

            message.textContent =
                'Please select at least one course.';

            message.className =
                'message error';

            return;
        }


        // ========================================
        // Validate Academic Year
        // ========================================

        if (!/^\d{4}-\d{2}$/.test(academicYear)) {

            message.textContent =
                'Invalid academic year. Please reload the page.';

            message.className =
                'message error';

            return;
        }


        // ========================================
        // Confirmation
        // ========================================

        const confirmed = window.confirm(
            'Are you sure you want to submit your semester registration?'
        );

        if (!confirmed) {
            return;
        }


        const submitButton =
            registrationForm.querySelector(
                'button[type="submit"]'
            );


        try {

            // Disable submit button
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    'Submitting...';
            }


            // ========================================
            // Send Registration Request
            // ========================================

            const response = await fetch(
                '/api/registration',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${getToken()}`
                    },

                    body: JSON.stringify({
                        courseIds: selected,
                        academicYear
                    })
                }
            );


            // ========================================
            // Session Expired
            // ========================================

            if (response.status === 401) {
                logout();
                return;
            }


            // ========================================
            // Read Response
            // ========================================

            const data =
                await getJsonResponse(response);


            // ========================================
            // Handle Registration Error
            // ========================================

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    'Registration failed.'
                );
            }


            // ========================================
            // Validate Registration ID
            // ========================================

            if (!data.registrationId) {

                throw new Error(
                    'Registration succeeded, but no registration ID was received.'
                );
            }


            // ========================================
            // Show Confirmation
            // ========================================

            document.getElementById(
                'confirmationId'
            ).textContent =
                data.registrationId;


            /*
             * The backend stores registration_date
             * in the database.
             *
             * We don't receive that date from the
             * POST response, so for the confirmation
             * screen we show the current date/time.
             */
            document.getElementById(
                'confirmationDate'
            ).textContent =
                new Date().toLocaleString('en-IN');


            document.getElementById(
                'confirmationSemester'
            ).textContent =
                document.getElementById(
                    'studentSemester'
                ).textContent;


            document.getElementById(
                'confirmationYear'
            ).textContent =
                academicYear;


            document.getElementById(
                'confirmationStatus'
            ).textContent =
                'Registered';


            // ========================================
            // Configure PDF Button
            // ========================================

            downloadPdfBtn.dataset.registrationId =
                data.registrationId;

            downloadPdfBtn.href =
                '#';


            // ========================================
            // Hide Registration Form
            // ========================================

            registrationForm.classList.add(
                'hidden'
            );

            successPanel.classList.remove(
                'hidden'
            );


            // ========================================
            // Scroll to Confirmation
            // ========================================

            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });


        } catch (error) {

            console.error(
                'Registration error:',
                error
            );

            message.textContent =
                error.message ||
                'Registration failed. Please try again.';

            message.className =
                'message error';


        } finally {

            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    'Submit Registration';
            }
        }
    }
);


// ========================================
// Download Registration PDF
// ========================================

downloadPdfBtn.addEventListener(
    'click',
    async (event) => {

        event.preventDefault();


        const registrationId =
            downloadPdfBtn.dataset.registrationId;


        // Don't do anything if registration
        // has not been completed yet

        if (!registrationId) {

            message.textContent =
                'Registration ID is not available.';

            message.className =
                'message error';

            return;
        }


        try {

            downloadPdfBtn.classList.add(
                'disabled'
            );

            downloadPdfBtn.textContent =
                'Generating PDF...';


            const response = await fetch(
                `/api/registrations/${encodeURIComponent(
                    registrationId
                )}/pdf`,
                {
                    method: 'GET',

                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


            // ========================================
            // Session Expired
            // ========================================

            if (response.status === 401) {
                logout();
                return;
            }


            // ========================================
            // Handle API Error
            // ========================================

            if (!response.ok) {

                const data =
                    await response.json()
                        .catch(() => ({}));

                throw new Error(
                    data.message ||
                    'Unable to download PDF.'
                );
            }


            // ========================================
            // Get PDF
            // ========================================

            const blob =
                await response.blob();


            if (!blob || blob.size === 0) {

                throw new Error(
                    'The server returned an empty PDF.'
                );
            }


            // ========================================
            // Download PDF
            // ========================================

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement('a');

            link.href = url;

            link.download =
                `${registrationId}.pdf`;

            document.body.appendChild(link);

            link.click();

            link.remove();


            // Release object URL
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);


        } catch (error) {

            console.error(
                'PDF download error:',
                error
            );

            message.textContent =
                error.message ||
                'Unable to download PDF.';

            message.className =
                'message error';


        } finally {

            downloadPdfBtn.classList.remove(
                'disabled'
            );

            downloadPdfBtn.textContent =
                'Download Registration PDF';
        }
    }
);


// ========================================
// Start Page
// ========================================

loadRegistrationPage();