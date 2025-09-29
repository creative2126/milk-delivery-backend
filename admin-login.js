console.log('Admin login page loaded');

// Get API base URL - matches pattern from payment.js
function getApiBaseUrl() {
    const productionBackendUrl = 'https://milk-delivery-backend.onrender.com';
    
    // Check if we're in production (freshndorganic.com domain)
    if (window.location.hostname === 'freshndorganic.com' ||
        window.location.hostname === 'www.freshndorganic.com') {
        return productionBackendUrl;
    }
    
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    
    // Fallback
    return '';
}

const API_BASE_URL = getApiBaseUrl();
console.log('Admin Login - API_BASE_URL:', API_BASE_URL);
console.log('Current domain:', window.location.hostname);

document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    // Clear previous error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    try {
        console.log('Attempting admin login for:', username);
        console.log('Making request to:', `${API_BASE_URL}/api/admin/login`);

        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            console.log('Login successful, storing token and redirecting');
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('userName', data.user.username);
            
            // Redirect to admin dashboard
            window.location.href = '/admin-fixed.html';
        } else {
            console.error('Login failed:', data.message);
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Network error during admin login:', error);
        errorDiv.textContent = 'Network error: ' + error.message;
        errorDiv.style.display = 'block';
    }
});