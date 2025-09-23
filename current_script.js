class SubscriptionPage {
      constructor() {
        this.map = null;
        this.marker = null;
        this.currentLocation = null;
        this.init();
      }

      init() {
        document.querySelectorAll('.subscribe-btn').forEach(btn => {
          btn.addEventListener('click', () => this.showLocationModal());
        });

        document.getElementById('closeLocationModal').addEventListener('click', () => {
          document.getElementById('locationModal').classList.add('hidden');
        });

        document.getElementById('cancelLocationBtn').addEventListener('click', () => {
          document.getElementById('locationModal').classList.add('hidden');
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

      updateDebugInfo(message) {
        const debugElement = document.getElementById('mapDebug');
        if (debugElement) {
          debugElement.textContent = message;
        }
      }
    }

    new SubscriptionPage();
