// src/services/bots.js
/**
 * نظام إدارة البوتات للمنصة
 * المسؤول عن:
 * - إنشاء وتعديل البوتات
 * - مراقبة أداء البوتات
 * - تكامل مع YouTube API
 */

import { db, storage } from '../firebase/config';
import { APP_CONFIG } from '../config';
import { logger } from '../utils/logger';
import { YouTubeAPI } from './youtube';

const BOTS_COLLECTION = 'bots';
const VIDEOS_COLLECTION = 'videos';

class BotService {
  constructor() {
    this.youtubeAPI = new YouTubeAPI(APP_CONFIG.youtubeApiKey);
  }

  /**
   * إنشاء بوت جديد
   * @param {Object} botData - بيانات البوت
   * @param {string} botData.name - اسم البوت
   * @param {string} botData.channelId - معرّف قناة اليوتيوب
   * @param {string} botData.category - التصنيف الرئيسي
   * @returns {Promise<string>} - معرّف البوت
   */
  async createBot(botData) {
    try {
      const docRef = await db.collection(BOTS_COLLECTION).add({
        ...botData,
        status: 'active',
        createdAt: new Date(),
        lastActivity: null,
        totalImported: 0,
        isVerified: false
      });
      
      logger.info(`Bot created: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating bot:', error);
      throw new Error('Failed to create bot');
    }
  }

  /**
   * استيراد فيديوهات من قناة يوتيوب
   * @param {string} botId - معرّف البوت
   * @param {number} limit - عدد الفيديوهات
   * @returns {Promise<Array>} - الفيديوهات المستوردة
   */
  async importVideos(botId, limit = 5) {
    const botDoc = await db.collection(BOTS_COLLECTION).doc(botId).get();
    if (!botDoc.exists) throw new Error('Bot not found');

    const bot = botDoc.data();
    const videos = await this.youtubeAPI.fetchChannelVideos(bot.channelId, limit);

    const importedVideos = [];
    const batch = db.batch();

    for (const video of videos) {
      const videoRef = db.collection(VIDEOS_COLLECTION).doc();
      
      batch.set(videoRef, {
        title: video.snippet.title,
        description: video.snippet.description,
        videoId: video.id.videoId,
        category: bot.category,
        botId: botId,
        views: 0,
        likes: 0,
        status: 'pending',
        publishedAt: new Date(video.snippet.publishedAt),
        thumbnail: await this._uploadThumbnail(video)
      });

      importedVideos.push(videoRef.id);
    }

    // تحديث إحصائيات البوت
    const botRef = db.collection(BOTS_COLLECTION).doc(botId);
    batch.update(botRef, {
      lastActivity: new Date(),
      totalImported: (bot.totalImported || 0) + importedVideos.length
    });

    await batch.commit();
    return importedVideos;
  }

  /**
   * رفع ثامب نيل الفيديو
   * @private
   */
  async _uploadThumbnail(video) {
    const thumbnailUrl = video.snippet.thumbnails.high.url;
    const response = await fetch(thumbnailUrl);
    const blob = await response.blob();
    
    const storageRef = storage.ref(`thumbnails/${video.id.videoId}`);
    await storageRef.put(blob);
    
    return await storageRef.getDownloadURL();
  }

  /**
   * التحقق من البوت
   * @param {string} botId - معرّف البوت
   */
  async verifyBot(botId) {
    await db.collection(BOTS_COLLECTION).doc(botId).update({
      isVerified: true,
      verifiedAt: new Date()
    });
  }

  /**
   * الحصول على قائمة البوتات
   * @param {Object} filters - عوامل التصفية
   * @returns {Promise<Array>}
   */
  async getBots(filters = {}) {
    let query = db.collection(BOTS_COLLECTION);
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * تحديث إحصائيات البوت
   * @param {string} botId - معرّف البوت
   */
  async updateBotStats(botId) {
    const videosSnapshot = await db.collection(VIDEOS_COLLECTION)
      .where('botId', '==', botId)
      .get();

    const stats = {
      totalViews: 0,
      totalLikes: 0,
      lastVideoDate: null
    };

    videosSnapshot.forEach(doc => {
      const video = doc.data();
      stats.totalViews += video.views || 0;
      stats.totalLikes += video.likes || 0;
      
      if (!stats.lastVideoDate || video.publishedAt > stats.lastVideoDate) {
        stats.lastVideoDate = video.publishedAt;
      }
    });

    await db.collection(BOTS_COLLECTION).doc(botId).update({
      stats,
      updatedAt: new Date()
    });

    return stats;
  }
}

// تصدير نسخة واحدة من الخدمة (Singleton)
export const botService = new BotService();
