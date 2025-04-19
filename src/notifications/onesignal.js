// src/utils/onesignal.js
/**
 * خدمة OneSignal لإدارة الإشعارات الدفعية
 * @class
 */
class OneSignalService {
  constructor() {
    this.initialized = false;
    this.userId = null;
    this.sdkLoaded = false;
  }

  /**
   * تحميل SDK ديناميكياً
   * @private
   */
  async _loadSDK() {
    if (this.sdkLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.onload = () => {
        this.sdkLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load OneSignal SDK'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * تهيئة OneSignal مع تحسينات الأمان
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized || !APP_CONFIG?.onesignalAppId) return;

    try {
      await this._loadSDK();

      if (!window.OneSignal) {
        throw new Error('OneSignal SDK not available');
      }

      window.OneSignal = window.OneSignal || [];
      
      await new Promise((resolve) => {
        OneSignal.push(() => {
          OneSignal.init({
            appId: APP_CONFIG.onesignalAppId,
            safari_web_id: APP_CONFIG.onesignalSafariId,
            allowLocalhostAsSecureOrigin: !IS_PRODUCTION,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { 
              scope: '/',
              updateViaCache: 'none'
            },
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: 'push',
                    autoPrompt: true,
                    text: {
                      actionMessage: 'اشترك لتلقي إشعارات الفيديوهات الجديدة',
                      acceptButton: 'موافق',
                      cancelButton: 'لاحقاً'
                    }
                  }
                ]
              }
            }
          });

          this._setupEventListeners();
          resolve();
        });
      });

      this.userId = await OneSignal.getUserId();
      this.initialized = true;

    } catch (error) {
      console.error('OneSignal initialization failed:', error);
      throw error;
    }
  }

  /**
   * إعداد مستمعي الأحداث
   * @private
   */
  _setupEventListeners() {
    OneSignal.on('subscriptionChange', (isSubscribed) => {
      this._handleSubscriptionChange(isSubscribed);
    });

    OneSignal.on('notificationDisplay', (event) => {
      this._logNotificationEvent('displayed', event);
    });

    OneSignal.on('notificationClicked', (event) => {
      this._logNotificationEvent('clicked', event);
      this._handleNotificationClick(event);
    });
  }

  /**
   * تسجيل مستخدم مع تحسينات الأمان
   * @param {string} firebaseUserId 
   * @returns {Promise<void>}
   */
  async registerUser(firebaseUserId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // استخدام hash بدلاً من ID المباشر
      const hashedUserId = await this._hashUserId(firebaseUserId);
      
      await OneSignal.setExternalUserId(hashedUserId);
      
      await OneSignal.sendTags({
        platform: 'web',
        user_hash: hashedUserId,
        sign_up_date: new Date().toISOString().split('T')[0] // تاريخ فقط بدون وقت
      });
      
    } catch (error) {
      console.error('OneSignal registration failed:', error);
      throw error;
    }
  }

  /**
   * تشفير معرّف المستخدم
   * @private
   */
  async _hashUserId(userId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + APP_CONFIG.hashingSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
               .map(b => b.toString(16).padStart(2, '0'))
               .join('');
  }

  /**
   * إرسال إشعار مخصص مع خيارات متقدمة
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.url]
   * @param {string} [options.userId]
   * @param {string} [options.imageUrl]
   * @param {Object} [options.data] - بيانات مخصصة
   * @returns {Promise<string>} - معرّف الإشعار
   */
  async sendNotification({
    title,
    message,
    url,
    userId,
    imageUrl,
    data
  }) {
    if (!this.initialized) await this.initialize();

    const notification = {
      headings: { en: title, ar: title },
      contents: { en: message, ar: message },
      ...(url && { url }),
      ...(imageUrl && { big_picture: imageUrl }),
      ...(data && { data }),
      ...(userId && { 
        include_external_user_ids: [userId],
        target_channel: 'push'
      }),
      ios_attachments: imageUrl ? { id1: imageUrl } : undefined,
      android_channel_id: APP_CONFIG.notificationChannelId
    };

    try {
      const response = await OneSignal.createNotification(notification);
      return response.id;
    } catch (error) {
      console.error('Notification failed:', error);
      throw error;
    }
  }

  /**
   * معالجة نقر الإشعار
   * @private
   */
  _handleNotificationClick(event) {
    const { url, data } = event.notification;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    if (data?.videoId) {
      // معالجة فتح الفيديو المحدد
      window.dispatchEvent(new CustomEvent('notificationNavigate', {
        detail: { videoId: data.videoId }
      }));
    }
  }

  /**
   * تسجيل أحداث الإشعارات
   * @private
   */
  async _logNotificationEvent(type, event) {
    try {
      await analytics.logEvent(`notification_${type}`, {
        notification_id: event.notification.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log notification event:', error);
    }
  }

  /**
   * تحديث تاجات المستخدم
   * @param {Object} tags
   * @returns {Promise<void>}
   */
  async updateUserTags(tags) {
    if (!this.initialized) throw new Error('OneSignal not initialized');
    await OneSignal.sendTags(tags);
  }

  /**
   * الحصول على حالة الإذن الحالية
   * @returns {Promise<'granted'|'denied'|'default'>}
   */
  async getPermissionState() {
    if (!this.initialized) await this.initialize();
    return OneSignal.Notifications.permission;
  }
}

// تصدير النسخة الوحيدة
export const oneSignalService = new OneSignalService();
