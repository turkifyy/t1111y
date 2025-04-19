import { APP_STATE } from './state';
import { showToast } from '../ui/toast';

const INIT_STEPS = [
  {
    name: 'auth',
    handler: async () => (await import('../auth/auth')).initAuthStateListener(),
    critical: true
  },
  {
    name: 'network',
    handler: () => (import('../utils/network')).initNetworkMonitor()
  },
  {
    name: 'events',
    handler: () => (import('../main')).initEventListeners()
  },
  {
    name: 'service-worker',
    handler: () => (import('../utils/serviceWorker')).initServiceWorker()
  }
];

export async function initApp() {
  try {
    // Run critical initializations first
    await Promise.all(
      INIT_STEPS
        .filter(step => step.critical)
        .map(step => step.handler().catch(e => {
          console.error(`[Init] Failed on ${step.name}:`, e);
          throw e;
        }))
    );

    // Run non-critical initializations
    await Promise.allSettled(
      INIT_STEPS
        .filter(step => !step.critical)
        .map(step => step.handler()
          .catch(e => console.warn(`[Init] Non-critical ${step.name} failed:`, e))
    );

    // Load initial content
    const { loadPublicVideos, loadPersonalizedVideos } = await import('../videos/videos');
    APP_STATE.currentUser ? loadPersonalizedVideos() : loadPublicVideos();

  } catch (error) {
    console.error('App initialization failed:', error);
    showToast('Failed to initialize app. Please refresh.', 'error');
    
    // Emergency fallback
    if (!APP_STATE.currentUser) {
      (await import('../videos/videos')).loadPublicVideos();
    }
  }
}

// Optional: Add initialization lifecycle hooks
export function onInitComplete(callback) {
  const check = () => {
    if (document.readyState === 'complete') callback();
    else setTimeout(check, 100);
  };
  check();
        }
