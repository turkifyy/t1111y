import { firebase } from '../../../firebase-config';
import { APP_STATE, DOM } from '../app/state';
import { showToast } from '../ui/toast';
import { formatNumber, formatTime } from '../utils/helpers';

// Admin Dashboard Service
export class AdminService {
    static async loadDashboard() {
        try {
            const batch = firebase.writeBatch(firebase.db);
            
            // Parallel count queries
            const counts = await Promise.all([
                this.getCollectionCount('videos'),
                this.getQueryCount('users', [['isCreator', '==', true]]),
                this.getQueryCount('users', [['verified', '==', true]]),
                this.getCollectionCount('users')
            ]);
            
            const [videosCount, botsCount, verifiedCount, usersCount] = counts;
            
            // Update UI
            DOM.totalVideos.textContent = formatNumber(videosCount);
            DOM.activeBots.textContent = formatNumber(botsCount);
            DOM.verifiedBots.textContent = formatNumber(verifiedCount);
            DOM.totalUsers.textContent = formatNumber(usersCount);
            
            // Load bots with pagination
            await this.loadBots();
            DOM.adminModal.classList.add('active');
        } catch (error) {
            console.error('Admin dashboard error:', error);
            showToast('Failed to load dashboard', 'error');
        }
    }

    static async getCollectionCount(collection) {
        const snapshot = await firebase.getCountFromServer(
            firebase.collection(firebase.db, collection)
        );
        return snapshot.data().count;
    }

    static async getQueryCount(collection, conditions) {
        let query = firebase.collection(firebase.db, collection);
        conditions.forEach(([field, op, value]) => {
            query = firebase.query(query, firebase.where(field, op, value));
        });
        
        const snapshot = await firebase.getCountFromServer(query);
        return snapshot.data().count;
    }

    static async loadBots(limit = 10) {
        try {
            const query = firebase.query(
                firebase.collection(firebase.db, 'users'),
                firebase.where('isCreator', '==', true),
                firebase.limit(limit)
            );
            
            const snapshot = await firebase.getDocs(query);
            DOM.botList.innerHTML = '';
            
            if (snapshot.empty) {
                DOM.botList.innerHTML = '<p class="no-bots">No creator bots found</p>';
                return;
            }
            
            snapshot.forEach(doc => this.renderBotCard(doc));
        } catch (error) {
            console.error('Error loading bots:', error);
            throw error;
        }
    }

    static renderBotCard(doc) {
        const bot = doc.data();
        const card = document.createElement('div');
        card.className = 'bot-card';
        card.innerHTML = this.generateBotCardHTML(doc.id, bot);
        DOM.botList.appendChild(card);
        
        // Add event listeners
        const verifyBtn = card.querySelector('.verify-btn');
        if (!bot.verified) {
            verifyBtn.addEventListener('click', () => this.verifyBot(doc.id));
        }
    }

    static generateBotCardHTML(botId, bot) {
        return `
            <div class="bot-header">
                <img src="${bot.avatar}" class="bot-avatar" alt="${bot.name}" 
                     onerror="this.src='${APP_CONFIG.defaultAvatar}'">
                <div>
                    <div class="bot-name">
                        ${bot.name}
                        ${bot.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    </div>
                    <div class="channel-stats">${bot.channelId || 'No YouTube channel'}</div>
                </div>
            </div>
            <div class="bot-stats">
                <div class="bot-stat">
                    <div>Videos</div>
                    <div class="bot-stat-value">${bot.totalImported || 0}</div>
                </div>
                <div class="bot-stat">
                    <div>Followers</div>
                    <div class="bot-stat-value">${bot.followers || 0}</div>
                </div>
                <div class="bot-stat">
                    <div>Last Active</div>
                    <div class="bot-stat-value">${bot.lastActivity ? formatTime(bot.lastActivity.toDate()) : 'Never'}</div>
                </div>
                <div class="bot-stat">
                    <div>Status</div>
                    <div class="bot-stat-value ${bot.active ? 'active' : 'inactive'}">
                        ${bot.active ? 'Active' : 'Inactive'}
                    </div>
                </div>
            </div>
            <div class="bot-actions">
                <button class="verify-btn" data-bot-id="${botId}" ${bot.verified ? 'disabled' : ''}>
                    ${bot.verified ? 'Verified' : 'Verify'}
                </button>
                <button class="edit-btn" data-bot-id="${botId}">
                    Edit Bot
                </button>
            </div>
        `;
    }

    static async verifyBot(botId) {
        try {
            await firebase.updateDoc(firebase.doc(firebase.db, 'users', botId), {
                verified: true,
                verifiedAt: firebase.serverTimestamp()
            });
            
            showToast('Bot verified successfully', 'success');
            this.loadBots(); // Refresh list
        } catch (error) {
            console.error('Verify bot failed:', error);
            showToast('Verification failed', 'error');
        }
    }
}

// Backward compatibility
export const showAdminDashboard = AdminService.loadDashboard;
export const verifyBot = AdminService.verifyBot;
