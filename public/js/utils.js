/**
 * utils.js - Utility Functions
 * Formatting, validation, notifications, and common helpers
 */

class Utils {
  /**
   * Format satoshis to readable currency
   */
  static formatSats(sats) {
    if (typeof sats !== 'number' || sats < 0) {
      return '0 sats';
    }

    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(8)} BTC`;
    }

    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(3)} mBTC`;
    }

    return `${sats.toLocaleString()} sats`;
  }

  /**
   * Parse satoshis from formatted string
   */
  static parseSats(value) {
    if (typeof value === 'number') {
      return value;
    }

    const str = String(value).trim().toLowerCase();

    // Remove commas
    const cleanValue = parseFloat(str.replace(/,/g, ''));

    if (str.includes('btc')) {
      return Math.round(cleanValue * 100000000);
    }

    if (str.includes('mbtc') || str.includes('m')) {
      return Math.round(cleanValue * 1000);
    }

    return Math.round(cleanValue);
  }

  /**
   * Format date to human-readable string
   */
  static formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== today.getFullYear()
          ? 'numeric'
          : undefined,
    });
  }

  /**
   * Format date and time
   */
  static formatDateTime(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }

    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  static getRelativeTime(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }

    const seconds = Math.floor(
      (new Date() - date) / 1000
    );

    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h ago`;
    }
    if (seconds < 604800) {
      const days = Math.floor(seconds / 86400);
      return `${days}d ago`;
    }

    return Utils.formatDate(date);
  }

  /**
   * Format duration in seconds to readable time
   */
  static formatDuration(seconds) {
    if (seconds <= 0) return '0s';

    const units = [
      { name: 'd', value: 86400 },
      { name: 'h', value: 3600 },
      { name: 'm', value: 60 },
      { name: 's', value: 1 },
    ];

    const parts = [];
    let remaining = seconds;

    for (const unit of units) {
      if (remaining >= unit.value) {
        parts.push(
          Math.floor(remaining / unit.value) + unit.name
        );
        remaining = remaining % unit.value;
      }
    }

    return parts.slice(0, 2).join(' ');
  }

  /**
   * Validate email
   */
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validate public key (hex format)
   */
  static isValidPubkey(pubkey) {
    return /^[a-f0-9]{64}$/.test(pubkey);
  }

  /**
   * Validate Lightning invoice
   */
  static isValidInvoice(invoice) {
    return /^ln/.test(invoice.toLowerCase());
  }

  /**
   * Validate URL
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  static throttle(func, limit) {
    let inThrottle;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Get from localStorage with fallback
   */
  static getStorage(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item);
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Set in localStorage
   */
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('[Utils] Storage write failed:', error);
      return false;
    }
  }

  /**
   * Remove from localStorage
   */
  static removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('[Utils] Storage remove failed:', error);
      return false;
    }
  }

  /**
   * Show toast notification
   */
  static showNotification(
    message,
    type = 'info',
    duration = 5000
  ) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.textContent = message;

    // Add to DOM
    const container =
      document.querySelector('.notification-container') ||
      this.createNotificationContainer();

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);

    return toast;
  }

  /**
   * Create notification container
   */
  static createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Show success notification
   */
  static showSuccess(message) {
    return Utils.showNotification(message, 'success');
  }

  /**
   * Show error notification
   */
  static showError(message) {
    return Utils.showNotification(message, 'error', 7000);
  }

  /**
   * Show info notification
   */
  static showInfo(message) {
    return Utils.showNotification(message, 'info');
  }

  /**
   * Show loading state on button
   */
  static setButtonLoading(button, loading = true) {
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      button.dataset.originalText = button.textContent;
      button.textContent = 'Loading...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }

  /**
   * Show confirmation dialog
   */
  static async showConfirmation(message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog';
      dialog.innerHTML = `
        <div class="confirmation-content">
          <p>${message}</p>
          <div class="confirmation-buttons">
            <button class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button class="btn btn-danger" data-action="confirm">Confirm</button>
          </div>
        </div>
      `;

      const container =
        document.querySelector('.dialog-container') ||
        Utils.createDialogContainer();

      container.appendChild(dialog);
      dialog.classList.add('show');

      const handleResult = (confirmed) => {
        dialog.classList.remove('show');
        setTimeout(() => {
          dialog.remove();
        }, 300);
        resolve(confirmed);
      };

      dialog
        .querySelector('[data-action="confirm"]')
        .addEventListener('click', () =>
          handleResult(true)
        );

      dialog
        .querySelector('[data-action="cancel"]')
        .addEventListener('click', () =>
          handleResult(false)
        );
    });
  }

  /**
   * Create dialog container
   */
  static createDialogContainer() {
    const container = document.createElement('div');
    container.className = 'dialog-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showSuccess('Copied to clipboard');
      return true;
    } catch (error) {
      console.error('[Utils] Copy failed:', error);
      Utils.showError('Failed to copy');
      return false;
    }
  }

  /**
   * Generate random ID
   */
  static generateId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Truncate string
   */
  static truncate(str, length = 50) {
    if (str.length <= length) return str;
    return str.substr(0, length) + '...';
  }

  /**
   * Truncate pubkey for display
   */
  static truncatePubkey(pubkey) {
    return `${pubkey.substr(0, 8)}...${pubkey.substr(-8)}`;
  }

  /**
   * Check online status
   */
  static isOnline() {
    return navigator.onLine;
  }

  /**
   * Get browser info
   */
  static getBrowserInfo() {
    const ua = navigator.userAgent;

    return {
      userAgent: ua,
      isMobile: /mobile/i.test(ua),
      isChrome: /chrome/i.test(ua),
      isFirefox: /firefox/i.test(ua),
      isSafari: /safari/i.test(ua) && !/chrome/i.test(ua),
    };
  }

  /**
   * Wait for condition to be true
   */
  static async waitFor(fn, timeout = 5000) {
    const startTime = Date.now();

    while (true) {
      if (fn()) {
        return true;
      }

      if (Date.now() - startTime > timeout) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
