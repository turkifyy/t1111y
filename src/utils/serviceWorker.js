import { APP_CONFIG } from '../app/config';
import { showToast } from '../ui/toast';

// Service Worker Manager
export class ServiceWorkerManager {
    static async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            });

            console.log('Service Worker registered:', registration);
            this.monitorUpdates(registration);
            
            if (APP_CONFIG.onesignalAppId) {
                await this.initPushNotifications(registration);
            }

            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            showToast('Offline functionality limited', 'warning');
            return false;
        }
    }

    static monitorUpdates(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    showToast('New version available', 'info');
                }
            });
        });
    }

    static async initPushNotifications(swRegistration) {
        if (!window.OneSignal || !APP_STATE.currentUser?.id) return;

        try {
            await OneSignal.init({
                appId: APP_CONFIG.onesignalAppId,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: 'OneSignalSDKWorker.js',
                serviceWorkerParam: { scope: '/' },
                notifyButton: { enable: false }
            });

            await OneSignal.setExternalUserId(APP_STATE.currentUser.id);
            console.log('Push notifications initialized');
        } catch (error) {
            console.error('Push notifications failed:', error);
        }
    }
}

// Backward compatibility
export const initServiceWorker = ServiceWorkerManager.init;
