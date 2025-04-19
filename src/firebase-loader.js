// src/utils/firebase-loader.js
/**
 * Firebase Loader Utility
 * 
 * Handles:
 * - Asynchronous Firebase SDK loading
 * - Environment validation
 * - Multiple initialization attempts
 * - Error recovery
 */

const FIREBASE_SDK_VERSION = '10.7.1';

class FirebaseLoader {
  static #initialized = false;
  static #initializationPromise = null;
  static #services = {};

  /**
   * Initialize Firebase services
   * @param {Object} config - Firebase config object
   * @returns {Promise<{auth: Auth, db: Firestore, storage: Storage}>}
   */
  static async initialize(config) {
    if (this.#initialized) {
      return this.#services;
    }

    if (!this.#initializationPromise) {
      this.#initializationPromise = this.#initializeFirebase(config);
    }

    return this.#initializationPromise;
  }

  static async #initializeFirebase(config) {
    try {
      if (!config || !config.apiKey) {
        throw new Error('Invalid Firebase configuration');
      }

      // Dynamically load Firebase SDKs
      await this.#loadFirebaseSDKs();

      // Initialize Firebase
      const app = window.firebase.initializeApp(config);
      
      // Initialize services
      this.#services = {
        auth: window.firebase.auth(app),
        db: window.firebase.firestore(app),
        storage: window.firebase.storage(app),
        functions: window.firebase.functions(app),
        analytics: window.firebase.analytics(app)
      };

      // Settings for Firestore
      if (import.meta.env.DEV) {
        this.#services.db.settings({
          experimentalForceLongPolling: true,
          merge: true
        });
        this.#services.db.useEmulator('localhost', 8080);
        this.#services.auth.useEmulator('http://localhost:9099');
      }

      this.#initialized = true;
      return this.#services;

    } catch (error) {
      console.error('Firebase initialization failed:', error);
      this.#initializationPromise = null; // Allow retry
      throw error;
    }
  }

  /**
   * Dynamically loads Firebase SDK modules
   */
  static async #loadFirebaseSDKs() {
    if (window.firebase) return;

    const corePromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );

    const authPromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
    );

    const firestorePromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
    );

    const storagePromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`
    );

    const functionsPromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`
    );

    const analyticsPromise = this.#loadScript(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-analytics.js`
    );

    await Promise.all([
      corePromise,
      authPromise,
      firestorePromise,
      storagePromise,
      functionsPromise,
      analyticsPromise
    ]);
  }

  /**
   * Helper to load scripts with retries
   */
  static #loadScript(src, retries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      const attempt = (n) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
          if (n <= 1) {
            reject(new Error(`Failed to load script: ${src}`));
          } else {
            setTimeout(() => attempt(n - 1), delay);
          }
        };
        document.head.appendChild(script);
      };
      attempt(retries);
    });
  }

  /**
   * Get initialized Firebase services
   * @throws {Error} If Firebase not initialized
   */
  static getServices() {
    if (!this.#initialized) {
      throw new Error('Firebase not initialized. Call initialize() first');
    }
    return this.#services;
  }
}

export default FirebaseLoader;
