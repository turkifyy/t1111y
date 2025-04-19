import { firebase } from '../../firebase-config';
import { APP_STATE } from '../app/state';
import { checkAdminStatus } from './user';
import { updateUIAfterLogin, updateUIAfterLogout } from '../ui/ui';
import { showToast } from '../ui/toast';

// Validate user data
const validateUser = (user) => {
  if (!user?.uid) throw new Error('Invalid user data');
  return {
    id: user.uid,
    name: user.displayName || 'New User',
    email: user.email || '',
    avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
    verified: user.emailVerified || false
  };
};

// Initialize Auth State Listener with Lazy Loading
export async function initAuthStateListener() {
  try {
    const { onAuthStateChanged } = await import('firebase/auth');
    
    const unsubscribe = onAuthStateChanged(firebase.auth, async (user) => {
      try {
        if (user) {
          // Process login
          APP_STATE.currentUser = validateUser(user);
          
          // Critical initializations
          await Promise.all([
            checkAdminStatus(),
            loadEssentialUserData() // Basic profile data only
          ]);
          
          updateUIAfterLogin();
          showToast(`Welcome back, ${APP_STATE.currentUser.name.split(' ')[0]}!`, 'success');
          
          // Non-critical background loading
          setTimeout(() => {
            loadExtendedUserData().catch(console.error);
          }, 1000);
        } else {
          // Process logout
          APP_STATE.currentUser = null;
          APP_STATE.isAdmin = false;
          updateUIAfterLogout();
        }
      } catch (error) {
        console.error('Auth state processing error:', error);
        showToast('Session error. Please refresh.', 'error');
      }
    });

    return unsubscribe; // Return cleanup function
  } catch (error) {
    console.error('Auth initialization failed:', error);
    showToast('Authentication system error', 'error');
    throw error;
  }
}

// Basic user data (critical)
async function loadEssentialUserData() {
  // Minimal data needed for initial render
}

// Extended user data (non-critical)
async function loadExtendedUserData() {
  // Additional data that can load in background
      }
