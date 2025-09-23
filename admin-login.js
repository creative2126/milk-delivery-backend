document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    try {
        // Use deployed backend URL for production
        const API_BASE_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://milk-delivery-backend.onrender.com';

        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('userName', data.user.username);
            window.location.href = '/admin-fixed.html';
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error: ' + error.message;
        errorDiv.style.display = 'block';
    }
});
