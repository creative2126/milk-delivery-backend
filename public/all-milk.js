document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const milkList = document.getElementById('milkList');
  const backBtn = document.getElementById('backBtn');
  const filters = document.getElementById('filters');
  const bottomCartBar = document.getElementById('bottomCartBar');
  const cartSummary = document.getElementById('cartSummary');
  const proceedBtn = document.getElementById('proceedBtn');

  // Sample milk data for each type
  const milkData = {
    'full-cream': [
      { id: 1, name: 'Full cream milk', volume: '500 ml, 1 L Bottle', rating: 4.2, price: 27, image: 'images/bottle1.jpg' },
      { id: 2, name: ' Full cream milk', volume: '500 ml, 1 L Bottle', rating: 4.2, price: 35, image: 'images/bottle1.jpg' },
      { id: 3, name: ' Full cream milk', volume: '500 ml, 1 L Bottle', rating: 4.2, price: 37, image: 'images/bottle1.jpg' },
      { id: 4, name: ' Full cream milk', volume: '500 ml, 1 L Bottle', rating: 4.2, price: 42, image: 'images/bottle1.jpg' },
      { id: 5, name: ' Full cream milk', volume: '500 ml, 1 L Bottle', rating: 4.2, price: 27, image: 'images/bottle1.jpg' }
    ],
    'toned': [
      { id: 6, name: 'Rogaz- Toned milk', volume: '500 ml, 1 L Bottle', rating: 4.0, price: 25, image: 'images/bottle1.jpg'},
      { id: 7, name: 'Amul- Toned milk', volume: '500 ml, 1 L Bottle', rating: 4.1, price: 30, image: 'images/bottle1.jpg'}
    ],
    'cow': [
      { id: 8, name: 'Rogaz- Cow milk', volume: '500 ml, 1 L Bottle', rating: 4.3, price: 40, image: 'images/bottle1.jpg' }
    ],
    'tetra': [
      { id: 9, name: 'Rogaz- Tetra milk', volume: '500 ml, 1 L Bottle', rating: 4.5, price: 50, image: 'images/bottle1.jpg' }
    ]
  };

  let currentType = 'full-cream';
  let cart = {};

  function renderMilkList(type) {
    milkList.innerHTML = '';
    const items = milkData[type] || [];
    items.forEach(item => {
      const milkItem = document.createElement('div');
      milkItem.className = 'milk-item';

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;

      const info = document.createElement('div');
      info.className = 'milk-info';

      const title = document.createElement('h4');
      title.textContent = item.name;

      const volume = document.createElement('p');
      volume.textContent = item.volume;

      const priceRating = document.createElement('div');
      priceRating.className = 'price-rating';

      const price = document.createElement('span');
      price.className = 'price';
      price.textContent = `₹${item.price}`;

      const rating = document.createElement('span');
      rating.className = 'rating';
      rating.textContent = '⭐'.repeat(Math.round(item.rating));

      priceRating.appendChild(price);
      priceRating.appendChild(rating);

      info.appendChild(title);
      info.appendChild(volume);
      info.appendChild(priceRating);

      milkItem.appendChild(img);
      milkItem.appendChild(info);

      // Add button or quantity controls
      if (cart[item.id]) {
        const qtyControls = createQtyControls(item.id);
        milkItem.appendChild(qtyControls);
      } else {
        const addBtn = document.createElement('button');
        addBtn.className = 'add-btn';
        addBtn.textContent = 'ADD +';
        addBtn.addEventListener('click', () => {
          cart[item.id] = 1;
          updateCartBar();
          renderMilkList(currentType);
        });
        milkItem.appendChild(addBtn);
      }

      milkList.appendChild(milkItem);
    });
  }

  function createQtyControls(id) {
    const container = document.createElement('div');
    container.className = 'qty-controls';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'qty-btn';
    minusBtn.textContent = '-';
    minusBtn.addEventListener('click', () => {
      if (cart[id] > 1) {
        cart[id]--;
      } else {
        delete cart[id];
      }
      updateCartBar();
      renderMilkList(currentType);
    });

    const qtyDisplay = document.createElement('div');
    qtyDisplay.className = 'qty-display';
    qtyDisplay.textContent = cart[id];

    const plusBtn = document.createElement('button');
    plusBtn.className = 'qty-btn';
    plusBtn.textContent = '+';
    plusBtn.addEventListener('click', () => {
      cart[id]++;
      updateCartBar();
      renderMilkList(currentType);
    });

    container.appendChild(minusBtn);
    container.appendChild(qtyDisplay);
    container.appendChild(plusBtn);

    return container;
  }

  function updateCartBar() {
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
    if (itemCount > 0) {
      bottomCartBar.style.display = 'flex';
      let totalPrice = 0;
      for (const id in cart) {
        const item = Object.values(milkData).flat().find(i => i.id == id);
        if (item) {
          totalPrice += item.price * cart[id];
        }
      }
      cartSummary.textContent = `${itemCount} ITEM${itemCount > 1 ? 'S' : ''} ₹${totalPrice} (plus taxes)`;
    } else {
      bottomCartBar.style.display = 'none';
    }
  }

  // Save cart to localStorage for integration with main cart system
  function saveCartToLocalStorage() {
    const cartItems = [];
    for (const id in cart) {
      const item = Object.values(milkData).flat().find(i => i.id == id);
      if (item) {
        cartItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: cart[id],
          size: item.volume
        });
      }
    }
    localStorage.setItem('milkCart', JSON.stringify(cartItems));
  }

  // Tab click handler
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.getAttribute('data-type');
      renderMilkList(currentType);
    });
  });

  // Back button handler
  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  // Filters click handler (placeholder)
  filters.addEventListener('click', () => {
    showModalAlert('Filter options will be implemented here.');
  });

  // Proceed to cart click handler - now navigates to actual cart page
  proceedBtn.addEventListener('click', () => {
    saveCartToLocalStorage();
    window.location.href = 'cart.html';
  });

  // Helper function for modal alerts
  function showModalAlert(message) {
    alert(message);
  }

  // Initial render
  renderMilkList(currentType);
  updateCartBar();
});
