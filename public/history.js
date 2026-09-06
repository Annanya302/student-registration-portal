// ========================================
// Authentication
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
// Handle API JSON Response Safely
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
// Load Registration History
// ========================================

async function loadHistory() {

    if (!requireLogin()) {
        return;
    }

    const body =
        document.getElementById('historyBody');

    const message =
        document.getElementById('historyMessage');


    // Clear previous message

    message.textContent = '';
    message.className = 'message';


    try {

        const response = await fetch(
            '/api/registrations',
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
        // Read Response
        // ========================================

        const data =
            await getJsonResponse(response);


        if (!response.ok) {

            throw new Error(
                data.message ||
                'Unable to load registration history.'
            );
        }


        // ========================================
        // Validate Registration Data
        // ========================================

        const registrations =
            Array.isArray(data.registrations)
                ? data.registrations
                : [];


        // ========================================
        // No History
        // ========================================

        if (registrations.length === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="6">
                        No registration history found.
                    </td>
                </tr>
            `;

            return;
        }


        // ========================================
        // Create Table Rows
        // ========================================

        body.innerHTML = registrations
            .map((registration) => {

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                registration.registration_id
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                registration.academic_year
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                registration.semester
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                registration.registration_date
                            )}
                        </td>

                        <td>
                            <span class="status-text">
                                ${escapeHtml(
                                    registration.status
                                )}
                            </span>
                        </td>

                        <td>

                            <button
                                class="btn secondary small-btn pdf-btn"
                                type="button"
                                data-registration-id="${escapeHtml(
                                    registration.registration_id
                                )}"
                            >
                                PDF
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join('');


    } catch (error) {

        console.error(
            'History loading error:',
            error
        );

        message.textContent =
            error.message ||
            'Unable to load registration history.';

        message.className =
            'message error';
    }
}


// ========================================
// Format Registration Date
// ========================================

function formatDate(value) {

    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    );
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
// Download Registration PDF
// ========================================

document
    .getElementById('historyBody')
    .addEventListener('click', async (event) => {

        const button =
            event.target.closest('.pdf-btn');

        if (!button) {
            return;
        }


        const registrationId =
            button.dataset.registrationId;

        if (!registrationId) {
            return;
        }


        const message =
            document.getElementById('historyMessage');


        try {

            // Disable button while downloading
            button.disabled = true;
            button.textContent = 'Generating...';

            message.textContent = '';
            message.className = 'message';


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
            // Handle Error Response
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
            // Create Download
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


            // Release object URL after download
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

            // Restore button
            button.disabled = false;
            button.textContent = 'PDF';
        }
    });


// ========================================
// Start
// ========================================

loadHistory();