// Enhanced Interactive Map for Address Selection
class InteractiveAddressSelector {
  constructor(mapContainerId, options = {}) {
    this.mapContainer = document.getElementById(mapContainerId);
    this.map = null;
    this.marker = null;
    this.geocoder = null;
    this.currentLocation = null;
    this.searchInput = null;
    this.suggestions = [];
    
    this.options = {
      defaultZoom: 15,
      enableSearch: true,
      enableCurrentLocation: true,
      enableClickToSelect: true,
      showAddressPreview: true,
      ...options
    };
    
    this.init();
  }

  init() {
    this.createMapContainer();
    this.initializeMap();
    this.addControls();
    this.bindEvents();
  }

  createMapContainer() {
    // Create enhanced map container with search on top and locate button on map
    const mapWrapper = document.createElement('div');
    mapWrapper.className = 'map-wrapper';
    mapWrapper.innerHTML = `
      <div class="map-container">
        <!-- Search bar positioned above the map -->
        <div class="search-overlay">
          <div class="search-container">
            <input type="text" id="addressSearch" placeholder="Search for address..." class="address-search">
            <div id="searchSuggestions" class="search-suggestions hidden"></div>
          </div>
        </div>
        
        <!-- Map container -->
        <div id="interactiveMap" class="interactive-map"></div>
        
        <!-- Locate button positioned on the map -->
        <button id="useCurrentLocation" class="locate-on-map-btn" title="Use current location">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
        </button>
        
        <!-- Address display below map -->
        <div class="address-display">
          <div class="address-card">
            <div class="address-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="address-content">
              <h4>Selected Location</h4>
              <p id="selectedAddress">Click on map or search for address</p>
              <div class="coordinates">
                <span>📍 <span id="selectedLat">--</span>, <span id="selectedLng">--</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.mapContainer.appendChild(mapWrapper);
  }

  initializeMap() {
    // Initialize Leaflet map
    this.map = L.map('interactiveMap').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add geocoder control
    this.geocoder = L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
        countrycodes: 'in',
        addressdetails: 1
      }
    });

    // Add scale control
    L.control.scale().addTo(this.map);
  }

  addControls() {
    // Add custom controls
    this.addSearchControl();
    this.addLocationButton();
    this.addClickHandler();
  }

  addSearchControl() {
    const searchInput = document.getElementById('addressSearch');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchAddress(e.target.value);
      }
    });
  }

  addLocationButton() {
    const locationBtn = document.getElementById('useCurrentLocation');
    locationBtn.addEventListener('click', () => {
      this.getCurrentLocation();
    });
  }

  addClickHandler() {
    this.map.on('click', (e) => {
      this.selectLocation(e.latlng);
    });
  }

  async handleSearchInput(query) {
    if (query.length < 3) {
      this.hideSuggestions();
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      );
      const results = await response.json();
      this.displaySuggestions(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  displaySuggestions(results) {
    const container = document.getElementById('searchSuggestions');
    container.innerHTML = '';
    
    if (results.length === 0) {
      this.hideSuggestions();
      return;
    }

    results.forEach(result => {
      const suggestion = document.createElement('div');
      suggestion.className = 'suggestion-item';
      suggestion.textContent = result.display_name;
      suggestion.addEventListener('click', () => {
        this.selectLocation([parseFloat(result.lat), parseFloat(result.lon)]);
        this.hideSuggestions();
      });
      container.appendChild(suggestion);
    });

    container.classList.remove('hidden');
  }

  hideSuggestions() {
    document.getElementById('searchSuggestions').classList.add('hidden');
  }

  async searchAddress(address) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`
      );
      const results = await response.json();
      
      if (results.length > 0) {
        this.selectLocation([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
      }
    } catch (error) {
      console.error('Address search error:', error);
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const locationBtn = document.getElementById('useCurrentLocation');
    locationBtn.disabled = true;
    locationBtn.innerHTML = '<div class="spinner"></div>';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.selectLocation([lat, lng]);
        this.reverseGeocode(lat, lng);
        locationBtn.disabled = false;
        locationBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
        `;
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location');
        locationBtn.disabled = false;
        locationBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
        `;
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  selectLocation(latlng) {
    this.map.setView(latlng, 17);
    
    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, {
        draggable: true,
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(this.map);
      
      this.marker.on('dragend', (e) => {
        this.reverseGeocode(e.target.getLatLng().lat, e.target.getLatLng().lng);
      });
    }
    
    this.reverseGeocode(latlng[0], latlng[1]);
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      
      const address = data.display_name || 'Address not found';
      this.updateAddressPreview(address, lat, lng);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      this.updateAddressPreview('Address not available', lat, lng);
    }
  }

  updateAddressPreview(address, lat, lng) {
    const preview = document.getElementById('addressPreview');
    const addressText = document.getElementById('selectedAddress');
    const latText = document.getElementById('selectedLat');
    const lngText = document.getElementById('selectedLng');
    
    addressText.textContent = address;
    latText.textContent = lat.toFixed(6);
    lngText.textContent = lng.toFixed(6);
    
    preview.classList.remove('hidden');
    
    // Enable confirm button
    if (window.confirmLocationBtn) {
      window.confirmLocationBtn.disabled = false;
    }
  }

  getSelectedLocation() {
    if (!this.marker) return null;
    
    const latlng = this.marker.getLatLng();
    return {
      lat: latlng.lat,
      lng: latlng.lng,
      address: document.getElementById('selectedAddress')?.textContent || ''
    };
  }
}

// Enhanced subscription functionality
function enhanceSubscriptionPage() {
  // Add CSS for enhanced map
  const style = document.createElement('style');
  style.textContent = `
    .map-wrapper {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .map-controls {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    
    .search-container {
      flex: 1;
      position: relative;
    }
    
    .address-search {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      font-size: 14px;
    }
    
    .location-btn {
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s;
    }
    
    .location-btn:hover {
      background: #45a049;
    }
    
    .location-btn:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }
    
    .search-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1001;
    }
    
    .suggestion-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .suggestion-item:hover {
      background: #f8f9fa;
    }
    
    .suggestion-item:last-child {
      border-bottom: none;
    }
    
    .address-preview {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-top: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .address-preview h4 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 14px;
    }
    
    .address-preview p {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #666;
    }
    
    .coordinates {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #888;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Initialize enhanced map when subscription page loads
  if (window.location.pathname.includes('subscription.html')) {
    const mapContainer = document.getElementById('locationModal');
    if (mapContainer) {
      const mapSelector = new InteractiveAddressSelector('locationModal');
      window.addressSelector = mapSelector;
    }
  }
}

// Initialize enhanced functionality
document.addEventListener('DOMContentLoaded', enhanceSubscriptionPage);
