import { DOM } from '../app/state';
import { showToast } from './toast';
import { APP_STATE } from '../app/state';

let listenersAdded = false;

export function showAuthModal() {
    DOM.authModal.classList.add('active');
}

export function setupModalEventListeners() {
    if (listenersAdded) return;
    listenersAdded = true;

    // Google login
    DOM.googleLogin.addEventListener('click', async () => {
        try {
            const provider = new firebase.GoogleAuthProvider();
            const result = await firebase.signInWithPopup(firebase.auth, provider);
            APP_STATE.currentUser = result.user;
            showToast('Login successful', 'success');
            DOM.authModal.classList.remove('active');
        } catch (error) {
            console.error('Google login error:', error);
            showToast('Google login failed', 'error');
        }
    });
    
    // Logout button
    DOM.logoutBtn.addEventListener('click', async () => {
        try {
            await firebase.signOut(firebase.auth);
            APP_STATE.currentUser = null;
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error logging out', 'error');
        }
    });
}
