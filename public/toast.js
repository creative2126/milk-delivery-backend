class Toast {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '20px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '9999';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.minWidth = '200px';
    toast.style.marginBottom = '10px';
    toast.style.padding = '12px 20px';
    toast.style.color = '#fff';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    toast.style.opacity = '0.9';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9em';
    toast.style.cursor = 'pointer';
    toast.style.transition = 'opacity 0.3s ease';

    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#28a745';
        break;
      case 'error':
        toast.style.backgroundColor = '#dc3545';
        break;
      case 'warning':
        toast.style.backgroundColor = '#ffc107';
        toast.style.color = '#212529';
        break;
      default:
        toast.style.backgroundColor = '#17a2b8';
    }

    toast.addEventListener('click', () => {
      this.container.removeChild(toast);
    });

    this.container.appendChild(toast);

    setTimeout(() => {
      if (this.container.contains(toast)) {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (this.container.contains(toast)) {
            this.container.removeChild(toast);
          }
        }, 300);
      }
    }, duration);
  }
}

window.toast = new Toast();
