const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

// If already logged in, go directly to dashboard
if (localStorage.getItem('authToken')) {
    window.location.href = '/dashboard.html';
}

// Handle login form submission
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous message
    loginMessage.textContent = '';
    loginMessage.className = 'message';

    // Get form values
    const rollNo = document.getElementById('rollNo').value.trim();
    const password = document.getElementById('password').value;

    // Basic validation
    if (!rollNo || !password) {
        loginMessage.textContent =
            'Please enter Roll Number and Password.';
        loginMessage.classList.add('error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rollNo,
                password
            })
        });

        // Read response as text first
        const responseText = await response.text();

        let data;

        // Safely parse JSON
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            console.error('Server response was not valid JSON:');
            console.error(responseText);

            throw new Error(
                `Server returned an invalid response. Status: ${response.status}`
            );
        }

        // Handle failed login
        if (!response.ok) {
            throw new Error(
                data.message || 'Invalid Roll Number or Password.'
            );
        }

        // Make sure authentication token exists
        if (!data.token) {
            throw new Error(
                'Login successful, but authentication token was not received.'
            );
        }

        // Save authentication token
        localStorage.setItem('authToken', data.token);

        // Show success message
        loginMessage.textContent =
            data.message || 'Login successful!';

        loginMessage.className = 'message success';

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 500);

    } catch (error) {
        console.error('Login error:', error);

        loginMessage.textContent =
            error.message ||
            'Unable to login. Please try again.';

        loginMessage.className = 'message error';
    }
});