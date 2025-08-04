
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  // Modal alert elements
  const modalAlert = document.getElementById('modalAlert');
  const modalMessage = document.getElementById('modalMessage');
  const modalClose = document.getElementById('modalClose');

  function showModalAlert(message) {
    modalMessage.textContent = message;
    modalAlert.classList.remove('hidden');
  }

  function hideModalAlert() {
    modalAlert.classList.add('hidden');
  }

  modalClose.addEventListener('click', hideModalAlert);
  modalAlert.addEventListener('click', (e) => {
    if (e.target === modalAlert) {
      hideModalAlert();
    }
  });

  // Hamburger menu toggle
  const hamburger = document.getElementById('hamburger');
  const navbarUl = document.querySelector('.navbar ul');

  if (hamburger && navbarUl) {
    hamburger.addEventListener('click', () => {
      navbarUl.classList.toggle('active');
    });
  }

  // Search input event (placeholder for future functionality)
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      // Implement search filtering logic here if needed
      console.log('Search input:', e.target.value);
    });
  }

  // Filter button click event (placeholder)
  const filterBtn = document.querySelector('.filter-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      showModalAlert('Filter options will be implemented here.');
    });
  }

  // Add to cart functionality for ADD buttons
  const addButtons = document.querySelectorAll('.add-btn');
  addButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      let product = null;
      const milkCard = e.target.closest('.milk-card');
      const offerCard = e.target.closest('.offer-card');

      if (milkCard) {
        const name = milkCard.querySelector('h4').textContent;
        const priceText = milkCard.querySelector('.price').textContent;
        const price = parseInt(priceText.replace('₹', ''));
        const image = milkCard.querySelector('img').src;
        
        product = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          price: price,
          image: image,
          size: '500 ml'
        };
      } else if (offerCard) {
        const name = offerCard.querySelector('h4').textContent;
        const priceText = offerCard.querySelector('.offer-price').textContent;
        const price = parseInt(priceText.replace('₹', ''));
        const image = offerCard.querySelector('img').src;
        product = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          price: price,
          image: image,
          size: 'Offer'
        };
      }

      if (product) {
        addToCart(product);
      }
    });
  });

  // Bottom navigation active state handling and profile click delegation
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('nav-item')) {
        e.preventDefault();
        // Remove active from all nav items
        bottomNav.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        // Add active to clicked nav item
        target.classList.add('active');

        if (target.textContent.trim() === 'Profile') {
          const loggedIn = localStorage.getItem('loggedIn') === 'true';
          if (loggedIn) {
            window.location.href = 'profile.html';
          } else {
            window.location.href = 'login.html';
          }
        } else {
          // For other nav items, allow default navigation
          window.location.href = target.getAttribute('href') || '#';
        }
      }
    });
  }

  // Logout button handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      const profileSection = document.getElementById('profileSection');
      if (profileSection) {
        profileSection.classList.add('hidden');
      }
      window.location.href = 'index.html';
    });
  }

  // On page load, check login state and show profile if logged
  const loggedIn = localStorage.getItem('loggedIn') === 'true';
  if (loggedIn) {
    const profileSection = document.getElementById('profileSection');
    if (profileSection) {
      profileSection.classList.remove('hidden');
      const userName = localStorage.getItem('userName') || 'User';
      const userEmail = localStorage.getItem('userEmail') || '';
      document.getElementById('profileName').textContent = userName;
      document.getElementById('profileEmail').textContent = userEmail;
    }
  }

  // Subscription page functionality
  const subscribeButtons = document.querySelectorAll('.subscribe-btn');
  const confirmation = document.getElementById('confirmation');
  const confirmText = document.getElementById('confirm-text');
  const closeConfirm = document.getElementById('close-confirm');

  // New elements for location modal
  const locationModal = document.getElementById('locationModal');
  const confirmLocationBtn = document.getElementById('confirmLocationBtn');
  const cancelLocationBtn = document.getElementById('cancelLocationBtn');
  let selectedSubscription = null;
  let selectedDuration = null;
  let map, marker;

  // Check if user has active subscription of same type before proceeding
async function checkExistingSubscription(subscriptionType) {
    const username = localStorage.getItem('userName');
    if (!username) {
      console.log('User not logged in - showing login notification');
      if (window.toast && window.toast.show) {
        console.log('Calling window.toast.show for login notification');
        window.toast.show('Please log in to subscribe', 'warning', 4000);
      } else {
        console.log('window.toast.show not available, using modal alert');
        showModalAlert('Please log in to subscribe');
      }
      return false;
    }

    try {
      const response = await fetch(`/api/subscriptions/user/${username}`);
      const data = await response.json();

      // Check for active subscriptions of the same type
      const activeSameType = data.subscriptions.filter(sub => 
        sub.subscription_type === subscriptionType && sub.status === 'active'
      );

      if (activeSameType.length > 0) {
        if (window.toast && window.toast.show) {
          window.toast.show(`You already have an active ${subscriptionType} subscription. You can manage it from your profile.`, 'warning', 5000);
        } else {
          showModalAlert(`You already have an active ${subscriptionType} subscription.`);
        }
        return false;
      }

      // Check for expired subscriptions of the same type
      const expiredSameType = data.subscriptions.filter(sub =>
        sub.subscription_type === subscriptionType && sub.is_expired
      );

      if (expiredSameType.length > 0) {
        if (window.toast && window.toast.show) {
          window.toast.show(`Your ${subscriptionType} subscription has expired. Please renew to continue service.`, 'info', 7000);
        } else {
          showModalAlert(`Your ${subscriptionType} subscription has expired. Please renew to continue service.`);
        }
        // Allow user to proceed with new subscription after expiration
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      if (window.toast && window.toast.show) {
        window.toast.show('Error checking subscription status. Please try again.', 'error', 4000);
      } else {
        showModalAlert('Error checking subscription status. Please try again.');
      }
      return false;
    }
  }

  subscribeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const selectedSubscriptionType = button.getAttribute('data-size');
      // Check for existing subscription before proceeding
      const canProceed = await checkExistingSubscription(selectedSubscriptionType);
      if (!canProceed) {
        return;
      }

      selectedSubscription = selectedSubscriptionType;
      selectedDuration = document.querySelector('input[name="duration"]:checked').value;
      // Show location modal
      locationModal.classList.remove('hidden');
      // Remove existing map instance if any to prevent duplicates
      if (map) {
        map.remove();
        map = null;
        marker = null;
      }
      // Create map container div if it doesn't exist
      let mapContainer = document.getElementById('map');
      if (!mapContainer) {
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        document.querySelector('#locationModal .modal-content').insertBefore(
          mapDiv, 
          document.querySelector('#locationModal .modal-content').children[1]
        );
        mapContainer = mapDiv;
      }
      // Initialize map
      map = L.map('map').setView([20.5937, 78.9629], 5); // Centered on India
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // Add geocoder control
      const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
      })
        .on('markgeocode', function(e) {
          const bbox = e.geocode.bbox;
          const center = e.geocode.center;
          map.fitBounds(bbox);
          if (marker) {
            marker.setLatLng(center);
          } else {
            marker = L.marker(center, {
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })
            }).addTo(map);
          }
          confirmLocationBtn.disabled = false;
        })
        .addTo(map);

      // Add current location button
      const locationButton = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.innerHTML = `
            <a class="leaflet-control-location" 
               style="background: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
               title="Use current location">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12" y2="16"></line>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </a>
          `;
          container.onclick = function() {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const lat = position.coords.latitude;
                  const lng = position.coords.longitude;
                  map.setView([lat, lng], 16);
                  if (marker) {
                    marker.setLatLng([lat, lng]);
                  } else {
                    marker = L.marker([lat, lng], {
                      icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      })
                    }).addTo(map);
                  }
                  confirmLocationBtn.disabled = false;
                },
                (error) => {
                  alert('Unable to get your location. Please select manually.');
                }
              );
            } else {
              alert('Geolocation is not supported by your browser');
            }
          };
          return container;
        }
      });
      map.addControl(new locationButton());

      // Attempt to detect user location and set map view and marker
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 16);
            if (marker) {
              marker.setLatLng([lat, lng]);
            } else {
              marker = L.marker([lat, lng], {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })
              }).addTo(map);
            }
            confirmLocationBtn.disabled = false;
          },
          (error) => {
            console.warn('Geolocation failed or denied:', error.message);
            // Keep default view if geolocation fails
          }
        );
      }

      map.on('click', function(e) {
        if (marker) {
          marker.setLatLng(e.latlng);
        } else {
          marker = L.marker(e.latlng, {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(map);
        }
        confirmLocationBtn.disabled = false;
      });
      // Ensure map is properly sized
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
  });
});

  async function getAddressFromLatLng(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      const data = await response.json();
      return data.display_name || 'Address not found';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Address not found';
    }
  }

  if (confirmLocationBtn) {
    confirmLocationBtn.addEventListener('click', async () => {
      if (marker) {
        const latlng = marker.getLatLng();
        const address = await getAddressFromLatLng(latlng.lat, latlng.lng);
        
        // Store location data for later use
        window.selectedLocation = {
          lat: latlng.lat,
          lng: latlng.lng,
          address: address
        };

        // Switch to building details slide
        document.getElementById('locationSlide').classList.add('hidden');
        document.getElementById('buildingSlide').classList.remove('hidden');
      }
    });
  }

  // Back button functionality
  const backToLocationBtn = document.getElementById('backToLocationBtn');
  backToLocationBtn.addEventListener('click', () => {
    document.getElementById('buildingSlide').classList.add('hidden');
    document.getElementById('locationSlide').classList.remove('hidden');
  });

  // Building details submission
  const submitBuildingFlatBtn = document.getElementById('submitBuildingFlatBtn');
  const paymentModal = document.getElementById('paymentModal');
  const proceedPaymentBtn = document.getElementById('proceedPaymentBtn');
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');

  submitBuildingFlatBtn.addEventListener('click', async () => {
    const buildingName = document.getElementById('buildingNameInput').value.trim();
    const flatNumber = document.getElementById('flatNumberInput').value.trim();
    const username = localStorage.getItem('userName');
    
    if (!username) {
      alert('Please log in to save address details');
      return;
    }
    
    if (!buildingName || !flatNumber) {
      alert('Please fill in both building name and flat number');
      return;
    }

    // Calculate total amount based on subscription and duration
    const priceElements = document.querySelectorAll('.price');
    let totalAmount = 0;
    const selectedDuration = document.querySelector('input[name="duration"]:checked').value;
    
    if (selectedSubscription === '500ml') {
      totalAmount = selectedDuration === '6days' ? 300 : 750;
    } else if (selectedSubscription === '1000ml') {
      totalAmount = selectedDuration === '6days' ? 540 : 1350;
    }

    // Store building details
    window.buildingDetails = {
      buildingName: buildingName,
      flatNumber: flatNumber
    };

    // Update payment summary
    document.getElementById('subscriptionSummary').textContent = 
      `${selectedSubscription} milk plan for ${selectedDuration}`;
    document.getElementById('locationSummary').textContent = 
      `Location: ${window.selectedLocation.address}`;
    document.getElementById('buildingSummary').textContent = 
      `Building: ${buildingName}, Flat: ${flatNumber}`;
    document.getElementById('totalAmount').textContent = `₹${totalAmount}`;

    // Hide location modal and show payment modal
    locationModal.classList.add('hidden');
    paymentModal.classList.remove('hidden');
  });

  // Payment processing
  proceedPaymentBtn.addEventListener('click', async () => {
    if (!selectedSubscription || !selectedDuration) {
      alert('Please select a subscription first.');
      return;
    }

    const username = localStorage.getItem('userName');
    const buildingName = window.buildingDetails.buildingName;
    const flatNumber = window.buildingDetails.flatNumber;
    const selectedDuration = document.querySelector('input[name="duration"]:checked').value;
    
    // Calculate final amount
    let finalAmount = 0;
    if (selectedSubscription === '500ml') {
      finalAmount = selectedDuration === '6days' ? 300 : 750;
    } else if (selectedSubscription === '1000ml') {
      finalAmount = selectedDuration === '6days' ? 540 : 1350;
    }

    // For demo purposes, open Razorpay directly without backend
    const options = {
      key: 'rzp_test_YGdTdLUZyBiD8P', // Updated with provided test key
      amount: finalAmount * 100, // amount in paise
      currency: 'INR',
      name: 'Fresh & Organic Milk',
      description: `Subscription for ${selectedSubscription} milk (${selectedDuration})`,
      handler: async function (response) {
        try {
          // Payment successful - get all required data
          const username = localStorage.getItem('userName');
          if (!username) {
            alert('Please log in to complete your subscription');
            return;
          }

          const buildingName = window.buildingDetails?.buildingName || 'N/A';
          const flatNumber = window.buildingDetails?.flatNumber || 'N/A';
          const selectedDuration = document.querySelector('input[name="duration"]:checked')?.value || '6days';
          
          // Calculate final amount
          let finalAmount = 0;
          if (selectedSubscription === '500ml') {
            finalAmount = selectedDuration === '6days' ? 300 : 750;
          } else if (selectedSubscription === '1000ml') {
            finalAmount = selectedDuration === '6days' ? 540 : 1350;
          }

          // Prepare location data
          const locationData = window.selectedLocation || {
            address: 'Address not provided',
            lat: 0,
            lng: 0
          };

          // Prepare subscription data to send to backend for verification and saving
          const subscriptionData = {
            username,
            subscription_type: selectedSubscription,
            duration: selectedDuration,
            amount: finalAmount,
            address: locationData.address,
            building_name: buildingName,
            flat_number: flatNumber,
            latitude: locationData.lat,
            longitude: locationData.lng,
            payment_id: response.razorpay_payment_id,
            timestamp: new Date().toISOString()
          };

          // Save subscription data to localStorage as backup
          localStorage.setItem('lastSubscription', JSON.stringify(subscriptionData));

          // Send subscription data to backend for verification and saving
          const saveResponse = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData)
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json();
            alert(`Subscription save failed: ${errorData.error || 'Unknown error'}`);
            return;
          }

          // Redirect to confirmation page with query params
          const redirectUrl = new URL('confirmation.html', window.location.origin);
          redirectUrl.searchParams.set('subscription', selectedSubscription);
          redirectUrl.searchParams.set('duration', selectedDuration);
          redirectUrl.searchParams.set('amount', finalAmount.toString());
          redirectUrl.searchParams.set('address', locationData.address);
          redirectUrl.searchParams.set('building', buildingName);
          redirectUrl.searchParams.set('flat', flatNumber);
          redirectUrl.searchParams.set('payment_id', response.razorpay_payment_id);

          window.location.href = redirectUrl.toString();

        } catch (error) {
          console.error('Payment handler error:', error);
          alert('Payment successful! Redirecting to confirmation page...');
          window.location.href = 'confirmation.html';
        }
      },
      // Remove prefill to avoid format issues
      // prefill: {
      //   name: 'John Doe',
      //   email: 'john.doe@example.com',
      //   contact: '9876543210'
      // },
      theme: {
        color: '#007bff'
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  });
  // Removed malformed and misplaced code causing syntax error

  cancelPaymentBtn.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    // Reset to location slide
    document.getElementById('buildingSlide').classList.add('hidden');
    document.getElementById('locationSlide').classList.remove('hidden');
  });

  if (cancelLocationBtn) {
    cancelLocationBtn.addEventListener('click', () => {
      locationModal.classList.add('hidden');
      confirmLocationBtn.disabled = true;
    });
  }

  if (closeConfirm) {
    closeConfirm.addEventListener('click', () => {
      confirmation.classList.add('hidden');
    });
  }

  // Subscription duration toggle and price update
  const durationRadios = document.querySelectorAll('input[name="duration"]');
  const priceElements = document.querySelectorAll('.price');

  function updatePrices(selectedDuration) {
    priceElements.forEach(priceEl => {
      const days6Price = priceEl.getAttribute('data-weekly') || 'N/A';
      const days15Price = priceEl.getAttribute('data-15days') || 'N/A';
      if (selectedDuration === '6days') {
        priceEl.textContent = `${days6Price} / 6 days`;
      } else if (selectedDuration === '15days') {
        priceEl.textContent = `${days15Price} / 15 days`;
      }
    });
  }

  durationRadios.forEach(radio => {
    radio.addEventListener('click', (e) => {
      console.log('Duration radio clicked:', e.target.value);
      updatePrices(e.target.value);
    });
  });

  // Initialize prices on page load
  const checkedRadio = document.querySelector('input[name="duration"]:checked');
  if (checkedRadio) {
    console.log('Initializing prices for:', checkedRadio.value);
    updatePrices(checkedRadio.value);
  }
});
