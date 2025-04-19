import { firebase } from '../firebase-config';
import { APP_CONFIG } from './app/config';
import { showToast } from './ui/toast';
import { initApp } from './app/init';

// Application Bootstrap
class AppBootstrapper {
    static MIN_LOAD_TIME = 1000; // Minimum loading screen time

    static async initialize() {
        const loadStart = performance.now();
        
        try {
            await this.initFirebase();
            await this.checkPrerequisites();
            await this.showLoadingScreen();
            
            await initApp();
            
            // Ensure minimum loading time
            const loadTime = performance.now() - loadStart;
            if (loadTime < this.MIN_LOAD_TIME) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.MIN_LOAD_TIME - loadTime));
            }
        } catch (error) {
            console.error('Application bootstrap failed:', error);
            this.showFatalError();
        } finally {
            this.hideLoadingScreen();
        }
    }

    static async initFirebase() {
        try {
            const firebaseConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID
            };

            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw new Error('FIREBASE_INIT_FAILED');
        }
    }

    static async checkPrerequisites() {
        if (!('indexedDB' in window)) {
            throw new Error('INDEXEDDB_UNSUPPORTED');
        }
        
        if (!('fetch' in window)) {
            throw new Error('FETCH_UNSUPPORTED');
        }
    }

    static async showLoadingScreen() {
        document.getElementById('app-loader').style.display = 'flex';
    }

    static hideLoadingScreen() {
        document.getElementById('app-loader').style.display = 'none';
    }

    static showFatalError() {
        document.getElementById('app-content').style.display = 'none';
        document.getElementById('app-error').style.display = 'block';
        showToast('Application failed to load', 'error');
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AppBootstrapper.initialize().catch(console.error);
});
