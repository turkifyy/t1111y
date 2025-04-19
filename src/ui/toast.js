import { DOM } from '../app/state';

// Toast Manager
export class ToastManager {
  static ICON_MAP = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  static queue = [];
  static isShowing = false;

  static show(message, type = 'info', duration = 5000) {
    this.queue.push({ message, type, duration });
    this.processQueue();
  }

  static processQueue() {
    if (this.isShowing || this.queue.length === 0) return;

    this.isShowing = true;
    const { message, type, duration } = this.queue.shift();
    const toast = this.createToast(message, type);

    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        this.isShowing = false;
        this.processQueue();
      }, 300);
    }, duration);
  }

  static createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Safe DOM construction
    const icon = document.createElement('i');
    icon.className = `fas ${this.ICON_MAP[type] || this.ICON_MAP.info}`;
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = message;

    toast.append(icon, text);
    return toast;
  }
}

// Backward compatibility
export const showToast = ToastManager.show;
