document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        
        // Try to get parameters from URL first
        let subscription = params.get('subscription');
        let duration = params.get('duration');
        let amount = params.get('amount');
        let address = params.get('address');
        let building = params.get('building');
        let flat = params.get('flat');
        let paymentId = params.get('payment_id');

        // If URL parameters are missing, try to get from localStorage
        if (!subscription || !amount) {
            const savedData = localStorage.getItem('lastSubscription');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    subscription = subscription || data.subscription_type;
                    duration = duration || data.duration;
                    amount = amount || data.amount;
                    address = address || data.address;
                    building = building || data.building_name;
                    flat = flat || data.flat_number;
                    paymentId = paymentId || data.payment_id;
                } catch (e) {
                    console.warn('Failed to parse saved subscription data:', e);
                }
            }
        }

        // Ensure we have basic values
        subscription = subscription || 'Milk Subscription';
        duration = duration || 'Not specified';
        amount = amount || '0';
        address = address || 'Address not provided';
        building = building || 'Not specified';
        flat = flat || 'Not specified';

        // Display the details
        document.getElementById('subscriptionType').textContent = `${subscription} milk plan`;
        document.getElementById('subscriptionDuration').textContent = duration;
        document.getElementById('totalAmount').textContent = `₹${amount}`;
        document.getElementById('deliveryAddress').textContent = address;
        document.getElementById('buildingName').textContent = building;
        document.getElementById('flatNumber').textContent = flat;

        // Add payment ID if available
        if (paymentId) {
            const paymentInfo = document.createElement('div');
            paymentInfo.className = 'detail-item';
            paymentInfo.innerHTML = `
                <span class="detail-label">Payment ID:</span>
                <span class="detail-value">${paymentId}</span>
            `;
            document.querySelector('.subscription-details').appendChild(paymentInfo);
        }

        // Confetti animation
        const confettiContainer = document.querySelector('.confirmation-container');
        if (confettiContainer) {
            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.animationDelay = `${Math.random() * 3}s`;
                const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
                confetti.style.background = randomColor;
                confettiContainer.appendChild(confetti);
            }
        }

        // Clear the saved data after displaying
        localStorage.removeItem('lastSubscription');

        // Add debugging info
        console.log('Confirmation page loaded with:', {
            subscription,
            duration,
            amount,
            address,
            building,
            flat,
            paymentId
        });

    } catch (error) {
        console.error('Error loading confirmation page:', error);
        
        // Show basic success message even if parameters are missing
        document.getElementById('subscriptionType').textContent = 'Milk Subscription';
        document.getElementById('subscriptionDuration').textContent = 'Successfully activated';
        document.getElementById('totalAmount').textContent = 'Payment processed';
        document.getElementById('deliveryAddress').textContent = 'Your subscription is now active';
        document.getElementById('buildingName').textContent = 'Thank you for your order';
        document.getElementById('flatNumber').textContent = 'Check your email for details';
    }
});
