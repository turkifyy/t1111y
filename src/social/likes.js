import { firebase } from '../../../firebase-config';
import { APP_STATE } from '../app/state';
import { showToast } from '../ui/toast';
import { showAuthModal } from '../ui/modals';
import { formatNumber } from '../utils/helpers';

// Like Service
export class LikeService {
  static PENDING_LIKES = new Set();

  static async toggleLike(videoId) {
    if (!APP_STATE.currentUser) {
      showAuthModal();
      return false;
    }

    if (this.PENDING_LIKES.has(videoId)) return false;
    this.PENDING_LIKES.add(videoId);

    try {
      const isLiked = APP_STATE.likedVideos.includes(videoId);
      await (isLiked ? this.unlikeVideo(videoId) : this.likeVideo(videoId));
      
      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('likeToggled', {
        detail: { videoId, isLiked: !isLiked }
      }));
      
      return true;
    } catch (error) {
      console.error('Like action failed:', error);
      showToast('Failed to process like', 'error');
      return false;
    } finally {
      this.PENDING_LIKES.delete(videoId);
    }
  }

  static async likeVideo(videoId) {
    const batch = firebase.writeBatch(firebase.db);
    const likeRef = this.getLikeRef(videoId);
    const videoRef = this.getVideoRef(videoId);

    batch.set(likeRef, {
      userId: APP_STATE.currentUser.id,
      likedAt: firebase.serverTimestamp()
    });
    batch.update(videoRef, {
      likes: firebase.increment(1)
    });

    await batch.commit();
    APP_STATE.likedVideos.push(videoId);
  }

  static async unlikeVideo(videoId) {
    const batch = firebase.writeBatch(firebase.db);
    const likeRef = this.getLikeRef(videoId);
    const videoRef = this.getVideoRef(videoId);

    batch.delete(likeRef);
    batch.update(videoRef, {
      likes: firebase.increment(-1)
    });

    await batch.commit();
    APP_STATE.likedVideos = APP_STATE.likedVideos.filter(id => id !== videoId);
  }

  static getLikeRef(videoId) {
    return firebase.doc(
      firebase.collection(firebase.db, 'videos', videoId, 'likes'),
      APP_STATE.currentUser.id
    );
  }

  static getVideoRef(videoId) {
    return firebase.doc(firebase.db, 'videos', videoId);
  }

  static initLikeListeners() {
    document.addEventListener('likeToggled', ({ detail }) => {
      const { videoId, isLiked } = detail;
      
      document.querySelectorAll(`[data-video-id="${videoId}"] .like-btn`).forEach(btn => {
        btn.classList.toggle('active', isLiked);
        const countEl = btn.querySelector('.action-text');
        const currentCount = parseInt(countEl.textContent.replace(/,/g, ''));
        countEl.textContent = formatNumber(isLiked ? currentCount + 1 : currentCount - 1);
      });
    });
  }
}

// Backward compatibility
export const toggleLike = LikeService.toggleLike;
