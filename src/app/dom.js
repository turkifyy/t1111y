// DOM Manager with Lazy Loading
const DOM_CACHE = new Map();

export const DOM = new Proxy({}, {
  get(target, elementId) {
    if (!DOM_CACHE.has(elementId)) {
      const element = document.getElementById(elementId);
      if (element) DOM_CACHE.set(elementId, element);
    }
    return DOM_CACHE.get(elementId) || console.warn(`Element #${elementId} not found`);
  }
});

// Dynamic DOM Elements
export const getDynamicDOM = {
  videoPlayer: (videoId) => document.querySelector(`[data-video-id="${videoId}"]`),
  toast: (id) => document.getElementById(`toast-${id}`),
  suggestionItem: (userId) => document.querySelector(`[data-user-id="${userId}"]`)
};

// Usage:
// DOM.videoFeed (existing)
// getDynamicDOM.videoPlayer('123') (dynamic)
