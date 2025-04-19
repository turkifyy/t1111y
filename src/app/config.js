// App Configuration (Dynamic)
export const getAppConfig = () => ({
  // Required
  pageSize: parseInt(import.meta.env.VITE_PAGE_SIZE) || 5,
  videoBuffer: parseInt(import.meta.env.VITE_VIDEO_BUFFER) || 2,
  
  // Optional with fallbacks
  youtubeApiKey: import.meta.env.VITE_YOUTUBE_API_KEY || null,
  defaultThumbnail: import.meta.env.VITE_DEFAULT_THUMBNAIL || 'https://via.placeholder.com/300x500/161616/FFFFFF?text=ClipNow',
  defaultAvatar: import.meta.env.VITE_DEFAULT_AVATAR || 'https://i.pravatar.cc/150?img=0',
  onesignalAppId: import.meta.env.VITE_ONESIGNAL_APP_ID || null,

  // Environment
  isProduction: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
});

// Usage: const { pageSize } = getAppConfig();
