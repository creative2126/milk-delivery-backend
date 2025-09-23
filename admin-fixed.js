document.addEventListener('DOMContentLoaded', function() {
    // Check for admin token on page load
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Load dashboard data
    loadDashboardData();

    // Setup logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userName');
        window.location.href = 'admin-login.html';
    });

    // Setup filter functionality
    document.getElementById('statusFilter').addEventListener('change', function(e) {
        const selectedStatus = e.target.value;
        loadSubscriptions(selectedStatus);
    });
});

async function loadDashboardData() {
    try {
        // Fetch stats
        await loadStats();

        // Fetch subscriptions
        await loadSubscriptions();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please try again.');
    }
}

async function loadStats() {
    try {
        // Use deployed backend URL for production
        const API_BASE_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://milk-delivery-backend.onrender.com';

        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Defensive parsing to ensure numbers
            const totalSubs = Number(data.totalSubscriptions) || 0;
            const activeSubs = Number(data.activeSubscriptions) || 0;
            const totalRev = Number(data.totalRevenue) || 0;
            const todaySubs = Number(data.todaySubscriptions) || 0;

            document.getElementById('totalSubscriptions').textContent = totalSubs;
            document.getElementById('activeSubscriptions').textContent = activeSubs;
            document.getElementById('totalRevenue').textContent = `₹${totalRev.toFixed(2)}`;
            document.getElementById('todaySubscriptions').textContent = todaySubs;
        } else if (response.status === 401 || response.status === 403) {
            // Token invalid or not admin
            localStorage.removeItem('adminToken');
            localStorage.removeItem('userName');
            window.location.href = 'admin-login.html';
        } else {
            throw new Error('Failed to fetch stats');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        throw error;
    }
}

async function loadSubscriptions(status = 'all') {
    try {
        // Use deployed backend URL for production
        const API_BASE_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://milk-delivery-backend.onrender.com';

        const url = status === 'all'
            ? `${API_BASE_URL}/api/admin/subscriptions`
            : `${API_BASE_URL}/api/admin/subscriptions?status=${status}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            populateSubscriptionsTable(data.subscriptions);
        } else if (response.status === 401 || response.status === 403) {
            // Token invalid or not admin
            localStorage.removeItem('adminToken');
            localStorage.removeItem('userName');
            window.location.href = 'admin-login.html';
        } else {
            throw new Error('Failed to fetch subscriptions');
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        throw error;
    }
}

function populateSubscriptionsTable(subscriptions) {
    const tableBody = document.getElementById('subscriptionsTableBody');
    const loadingDiv = document.getElementById('loadingSubscriptions');
    const table = document.getElementById('subscriptionsTable');

    // Clear existing rows
    tableBody.innerHTML = '';

    if (!subscriptions || subscriptions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">No subscriptions found</td></tr>';
    } else {
        subscriptions.forEach(sub => {
            const row = document.createElement('tr');

            // Format created_at date
            const createdAt = new Date(sub.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Determine status class
            let statusClass = '';
            switch (sub.status.toLowerCase()) {
                case 'active':
                    statusClass = 'status-active';
                    break;
                case 'paused':
                    statusClass = 'status-paused';
                    break;
                case 'expired':
                    statusClass = 'status-expired';
                    break;
            }

            // Create Google Maps link by parsing latitude and longitude from subscription address
            let locationLink = 'N/A';
            let lat = null;
            let lng = null;

            // Try to parse lat/lng from subscription address (format: "address, Lat: 17.4131, Lng: 78.5442")
            if (sub.address) {
                const latMatch = sub.address.match(/Lat:\s*([0-9.-]+)/);
                const lngMatch = sub.address.match(/Lng:\s*([0-9.-]+)/);
                if (latMatch && lngMatch) {
                    lat = parseFloat(latMatch[1]);
                    lng = parseFloat(lngMatch[1]);
                }
            }

            if (lat !== null && lng !== null) {
                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                locationLink = `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">View Map</a>`;
            } else if (sub.address) {
                // Fallback: show the address without lat/lng
                locationLink = sub.address.replace(/,\s*Lat:\s*[0-9.-]+,\s*Lng:\s*[0-9.-]+/, '');
            }

            // Transform duration to show final days including free days
            let displayDuration = sub.duration;
            if (sub.duration === '6days') {
                displayDuration = '7 days (6+1 FREE)';
            } else if (sub.duration === '15days') {
                displayDuration = '17 days (15+2 FREE)';
            } else {
                displayDuration = sub.duration + ' days';
            }

            row.innerHTML = `
                <td>${sub.id}</td>
                <td>${sub.username || 'N/A'}</td>
                <td>${sub.email || 'N/A'}</td>
                <td>${sub.phone || 'N/A'}</td>
                <td>${sub.flat_number || 'N/A'}</td>
                <td>${sub.building_name || 'N/A'}</td>
                <td>${sub.subscription_type}</td>
                <td>${displayDuration}</td>
                <td>₹${sub.amount}</td>
                <td><span class="${statusClass}">${sub.status}</span></td>
                <td>${locationLink}</td>
                <td>${createdAt}</td>
            `;

            tableBody.appendChild(row);
        });
    }

    // Hide loading and show table
    loadingDiv.style.display = 'none';
    table.style.display = 'table';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}
