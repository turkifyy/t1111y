import { firebase } from '../../../firebase-config';
import { APP_STATE } from '../app/state';
import { showToast } from '../ui/toast';
import { showAuthModal } from '../ui/modals';
import { formatNumber } from '../utils/helpers';

// Follow Service
export class FollowService {
  static PENDING_FOLLOWS = new Set();

  static async loadSuggestedChannels() {
    try {
      const q = firebase.query(
        firebase.collection(firebase.db, 'users'),
        firebase.where('isCreator', '==', true),
        firebase.orderBy('followers', 'desc'),
        firebase.limit(10)
      );

      const snapshot = await firebase.getDocs(q);
      if (snapshot.empty) return [];

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isFollowing: APP_STATE.followingChannels.includes(doc.id)
      }));
    } catch (error) {
      console.error('Failed loading channels:', error);
      showToast('Failed to load channels', 'error');
      return [];
    }
  }

  static async toggleFollow(userId, userData = {}) {
    if (!APP_STATE.currentUser) {
      showAuthModal();
      return false;
    }

    if (this.PENDING_FOLLOWS.has(userId)) return false;
    this.PENDING_FOLLOWS.add(userId);

    try {
      const isFollowing = APP_STATE.followingChannels.includes(userId);
      await (isFollowing ? this.unfollowUser(userId) : this.followUser(userId, userData));
      
      document.dispatchEvent(new CustomEvent('followToggled', {
        detail: { userId, isFollowing: !isFollowing, userData }
      }));
      
      return true;
    } catch (error) {
      console.error('Follow action failed:', error);
      showToast('Failed to process follow', 'error');
      return false;
    } finally {
      this.PENDING_FOLLOWS.delete(userId);
    }
  }

  static async followUser(userId, { name = 'Unknown' } = {}) {
    const batch = firebase.writeBatch(firebase.db);
    const followRef = this.getFollowRef(userId);
    const userRef = this.getUserRef(userId);

    batch.set(followRef, {
      followerId: APP_STATE.currentUser.id,
      followerName: APP_STATE.currentUser.name,
      followedAt: firebase.serverTimestamp()
    });
    batch.update(userRef, {
      followers: firebase.increment(1)
    });

    await batch.commit();
    APP_STATE.followingChannels.push(userId);
    showToast(`Followed ${name}`, 'success');
  }

  static async unfollowUser(userId, { name = 'Unknown' } = {}) {
    const batch = firebase.writeBatch(firebase.db);
    const followRef = this.getFollowRef(userId);
    const userRef = this.getUserRef(userId);

    batch.delete(followRef);
    batch.update(userRef, {
      followers: firebase.increment(-1)
    });

    await batch.commit();
    APP_STATE.followingChannels = APP_STATE.followingChannels.filter(id => id !== userId);
    showToast(`Unfollowed ${name}`, 'info');
  }

  static getFollowRef(userId) {
    return firebase.doc(
      firebase.collection(firebase.db, 'users', userId, 'followers'),
      APP_STATE.currentUser.id
    );
  }

  static getUserRef(userId) {
    return firebase.doc(firebase.db, 'users', userId);
  }

  static initFollowListeners() {
    document.addEventListener('followToggled', ({ detail }) => {
      const { userId, isFollowing, userData } = detail;
      
      // Update all follow buttons
      document.querySelectorAll(`[data-user-id="${userId}"], [data-channel-id="${userId}"]`).forEach(btn => {
        btn.textContent = isFollowing ? 'Following' : 'Follow';
        btn.classList.toggle('following', isFollowing);
      });
    });
  }
}

// Backward compatibility
export const loadSuggestedChannels = FollowService.loadSuggestedChannels;
export const followUser = FollowService.toggleFollow;
export const followChannel = FollowService.toggleFollow;
