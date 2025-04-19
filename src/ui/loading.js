import { DOM } from '../app/state';

// إنشاء عناصر مرة واحدة
const loadingContainer = document.createElement('div');
loadingContainer.className = 'loading-container';
loadingContainer.innerHTML = `
    <div class="loading-spinner" aria-hidden="true"></div>
    <p class="loader-text" aria-live="polite">Loading videos...</p>
`;

const errorContainer = document.createElement('div');
errorContainer.className = 'error-message';
errorContainer.setAttribute('role', 'alert');
errorContainer.innerHTML = `
    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
    <p class="error-text" aria-live="assertive"></p>
    <button class="retry-btn">Retry</button>
`;

// تهيئة مرة واحدة
errorContainer.querySelector('.retry-btn').addEventListener('click', () => {
    window.location.reload();
});

export function showLoading() {
    DOM.videoFeed.textContent = '';
    DOM.videoFeed.appendChild(loadingContainer.cloneNode(true));
}

export function showError(message) {
    const errorClone = errorContainer.cloneNode(true);
    errorClone.querySelector('.error-text').textContent = message;
    
    DOM.videoFeed.textContent = '';
    DOM.videoFeed.appendChild(errorClone);
}
