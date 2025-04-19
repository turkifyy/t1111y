import { firebase } from '../../../firebase-config';
import { APP_CONFIG } from '../app/state';
import { showToast } from '../ui/toast';
import { formatDuration } from '../utils/helpers';

/**
 * YouTube API Service for managing YouTube channel integrations
 * Handles video imports, channel monitoring, and API rate limiting
 */
export class YouTubeService {
    static CACHE_DURATION = 3600000; // 1 hour cache duration
    static RATE_LIMIT = 5; // Max API requests per minute
    static lastRequestTime = 0;
    static requestQueue = [];

    /**
     * Checks all active YouTube channels for new videos
     * @returns {Promise<number>} Count of imported videos
     */
    static async checkChannels() {
        if (!APP_STATE.isAdmin) {
            showToast('Admin access required', 'error');
            return 0;
        }

        try {
            showToast('Scanning YouTube channels...', 'info');
            const channels = await this.getActiveChannels();
            let importedCount = 0;

            for (const channel of channels) {
                try {
                    const videos = await this.fetchChannelVideos(channel);
                    importedCount += await this.processVideos(videos, channel);
                } catch (error) {
                    console.error(`Failed to process channel ${channel.channelId}:`, error);
                    continue;
                }
            }

            showToast(`Successfully imported ${importedCount} new videos`, 'success');
            return importedCount;
        } catch (error) {
            console.error('YouTube import process failed:', error);
            showToast('Failed to import YouTube videos', 'error');
            return 0;
        }
    }

    /**
     * Fetches all active YouTube channels from database
     * @returns {Promise<Array>} List of active channels
     */
    static async getActiveChannels() {
        const snapshot = await firebase.getDocs(
            firebase.query(
                firebase.collection(firebase.db, 'youtubeChannels'),
                firebase.where('isActive', '==', true),
                firebase.where('lastChecked', '<', 
                    new Date(Date.now() - this.CACHE_DURATION))
            )
        );

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Fetches recent videos from a YouTube channel
     * @param {Object} channel Channel data object
     * @returns {Promise<Array>} List of videos
     */
    static async fetchChannelVideos(channel) {
        await this.enforceRateLimit();
        
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('key', APP_CONFIG.youtubeApiKey);
        url.searchParams.append('channelId', channel.channelId);
        url.searchParams.append('part', 'snippet,id');
        url.searchParams.append('order', 'date');
        url.searchParams.append('maxResults', '5');
        url.searchParams.append('type', 'video');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
        
        // Update last checked time
        await firebase.updateDoc(
            firebase.doc(firebase.db, 'youtubeChannels', channel.id),
            { lastChecked: firebase.serverTimestamp() }
        );

        return (await response.json()).items || [];
    }

    /**
     * Processes fetched videos and imports new ones
     * @param {Array} videos List of video items
     * @param {Object} channel Channel data object
     * @returns {Promise<number>} Count of imported videos
     */
    static async processVideos(videos, channel) {
        let count = 0;
        
        for (const video of videos) {
            if (await this.isNewVideo(video.id.videoId)) {
                await this.importVideo(video, channel);
                count++;
            }
        }
        
        return count;
    }

    /**
     * Checks if video already exists in database
     * @param {string} videoId YouTube video ID
     * @returns {Promise<boolean>} True if video is new
     */
    static async isNewVideo(videoId) {
        const snapshot = await firebase.getDocs(
            firebase.query(
                firebase.collection(firebase.db, 'videos'),
                firebase.where('originalId', '==', videoId),
                firebase.limit(1)
            )
        );
        
        return snapshot.empty;
    }

    /**
     * Imports a new video to the database
     * @param {Object} videoData YouTube video data
     * @param {Object} channel Channel data object
     */
    static async importVideo(videoData, channel) {
        const bot = await this.findChannelBot(videoData.snippet.channelId);
        if (!bot) return;

        const details = await this.fetchVideoDetails(videoData.id.videoId);
        const videoDoc = {
            title: videoData.snippet.title.substring(0, 100),
            description: videoData.snippet.description.substring(0, 500) || 'No description',
            url: `https://youtu.be/${videoData.id.videoId}`,
            originalId: videoData.id.videoId,
            thumbnail: this.getBestThumbnail(videoData.snippet.thumbnails),
            authorId: bot.id,
            authorName: bot.name || videoData.snippet.channelTitle,
            authorAvatar: bot.avatar || APP_CONFIG.defaultAvatar,
            isPublic: true,
            category: channel.category,
            quality: bot.importQuality || 'hd',
            duration: formatDuration(details.duration),
            views: 0,
            likes: 0,
            comments: 0,
            createdAt: firebase.serverTimestamp()
        };

        await firebase.addDoc(
            firebase.collection(firebase.db, 'videos'), 
            videoDoc
        );

        await firebase.updateDoc(
            firebase.doc(firebase.db, 'users', bot.id),
            { 
                lastActivity: firebase.serverTimestamp(),
                totalImported: firebase.increment(1) 
            }
        );
    }

    /**
     * Enforces rate limiting for YouTube API requests
     */
    static async enforceRateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const minDelay = 60000 / this.RATE_LIMIT;

        if (elapsed < minDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, minDelay - elapsed));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Gets the highest quality available thumbnail
     * @param {Object} thumbnails Thumbnails object
     * @returns {string} Thumbnail URL
     */
    static getBestThumbnail(thumbnails) {
        return thumbnails.maxres?.url || 
               thumbnails.standard?.url || 
               thumbnails.high?.url || 
               thumbnails.medium?.url || 
               thumbnails.default?.url;
    }

    /**
     * Fetches detailed video information
     * @param {string} videoId YouTube video ID
     * @returns {Promise<Object>} Video details
     */
    static async fetchVideoDetails(videoId) {
        await this.enforceRateLimit();
        
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.append('key', APP_CONFIG.youtubeApiKey);
        url.searchParams.append('id', videoId);
        url.searchParams.append('part', 'contentDetails,statistics');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
        
        const data = await response.json();
        return {
            duration: data.items[0]?.contentDetails?.duration || 'PT0S',
            views: parseInt(data.items[0]?.statistics?.viewCount) || 0,
            likes: parseInt(data.items[0]?.statistics?.likeCount) || 0,
            comments: parseInt(data.items[0]?.statistics?.commentCount) || 0
        };
    }

    /**
     * Finds the bot account associated with a YouTube channel
     * @param {string} channelId YouTube channel ID
     * @returns {Promise<Object|null>} Bot account data or null
     */
    static async findChannelBot(channelId) {
        const snapshot = await firebase.getDocs(
            firebase.query(
                firebase.collection(firebase.db, 'users'),
                firebase.where('youtubeChannelId', '==', channelId),
                firebase.limit(1)
            )
        );
        
        if (snapshot.empty) {
            console.warn(`No bot account found for YouTube channel ${channelId}`);
            return null;
        }
        
        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    }

    /**
     * Gets statistics for a YouTube channel
     * @param {string} channelId YouTube channel ID
     * @returns {Promise<Object>} Channel statistics
     */
    static async getChannelStatistics(channelId) {
        await this.enforceRateLimit();
        
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.searchParams.append('key', APP_CONFIG.youtubeApiKey);
        url.searchParams.append('id', channelId);
        url.searchParams.append('part', 'statistics');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
        
        const data = await response.json();
        return {
            subscribers: parseInt(data.items[0]?.statistics?.subscriberCount) || 0,
            views: parseInt(data.items[0]?.statistics?.viewCount) || 0,
            videos: parseInt(data.items[0]?.statistics?.videoCount) || 0
        };
    }

    /**
     * Updates statistics for all active channels
     * @returns {Promise<number>} Count of updated channels
     */
    static async updateChannelStats() {
        try {
            const channels = await this.getActiveChannels();
            let updatedCount = 0;

            for (const channel of channels) {
                try {
                    const stats = await this.getChannelStatistics(channel.channelId);
                    await firebase.updateDoc(
                        firebase.doc(firebase.db, 'youtubeChannels', channel.id),
                        {
                            subscribers: stats.subscribers,
                            totalViews: stats.views,
                            videoCount: stats.videos,
                            lastStatsUpdate: firebase.serverTimestamp()
                        }
                    );
                    updatedCount++;
                } catch (error) {
                    console.error(`Failed to update stats for channel ${channel.channelId}:`, error);
                    continue;
                }
            }

            showToast(`Updated statistics for ${updatedCount} channels`, 'success');
            return updatedCount;
        } catch (error) {
            console.error('Channel statistics update failed:', error);
            showToast('Failed to update channel statistics', 'error');
            return 0;
        }
    }

    /**
     * Searches YouTube for videos
     * @param {string} query Search query
     * @param {number} maxResults Maximum results to return
     * @returns {Promise<Array>} List of video results
     */
    static async searchVideos(query, maxResults = 10) {
        await this.enforceRateLimit();
        
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('key', APP_CONFIG.youtubeApiKey);
        url.searchParams.append('q', query);
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('maxResults', maxResults.toString());
        url.searchParams.append('type', 'video');
        url.searchParams.append('order', 'relevance');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
        
        return (await response.json()).items || [];
    }

    /**
     * Gets comments for a video
     * @param {string} videoId YouTube video ID
     * @param {number} maxResults Maximum comments to return
     * @returns {Promise<Array>} List of comments
     */
    static async getVideoComments(videoId, maxResults = 20) {
        await this.enforceRateLimit();
        
        const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
        url.searchParams.append('key', APP_CONFIG.youtubeApiKey);
        url.searchParams.append('videoId', videoId);
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('maxResults', maxResults.toString());
        url.searchParams.append('order', 'relevance');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
        
        return (await response.json()).items || [];
    }

    /**
     * Processes queued API requests
     */
    static async processQueue() {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            try {
                await this.enforceRateLimit();
                const result = await request.fn();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
        }
    }

    /**
     * Adds an API request to the queue
     * @param {Function} fn API request function
     * @returns {Promise} Promise for the request result
     */
    static queueRequest(fn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ fn, resolve, reject });
            if (this.requestQueue.length === 1) {
                this.processQueue();
            }
        });
    }
}

// Backward compatibility export
export const checkYouTubeChannels = YouTubeService.checkChannels;
export const updateYouTubeChannelStats = YouTubeService.updateChannelStats;
