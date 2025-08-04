document.addEventListener('DOMContentLoaded', () => {
  console.log('Cart page loaded');
  
  // Cart functionality
  let cart = JSON.parse(localStorage.getItem('milkCart')) || [];
  
  // DOM elements
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartSummary = document.getElementById('cart-summary');
  const subtotalElement = document.getElementById('subtotal');
  const totalElement = document.getElementById('total');
  
  // Initialize cart
  loadAllMilkCart();
  renderCart();
  
  function renderCart() {
    if (cart.length === 0) {
      showEmptyCart();
      return;
    }
    
    hideEmptyCart();
    displayCartItems();
    updateCartSummary();
  }
  
  function showEmptyCart() {
    const emptyMessage = document.querySelector('.empty-cart-message');
    if (emptyMessage) {
      emptyMessage.style.display = 'block';
    }
    cartSummary.style.display = 'none';
  }
  
  function hideEmptyCart() {
    const emptyMessage = document.querySelector('.empty-cart-message');
    if (emptyMessage) {
      emptyMessage.style.display = 'none';
    }
    cartSummary.style.display = 'block';
  }
  
  function displayCartItems() {
    cartItemsContainer.innerHTML = '';
    
    cart.forEach((item, index) => {
      const cartItemElement = createCartItemElement(item, index);
      cartItemsContainer.appendChild(cartItemElement);
    });
    
    updateCartCount();
  }
  
  function createCartItemElement(item, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.image || 'images/fresh-milk.jpg'}" alt="${item.name}" />
      </div>
      <div class="cart-item-details">
        <h4>${item.name}</h4>
        <p>${item.size || '500 ml'}</p>
        <span class="cart-item-price">₹${item.price}</span>
      </div>
      <div class="cart-item-controls">
        <button class="quantity-btn" onclick="decreaseQuantity(${index})">-</button>
        <span class="quantity">${item.quantity || 1}</span>
        <button class="quantity-btn" onclick="increaseQuantity(${index})">+</button>
        <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
      </div>
    `;
    return itemDiv;
  }
  
  function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const deliveryFee = 20;
    const total = subtotal + deliveryFee;
    
    subtotalElement.textContent = `₹${subtotal}`;
    totalElement.textContent = `₹${total}`;
  }
  
  function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
    
    // Update cart count in navigation
    const navCartCount = document.querySelector('.nav-item[href="cart.html"]');
    if (navCartCount) {
      const existingBadge = navCartCount.querySelector('.cart-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      if (totalItems > 0) {
        const badge = document.createElement('span');
        badge.className = 'cart-badge';
        badge.textContent = totalItems;
        navCartCount.appendChild(badge);
      }
    }
  }
  
  // Global functions for cart operations
  window.increaseQuantity = function(index) {
    cart[index].quantity = (cart[index].quantity || 1) + 1;
    saveCart();
    renderCart();
  };
  
  window.decreaseQuantity = function(index) {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      removeFromCart(index);
      return;
    }
    saveCart();
    renderCart();
  };
  
  window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
  };
  
  function saveCart() {
    localStorage.setItem('milkCart', JSON.stringify(cart));
  }
  
  // Load cart from all-milk page
  function loadAllMilkCart() {
    const allMilkCart = localStorage.getItem('milkCart');
    if (allMilkCart) {
      const allMilkItems = JSON.parse(allMilkCart);
      // Merge with existing cart
      allMilkItems.forEach(item => {
        const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
        if (existingItemIndex !== -1) {
          cart[existingItemIndex].quantity += item.quantity;
        } else {
          cart.push(item);
        }
      });
      localStorage.setItem('milkCart', JSON.stringify(cart));
      localStorage.removeItem('milkCart'); // Clear all-milk cart after merging
    }
  }
  
  // Checkout functionality
  window.proceedToCheckout = function() {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    
    // Check if user is logged in
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    if (!loggedIn) {
      alert('Please log in to proceed with checkout');
      window.location.href = 'login.html';
      return;
    }
    
    // Proceed to checkout
    alert('Proceeding to checkout...');
    // Here you would typically redirect to a checkout page
    // For now, we'll just clear the cart
    cart = [];
    saveCart();
    renderCart();
  };
  
  // Add to cart functionality (for other pages)
  window.addToCart = function(product) {
    const existingItemIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({
        ...product,
        quantity: 1
      });
    }
    
    saveCart();
    updateCartCount();
    
    // Show confirmation
    showToast(`${product.name} added to cart!`);
  };
  
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
});
