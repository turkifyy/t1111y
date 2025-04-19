import { DOM } from '../app/state';
import { showToast } from '../ui/toast';

// Network Monitor with connection quality
export class NetworkMonitor {
    static STATUS = {
        ONLINE: 'online',
        OFFLINE: 'offline',
        SLOW: 'slow-connection'
    };
    
    static init() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.setupListeners();
        this.checkConnection();
    }
    
    static setupListeners() {
        // Basic online/offline detection
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        
        // Advanced connection monitoring
        if (this.connection) {
            this.connection.addEventListener('change', () => this.checkConnectionQuality());
        }
    }
    
    static checkConnection() {
        this.handleConnectionChange(navigator.onLine);
    }
    
    static checkConnectionQuality() {
        if (!this.connection) return;
        
        const { effectiveType, downlink, rtt } = this.connection;
        const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1 || rtt > 1000;
        
        if (isSlow) {
            this.updateUI(this.STATUS.SLOW);
            showToast('Slow network detected', 'warning');
        }
    }
    
    static handleConnectionChange(isOnline) {
        if (isOnline) {
            this.updateUI(this.STATUS.ONLINE);
            showToast('Back online', 'success');
            this.checkConnectionQuality();
        } else {
            this.updateUI(this.STATUS.OFFLINE);
            showToast('No internet connection', 'error');
        }
    }
    
    static updateUI(status) {
        DOM.connectionBanner.className = 'connection-banner';
        
        switch(status) {
            case this.STATUS.ONLINE:
                DOM.connectionBanner.classList.add('online');
                break;
            case this.STATUS.OFFLINE:
                DOM.connectionBanner.classList.add('offline');
                break;
            case this.STATUS.SLOW:
                DOM.connectionBanner.classList.add('slow');
                break;
        }
    }
}

// Backward compatibility
export const initNetworkMonitor = NetworkMonitor.init;
