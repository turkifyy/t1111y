import { firebase } from '../../../firebase-config';
import { APP_CONFIG, APP_STATE } from '../app/state';
import { showLoading, showError } from '../ui/loading';
import { showToast } from '../ui/toast';

// Video Service
export const VideoService = {
  async getPublicVideos(limit = APP_CONFIG.pageSize) {
    const q = firebase.query(
      firebase.collection(firebase.db, 'videos'),
      firebase.where('isPublic', '==', true),
      firebase.orderBy('createdAt', 'desc'),
      firebase.limit(limit)
    );
    
    const snapshot = await firebase.getDocs(q);
    return this.processVideoSnapshot(snapshot);
  },

  async getVideosByAuthors(authorIds, limit = APP_CONFIG.pageSize) {
    // Firebase limits 'in' queries to 10 items
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < authorIds.length; i += batchSize) {
      const batch = authorIds.slice(i, i + batchSize);
      const q = firebase.query(
        firebase.collection(firebase.db, 'videos'),
        firebase.where('authorId', 'in', batch),
        firebase.orderBy('createdAt', 'desc'),
        firebase.limit(limit)
      );
      batches.push(firebase.getDocs(q));
    }
    
    const results = await Promise.all(batches);
    return results.flatMap(snapshot => this.processVideoSnapshot(snapshot));
  },

  async getPopularVideos(limit = APP_CONFIG.pageSize) {
    const q = firebase.query(
      firebase.collection(firebase.db, 'videos'),
      firebase.where('isPublic', '==', true),
      firebase.orderBy('views', 'desc'),
      firebase.limit(limit)
    );
    
    const snapshot = await firebase.getDocs(q);
    return this.processVideoSnapshot(snapshot);
  },

  processVideoSnapshot(snapshot) {
    if (snapshot.empty) return [];
    
    APP_STATE.lastVideoDoc = snapshot.docs[snapshot.docs.length - 1];
    return snapshot.docs.map(doc => this.createVideoObject(doc.id, doc.data()));
  },

  createVideoObject(id, data) {
    return {
      id,
      title: data.title?.trim() || 'Untitled Video',
      description: data.description?.trim() || '',
      videoId: data.originalId || this.generateVideoId(),
      url: data.url || '',
      thumbnail: data.thumbnail || APP_CONFIG.defaultThumbnail,
      author: {
        id: data.authorId || '',
        name: data.authorName?.trim() || 'Unknown Creator',
        avatar: data.authorAvatar || APP_CONFIG.defaultAvatar,
        verified: data.verified || false
      },
      likes: parseInt(data.likes) || 0,
      comments: parseInt(data.comments) || 0,
      views: parseInt(data.views) || 0,
      music: data.music?.trim() || "Original sound",
      category: data.category || "General",
      duration: data.duration || '0:00',
      quality: data.quality || 'hd',
      country: data.country || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      isPublic: data.isPublic !== false
    };
  },

  generateVideoId() {
    return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
  }
};

// Controller Functions
export async function loadPublicVideos() {
  if (APP_STATE.isLoading) return;
  
  try {
    APP_STATE.isLoading = true;
    showLoading();
    
    const videos = await VideoService.getPublicVideos();
    if (videos.length === 0) return showError('No videos available');
    
    APP_STATE.videos = videos;
    APP_STATE.isLoading = false;
  } catch (error) {
    console.error('Failed loading public videos:', error);
    showToast('Failed to load videos', 'error');
    APP_STATE.isLoading = false;
  }
}

export async function loadPersonalizedVideos() {
  if (APP_STATE.isLoading || !APP_STATE.currentUser) return;
  
  try {
    APP_STATE.isLoading = true;
    showLoading();
    
    let videos = [];
    
    // Try followed channels first
    if (APP_STATE.followingChannels.length > 0) {
      videos = await VideoService.getVideosByAuthors(APP_STATE.followingChannels);
    }
    
    // Fallback to popular videos
    if (videos.length === 0) {
      videos = await VideoService.getPopularVideos();
    }
    
    if (videos.length === 0) return showError('No videos available');
    
    APP_STATE.videos = videos;
    APP_STATE.isLoading = false;
  } catch (error) {
    console.error('Failed loading personalized videos:', error);
    showToast('Failed to load videos', 'error');
    APP_STATE.isLoading = false;
  }
}
