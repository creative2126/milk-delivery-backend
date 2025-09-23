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
        this.map = L.map('map').setView([17.385044, 78.486671], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

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
    }

    new SubscriptionPage();
