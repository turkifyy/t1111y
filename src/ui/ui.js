import { APP_STATE } from '../app/state';
import { VideoService } from '../videos/videos';
import { FollowService } from '../social/follow';
import { NotificationService } from '../notifications/notifications';
import { showToast } from './toast';

// UI State Manager
export class UIManager {
  static PAGE_TYPES = {
    HOME: 'home',
    PROFILE: 'profile',
    NOTIFICATIONS: 'notifications'
  };

  static async updateUIOnLogin() {
    try {
      // Update navigation
      this.toggleAuthUI(false);
      
      // Load data in parallel
      await Promise.all([
        FollowService.loadSuggestedChannels(),
        NotificationService.loadNotifications(),
        VideoService.loadPersonalizedVideos()
      ]);
      
      showToast(`Welcome back, ${APP_STATE.currentUser.name.split(' ')[0]}!`);
    } catch (error) {
      console.error('Login UI update failed:', error);
      showToast('Error updating UI', 'error');
    }
  }

  static updateUIOnLogout() {
    this.toggleAuthUI(true);
    VideoService.loadPublicVideos().catch(console.error);
    this.navigateTo(this.PAGE_TYPES.HOME);
  }

  static toggleAuthUI(showAuth) {
    APP_STATE.isAuthenticated = !showAuth;
    document.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: !showAuth }
    }));
  }

  static navigateTo(pageType) {
    if (!Object.values(this.PAGE_TYPES).includes(pageType)) {
      console.error('Invalid page type:', pageType);
      return;
    }

    // Update application state
    APP_STATE.currentPage = pageType;
    document.dispatchEvent(new CustomEvent('pageChanged', { 
      detail: { pageType }
    }));

    // Update active page
    document.querySelectorAll('[data-page]').forEach(el => {
      el.style.display = el.dataset.page === pageType ? 'block' : 'none';
    });

    // Update active nav items
    document.querySelectorAll('[data-nav-item]').forEach(el => {
      el.classList.toggle('active', el.dataset.navItem === pageType);
    });
  }

  // Initialize UI event listeners
  static initUIListeners() {
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-nav-item]');
      if (navItem) this.navigateTo(navItem.dataset.navItem);
    });

    document.addEventListener('authStateChanged', ({ detail }) => {
      document.getElementById('loginBtn').style.display = detail.isAuthenticated ? 'none' : 'flex';
      document.getElementById('accountBtn').style.display = detail.isAuthenticated ? 'flex' : 'none';
    });
  }
}

// Backward compatibility
export const updateUIAfterLogin = UIManager.updateUIOnLogin;
export const updateUIAfterLogout = UIManager.updateUIOnLogout;
export const showHomePage = () => UIManager.navigateTo(UIManager.PAGE_TYPES.HOME);
export const showProfilePage = () => UIManager.navigateTo(UIManager.PAGE_TYPES.PROFILE);
export const showNotificationsPage = () => UIManager.navigateTo(UIManager.PAGE_TYPES.NOTIFICATIONS);
