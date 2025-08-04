document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Check if toast container exists
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    window.toast.container = document.createElement('div');
    window.toast.container.id = 'toast-container';
    window.toast.container.style.position = 'fixed';
    window.toast.container.style.top = '20px';
    window.toast.container.style.right = '20px';
    window.toast.container.style.zIndex = '9999';
    document.body.appendChild(window.toast.container);
  }

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameOrEmail = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!usernameOrEmail || !password) {
      window.toast.show('Please enter email/mobile and password.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returned non-JSON response:', text);
        window.toast.show('Server error. Please try again later.', 'error');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        window.toast.show(data.error || 'Login failed.', 'error');
        return;
      }

      // Login successful
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('userName', data.user.username);
      localStorage.setItem('userEmail', data.user.email || '');
      window.toast.show('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        window.toast.show('Network error. Please check your connection and try again.', 'error');
      } else if (error.name === 'SyntaxError') {
        window.toast.show('Server error. Please try again later.', 'error');
      } else {
        window.toast.show('An error occurred during login. Please try again.', 'error');
      }
    }
  });

  // Handle registration form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('registerFullName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const mobile = document.getElementById('registerMobile').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();
    const termsChecked = document.getElementById('termsCheckbox').checked;

    if (!fullName || !email || !mobile || !password || !confirmPassword) {
      window.toast.show('Please fill in all required fields.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      window.toast.show('Passwords do not match.', 'error');
      return;
    }
    if (!termsChecked) {
      window.toast.show('You must agree to the Terms and Conditions.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          password,
          name: fullName,
          phone: mobile,
          email
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returned non-JSON response:', text);
        window.toast.show('Server error. Please try again later.', 'error');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        window.toast.show(data.error || 'Registration failed.', 'error');
        if (data.error && data.error.toLowerCase().includes('already exists')) {
          document.getElementById('registerEmail').value = '';
          document.getElementById('registerPassword').value = '';
          document.getElementById('registerConfirmPassword').value = '';
        }
        return;
      }

      window.toast.show('Registration successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        window.toast.show('Network error. Please check your connection and try again.', 'error');
      } else if (error.name === 'SyntaxError') {
        window.toast.show('Server error. Please try again later.', 'error');
      } else {
        window.toast.show('An error occurred during registration. Please try again.', 'error');
      }
    }
  });
});
