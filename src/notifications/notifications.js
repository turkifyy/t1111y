import { firebase } from '../../../firebase-config';
import { APP_STATE, DOM } from '../app/state';
import { formatTime } from '../utils/helpers';
import { loadVideoById } from '../videos/videos';
import { escapeHtml } from '../utils/helpers'; // تحتاج لإنشاء هذه الدالة

export async function loadNotifications() {
    if (!APP_STATE.currentUser) return;
    
    try {
        const notificationsQuery = firebase.query(
            firebase.collection(firebase.db, 'notifications'),
            firebase.where('userId', '==', APP_STATE.currentUser.id),
            firebase.orderBy('timestamp', 'desc'),
            firebase.limit(20)
        );
        
        const notificationsSnapshot = await firebase.getDocs(notificationsQuery);
        DOM.notificationsList.innerHTML = '';
        
        if (notificationsSnapshot.empty) {
            const noNotifications = document.createElement('p');
            noNotifications.textContent = 'No notifications yet';
            DOM.notificationsList.appendChild(noNotifications);
            return;
        }
        
        const seenNotifications = new Set();
        
        // استخدم event delegation بدلاً من event listeners متعددة
        DOM.notificationsList.addEventListener('click', (e) => {
            const item = e.target.closest('.notification-item');
            if (item && item.dataset.videoId) {
                loadVideoById(item.dataset.videoId);
            }
        });

        notificationsSnapshot.forEach(doc => {
            const notification = doc.data();
            const notificationKey = notification.message + notification.videoId;
            
            if (seenNotifications.has(notificationKey)) return;
            seenNotifications.add(notificationKey);
            
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item';
            notificationItem.dataset.videoId = notification.videoId || '';
            
            const avatar = document.createElement('img');
            avatar.className = 'notification-avatar';
            avatar.src = escapeHtml(notification.senderAvatar);
            avatar.alt = escapeHtml(notification.senderName);
            
            const content = document.createElement('div');
            content.className = 'notification-content';
            
            const text = document.createElement('p');
            text.className = 'notification-text';
            text.textContent = notification.message;
            
            const time = document.createElement('p');
            time.className = 'notification-time';
            time.textContent = formatTime(notification.timestamp?.toDate() || new Date());
            
            content.append(text, time);
            notificationItem.append(avatar, content);
            DOM.notificationsList.appendChild(notificationItem);
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

export async function createNewVideoNotification(botId, videoId, videoTitle) {
    try {
        const followersSnapshot = await firebase.getDocs(
            firebase.collection(firebase.db, 'users', botId, 'followers')
        );
        
        const batch = firebase.writeBatch(firebase.db);
        const notificationsRef = firebase.collection(firebase.db, 'notifications');
        let operationCount = 0;
        
        followersSnapshot.forEach(doc => {
            const notificationId = firebase.doc(notificationsRef).id;
            batch.set(firebase.doc(notificationsRef, notificationId), {
                userId: doc.id,
                message: `New video: ${videoTitle.substring(0, 100)}`, // تقليل طول الرسالة
                senderId: botId,
                senderName: "Channel Update",
                senderAvatar: doc.data().avatar || APP_CONFIG.defaultAvatar,
                videoId: videoId,
                timestamp: firebase.serverTimestamp(),
                read: false
            });
            
            if (++operationCount % 450 === 0) {
                await batch.commit();
                batch = firebase.writeBatch(firebase.db);
            }
        });
        
        if (operationCount % 450 !== 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error creating notifications:', error);
    }
}
