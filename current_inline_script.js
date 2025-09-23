class SubscriptionPage {
      constructor() {
        this.map = null;
        this.marker = null;
        this.currentLocation = null;
        this.selectedSize = null;
        this.selectedDuration = '6days';
        this.selectedPrice = 0;
        this.buildingDetails = null;
        this.subscriptionId = null;
        this.init();
      }

      init() {
        // Initialize subscription data
        this.setupSubscriptionData();

        // Setup event listeners
        this.setupEventListeners();

        // Setup duration selector
        this.setupDurationSelector();
      }

      setupSubscriptionData() {
        // Get selected subscription size from the button that was clicked
        document.querySelectorAll('.subscribe-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.selectedSize = e.target.dataset.size;
            this.calculatePrice();
            this.showLocationModal();
          });
        });
      }

      setupEventListeners() {
        // Location modal events
        document.getElementById('closeLocationModal').addEventListener('click', () => {
          document.getElementById('locationModal').classList.add('hidden');
        });

        document.getElementById('cancelLocationBtn').addEventListener('click', () => {
          document.getElementById('locationModal').classList.add('hidden');
        });

        document.getElementById('confirmLocationBtn').addEventListener('click', () => {
          this.confirmLocation();
        });

        document.getElementById('backToLocationBtn').addEventListener('click', () => {
          this.backToLocation();
        });

        document.getElementById('submitBuildingFlatBtn').addEventListener('click', () => {
          this.submitBuildingDetails();
        });

        // Payment modal events
        document.getElementById('closePaymentModal').addEventListener('click', () => {
          document.getElementById('paymentModal').classList.add('hidden');
        });

        document.getElementById('cancelPaymentBtn').addEventListener('click', () => {
          document.getElementById('paymentModal').classList.add('hidden');
        });

        document.getElementById('proceedPaymentBtn').addEventListener('click', () => {
          this.proceedToPayment();
        });

        // Confirmation modal events
        document.getElementById('closeConfirmation').addEventListener('click', () => {
          document.getElementById('confirmation').classList.add('hidden');
        });

        document.getElementById('closeConfirmationBtn').addEventListener('click', () => {
          window.location.href = 'home.html';
        });

        // Error modal events
        document.getElementById('closeErrorModal').addEventListener('click', () => {
          document.getElementById('errorModal').classList.add('hidden');
        });

        document.getElementById('closeErrorBtn').addEventListener('click', () => {
          document.getElementById('errorModal').classList.add('hidden');
        });

        document.getElementById('retryBtn').addEventListener('click', () => {
          document.getElementById('errorModal').classList.add('hidden');
          // Retry the payment process
          this.proceedToPayment();
        });

        // Building details form events
        document.getElementById('buildingNameInput').addEventListener('input', () => {
          this.updateAddressPreview();
        });

        document.getElementById('flatNumberInput').addEventListener('input', () => {
          this.updateAddressPreview();
        });

        document.getElementById('landmarkInput').addEventListener('input', () => {
          this.updateAddressPreview();
        });
      }

      setupDurationSelector() {
        document.querySelectorAll('input[name="duration"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            this.selectedDuration = e.target.value;
            this.calculatePrice();
          });
        });
      }

      calculatePrice() {
        const priceMap = {
          '500ml': { '6days': 150, '15days': 375 },
          '1L': { '6days': 270, '15days': 675 },
          '2L': { '6days': 450, '15days': 1125 }
        };

        if (this.selectedSize) {
          this.selectedPrice = priceMap[this.selectedSize][this.selectedDuration];
        }

        // Update price display
        document.querySelectorAll('.price').forEach(priceEl => {
          const weeklyPrice = priceEl.dataset.weekly;
          const fifteenPrice = priceEl.dataset['15days'];

          if (this.selectedDuration === '6days') {
            priceEl.textContent = `${weeklyPrice} / 7 days (6+1 FREE)`;
          } else {
            priceEl.textContent = `${fifteenPrice} / 17 days (15+2 FREE)`;
          }
        });
      }

      showLocationModal() {
        const modal = document.getElementById('locationModal');
        if (modal) {
          modal.classList.remove('hidden');
          console.log('Modal opened, about to initialize map...');

          setTimeout(() => {
            console.log('Timeout reached, calling initializeMap...');
            this.initializeMap();
          }, 300);
        }
      }

      initializeMap() {
        console.log('initializeMap() called!');
        console.log('L object exists:', typeof L !== 'undefined');

        if (typeof L === 'undefined') {
          console.log('ERROR: Leaflet not loaded');
          return;
        }

        if (this.map) {
          console.log('Map already initialized, refreshing size');
          setTimeout(() => this.map.invalidateSize(), 200);
          return;
        }

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
          console.log('ERROR: #map element not found');
          return;
        }

        console.log('Creating Leaflet map...');
        // Start with default location (Hyderabad)
        this.map = L.map('map').setView([17.385044, 78.486671], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        // Auto-detect user's location
        this.detectUserLocation();

        this.map.on('click', (e) => {
          console.log('Map clicked:', e.latlng);
          this.currentLocation = e.latlng;

          if (this.marker) {
            this.marker.setLatLng(e.latlng);
          } else {
            this.marker = L.marker(e.latlng).addTo(this.map);
          }

          document.getElementById('confirmLocationBtn').disabled = false;
        });

        // Fix for hidden modal rendering
        setTimeout(() => this.map.invalidateSize(), 200);
      }

      detectUserLocation() {
        console.log('Attempting to detect user location...');

        if (!navigator.geolocation) {
          console.log('Geolocation is not supported by this browser.');
          this.updateDebugInfo('Geolocation not supported. Please click on the map to set your location.');
          return;
        }

        // Update debug info
        this.updateDebugInfo('Detecting your location...');

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log('Location detected:', { lat, lng, accuracy });

            // Set current location
            this.currentLocation = { lat, lng };

            // Center map on user's location
            this.map.setView([lat, lng], 15);

            // Add marker at user's location
            if (this.marker) {
              this.marker.setLatLng([lat, lng]);
            } else {
              this.marker = L.marker([lat, lng]).addTo(this.map);
            }

            // Enable confirm button
            document.getElementById('confirmLocationBtn').disabled = false;

            // Update debug info
            this.updateDebugInfo(`Location detected! Accuracy: ${Math.round(accuracy)}m. You can click elsewhere to change it.`);

            console.log('User location set successfully');
          },
          (error) => {
            console.error('Error getting location:', error);
            let errorMessage = 'Unable to detect location. ';

            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Location access denied. Please allow location access and refresh.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage += 'Location request timed out.';
                break;
              default:
                errorMessage += 'An unknown error occurred.';
                break;
            }

            this.updateDebugInfo(errorMessage + ' Please click on the map to set your location manually.');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }

      confirmLocation() {
        // Switch to building details slide
        document.getElementById('locationSlide').classList.add('hidden');
        document.getElementById('buildingSlide').classList.remove('hidden');

        // Update buttons
        document.getElementById('confirmLocationBtn').classList.add('hidden');
        document.getElementById('backToLocationBtn').classList.remove('hidden');
        document.getElementById('submitBuildingFlatBtn').classList.remove('hidden');

        // Update modal title
        document.querySelector('#locationModal .modal-header h3').innerHTML =
          '<i class="fas fa-building"></i> Building Details';
      }

      backToLocation() {
        // Switch back to location slide
        document.getElementById('locationSlide').classList.remove('hidden');
        document.getElementById('buildingSlide').classList.add('hidden');

        // Update buttons
        document.getElementById('confirmLocationBtn').classList.remove('hidden');
        document.getElementById('backToLocationBtn').classList.add('hidden');
        document.getElementById('submitBuildingFlatBtn').classList.add('hidden');

        // Update modal title
        document.querySelector('#locationModal .modal-header h3').innerHTML =
          '<i class="fas fa-map-marker-alt"></i> Select Delivery Location';
      }

      updateAddressPreview() {
        const buildingName = document.getElementById('buildingNameInput').value.trim();
        const flatNumber = document.getElementById('flatNumberInput').value.trim();
        const landmark = document.getElementById('landmarkInput').value.trim();

        const preview = document.getElementById('addressPreview');

        if (buildingName && flatNumber) {
          let address = `${buildingName}, ${flatNumber}`;
          if (landmark) {
            address += `, ${landmark}`;
          }
          preview.textContent = address;
        } else {
          preview.textContent = 'Select location and enter details above';
        }
      }

      submitBuildingDetails() {
        const buildingName = document.getElementById('buildingNameInput').value.trim();
        const flatNumber = document.getElementById('flatNumberInput').value.trim();

        if (!buildingName || !flatNumber) {
          alert('Please enter both building name and flat number');
          return;
        }

        // Store building details
        this.buildingDetails = {
          buildingName,
          flatNumber,
          landmark: document.getElementById('landmarkInput').value.trim()
        };

        // Close location modal and show payment modal
        document.getElementById('locationModal').classList.add('hidden');
        this.showPaymentModal();
      }

      showPaymentModal() {
        // Update subscription summary
        this.updateSubscriptionSummary();

        // Show payment modal
        document.getElementById('paymentModal').classList.remove('hidden');
      }

      updateSubscriptionSummary() {
        const actualDays = this.selectedDuration === '6days' ? '7 days (6+1 FREE)' : '17 days (15+2 FREE)';

        document.getElementById('subscriptionSummary').textContent =
          `${this.selectedSize} subscription for ${actualDays}`;

        if (this.currentLocation) {
          document.getElementById('locationSummary').textContent =
            `Lat: ${this.currentLocation.lat.toFixed(4)}, Lng: ${this.currentLocation.lng.toFixed(4)}`;
        }

        if (this.buildingDetails) {
          let address = `${this.buildingDetails.buildingName}, ${this.buildingDetails.flatNumber}`;
          if (this.buildingDetails.landmark) {
            address += `, ${this.buildingDetails.landmark}`;
          }
          document.getElementById('buildingSummary').textContent = address;
        }

        document.getElementById('totalAmount').textContent = `₹${this.selectedPrice}`;
      }

      proceedToPayment() {
        // Check if Razorpay is available
        if (typeof Razorpay !== 'undefined') {
          this.initiateRazorpayPayment();
        } else {
          // For demo purposes, simulate successful payment
          console.log('Razorpay not loaded, simulating payment...');
          setTimeout(() => {
            this.handlePaymentSuccess({ razorpay_payment_id: 'pay_demo_' + Date.now() });
          }, 1000);
        }
      }

      initiateRazorpayPayment() {
        const options = {
          key: 'rzp_test_RF8OERr5RnBors', // Razorpay key
          amount: this.selectedPrice * 100, // Amount in paise
          currency: 'INR',
          name: 'Fresh Milk Subscription',
          description: `${this.selectedSize} subscription for ${this.selectedDuration}`,
          handler: (response) => {
            this.handlePaymentSuccess(response);
          },
          prefill: {
            name: 'Customer Name',
            email: 'customer@example.com',
            contact: '9999999999'
          },
          theme: {
            color: '#2c5530'
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      }

      async handlePaymentSuccess(response) {
        console.log('Payment successful:', response);

        // Close payment modal
        document.getElementById('paymentModal').classList.add('hidden');

        // Save subscription to database
        try {
          await this.saveSubscriptionToDatabase(response);
          console.log('Subscription saved to database successfully');
          // Show confirmation
          this.showConfirmation(response);
        } catch (error) {
          console.error('Error saving subscription:', error);
          // Show error modal instead of confirmation
          this.showError('Failed to save subscription', error.message || 'Database error occurred');
        }
      }

      async saveSubscriptionToDatabase(paymentResponse) {
        const subscriptionData = {
          userId: this.getUserId(),
          subscriptionSize: this.selectedSize,
          subscriptionDuration: this.selectedDuration,
          price: this.selectedPrice,
          location: {
            latitude: this.currentLocation?.lat || null,
            longitude: this.currentLocation?.lng || null
          },
          buildingDetails: this.buildingDetails,
          paymentDetails: {
            paymentId: paymentResponse.razorpay_payment_id || 'demo_payment',
            paymentStatus: 'completed',
            amount: this.selectedPrice
          },
          startDate: new Date().toISOString(),
          endDate: this.calculateEndDate(),
          status: 'active',
          createdAt: new Date().toISOString()
        };

        console.log('Saving subscription:', subscriptionData);

        try {
          const response = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscriptionData)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Subscription created successfully:', result);

          if (result.success) {
            this.subscriptionId = result.subscriptionId;
            return result;
          } else {
            throw new Error(result.message || 'Failed to create subscription');
          }
        } catch (error) {
          console.error('Failed to save subscription to database:', error);
          throw error;
        }
      }

      calculateEndDate() {
        const startDate = new Date();
        const endDate = new Date(startDate);

        if (this.selectedDuration === '6days') {
          endDate.setDate(startDate.getDate() + 7); // 6 + 1 free day
        } else {
          endDate.setDate(startDate.getDate() + 17); // 15 + 2 free days
        }

        return endDate.toISOString();
      }

      showConfirmation(paymentResponse) {
        // Update confirmation details
        document.getElementById('confirmationSubId').textContent =
          this.subscriptionId || paymentResponse.razorpay_payment_id || 'SUB' + Date.now();

        // Show confirmation modal
        document.getElementById('confirmation').classList.remove('hidden');
      }

      showError(title, message) {
        // Update error modal content
        document.getElementById('errorMessage').textContent = title;
        document.getElementById('errorDetails').textContent = message;

        // Show error modal
        document.getElementById('errorModal').classList.remove('hidden');
      }

      getUserId() {
        // In a real app, this would get the user ID from session/auth
        return 'demo_user_' + Date.now();
      }

      updateDebugInfo(message) {
        const debugElement = document.getElementById('mapDebug');
        if (debugElement) {
          debugElement.textContent = message;
        }
      }
    }

    new SubscriptionPage();
