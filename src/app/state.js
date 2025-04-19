// Immutable App State
const createAppState = () => {
  const state = {
    currentUser: null,
    videos: Object.freeze([]),
    likedVideos: new Set(), // Better for lookups
    watchedVideos: new Map(), // Store with timestamps
    followingChannels: new Set(),
    currentVideoIndex: 0,
    isLoading: false,
    hasMoreVideos: true,
    muted: true,
    isAdmin: false,
    lastVideoDoc: null,
    _observers: new Set(), // Private observers
    _players: new WeakMap() // Private video players
  };

  return {
    getState: () => Object.freeze({ ...state }),
    addObserver: (observer) => state._observers.add(observer),
    removeObserver: (observer) => state._observers.delete(observer),
    setPlayer: (videoId, player) => state._players.set(videoId, player),
    getPlayer: (videoId) => state._players.get(videoId)
  };
};

// Singleton State Instance
export const APP_STATE = createAppState();

// Usage Example:
// const { currentUser } = APP_STATE.getState();
// APP_STATE.addObserver(myComponent);
