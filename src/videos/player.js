import { APP_STATE, DOM } from '../app/state';
import { formatNumber } from '../utils/helpers';
import { recordVideoView } from './videos';
import { toggleLike } from '../social/likes';
import { followUser } from '../social/follow';
import { showComments } from '../social/comments';
import { shareVideo } from '../social/share';

// Video Player Component
export class VideoPlayer {
  constructor() {
    this.observers = [];
    this.currentIntersectionObserver = null;
  }

  renderVideos() {
    if (!APP_STATE.videos.length) {
      showError('No videos available');
      return;
    }

    // Clear existing content safely
    while (DOM.videoFeed.firstChild) {
      DOM.videoFeed.removeChild(DOM.videoFeed.firstChild);
    }

    // Document fragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    APP_STATE.videos.forEach((video, index) => {
      const videoElement = this.createVideoElement(video, index);
      fragment.appendChild(videoElement);
    });

    DOM.videoFeed.appendChild(fragment);
    this.setupIntersectionObserver();
  }

  createVideoElement(video, index) {
    const isLiked = APP_STATE.likedVideos.includes(video.id);
    const isFollowing = APP_STATE.followingChannels.includes(video.author.id);

    // Create elements using DOM API
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.dataset.videoId = video.id;
    videoItem.dataset.index = index;

    // Video Container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';

    // Video Iframe (safe construction)
    const iframe = document.createElement('iframe');
    iframe.className = 'video-player';
    iframe.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=0&mute=${APP_STATE.muted ? 1 : 0}&controls=0&modestbranding=1&rel=0`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', video.title);
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

    // Build DOM hierarchy
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    videoWrapper.appendChild(iframe);

    videoContainer.appendChild(videoWrapper);
    videoContainer.appendChild(this.createVideoActions(video, isLiked));
    videoContainer.appendChild(this.createVideoInfo(video, isFollowing));

    videoItem.appendChild(videoContainer);
    this.setupVideoEvents(videoItem, video);

    // Store player reference
    APP_STATE.videoPlayers[video.id] = iframe;
    return videoItem;
  }

  createVideoActions(video, isLiked) {
    const actions = document.createElement('div');
    actions.className = 'video-actions';

    // Like Button
    const likeBtn = this.createActionButton(
      'like', 
      isLiked ? 'Unlike' : 'Like',
      isLiked ? 'active' : '',
      video.likes
    );

    // Comment Button
    const commentBtn = this.createActionButton(
      'comment',
      'Comments',
      '',
      video.comments
    );

    // Share Button
    const shareBtn = this.createActionButton(
      'share',
      'Share',
      '',
      'Share'
    );

    actions.append(likeBtn, commentBtn, shareBtn);
    return actions;
  }

  createActionButton(type, ariaLabel, extraClass, count) {
    const btn = document.createElement('button');
    btn.className = `action-btn ${type}-btn ${extraClass}`;
    btn.setAttribute('aria-label', ariaLabel);

    const icon = document.createElement('div');
    icon.className = 'action-icon';
    icon.innerHTML = `<i class="fas fa-${type}"></i>`;

    const text = document.createElement('span');
    text.className = 'action-text';
    text.textContent = formatNumber(count);

    btn.append(icon, text);
    return btn;
  }

  setupVideoEvents(videoElement, video) {
    videoElement.querySelector('.like-btn').addEventListener('click', () => toggleLike(video.id));
    videoElement.querySelector('.comment-btn').addEventListener('click', () => showComments(video.id));
    videoElement.querySelector('.share-btn').addEventListener('click', () => shareVideo(video));
    videoElement.querySelector('.follow-btn')?.addEventListener('click', () => followUser(video.author.id));
  }

  setupIntersectionObserver() {
    // Cleanup previous observer
    this.cleanupObservers();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const videoId = entry.target.dataset.videoId;
          const videoIndex = parseInt(entry.target.dataset.index);
          
          APP_STATE.currentVideoIndex = videoIndex;
          
          if (!APP_STATE.watchedVideos.includes(videoId)) {
            APP_STATE.watchedVideos.push(videoId);
            recordVideoView(videoId);
          }
        }
      });
    }, { threshold: 0.8 });

    document.querySelectorAll('.video-item').forEach(item => {
      observer.observe(item);
      this.observers.push(observer);
    });

    this.currentIntersectionObserver = observer;
  }

  cleanupObservers() {
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const videoPlayer = new VideoPlayer();
