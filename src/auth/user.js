import { firebase } from '../../firebase-config';
import { APP_STATE } from '../app/state';
import { showToast } from '../ui/toast';

// User Repository Pattern
const UserRepository = {
  async getUserDoc(userId) {
    const docRef = firebase.doc(firebase.db, 'users', userId);
    const docSnap = await firebase.getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async createUserProfile(userData) {
    const batch = firebase.writeBatch(firebase.db);
    const userRef = firebase.doc(firebase.db, 'users', userData.id);
    
    batch.set(userRef, {
      ...userData,
      createdAt: firebase.serverTimestamp(),
      isAdmin: false,
      isCreator: false,
      verified: false,
      followers: 0,
      lastActive: firebase.serverTimestamp()
    });
    
    // Create subcollections in same batch
    batch.set(firebase.doc(userRef, 'metadata', 'preferences'), {
      theme: 'dark',
      notifications: true
    });
    
    await batch.commit();
    return userRef;
  },

  async getLikedVideos(userId) {
    const q = firebase.query(
      firebase.collectionGroup(firebase.db, 'likes'),
      firebase.where('userId', '==', userId),
      firebase.limit(100) // Safety limit
    );
    const snapshot = await firebase.getDocs(q);
    return snapshot.docs.map(doc => doc.ref.parent.parent.id);
  },

  async getFollowingChannels(userId) {
    const q = firebase.query(
      firebase.collection(firebase.db, 'users', userId, 'following'),
      firebase.limit(500) // Safety limit
    );
    const snapshot = await firebase.getDocs(q);
    return snapshot.docs.map(doc => doc.id);
  }
};

// User Service
export const UserService = {
  async checkAdminStatus() {
    if (!APP_STATE.currentUser) return;
    
    try {
      const userDoc = await UserRepository.getUserDoc(APP_STATE.currentUser.id);
      APP_STATE.isAdmin = userDoc?.isAdmin || false;
      
      // Update UI if DOM is available
      if (typeof document !== 'undefined') {
        const robotBtn = document.getElementById('robotControlBtn');
        if (robotBtn) robotBtn.style.display = APP_STATE.isAdmin ? 'flex' : 'none';
      }
    } catch (error) {
      console.error('Admin check failed:', error);
      throw error;
    }
  },

  async initializeUserProfile() {
    if (!APP_STATE.currentUser) return;
    
    try {
      const userDoc = await UserRepository.getUserDoc(APP_STATE.currentUser.id);
      
      if (!userDoc) {
        await UserRepository.createUserProfile(APP_STATE.currentUser);
        showToast('Profile created! Customize your settings', 'success');
      }
      
      // Parallel loading
      const [likedVideos, following] = await Promise.all([
        UserRepository.getLikedVideos(APP_STATE.currentUser.id),
        UserRepository.getFollowingChannels(APP_STATE.currentUser.id)
      ]);
      
      APP_STATE.likedVideos = likedVideos;
      APP_STATE.followingChannels = following;
      
    } catch (error) {
      console.error('User initialization failed:', error);
      showToast('Error loading profile data', 'error');
      throw error;
    }
  }
};

// Backward compatibility
export const checkAdminStatus = UserService.checkAdminStatus;
export const loadUserData = UserService.initializeUserProfile;
