// Number formatting
export function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

// Time formatting with Intl.RelativeTimeFormat
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function formatTime(date) {
    if (!(date instanceof Date)) return 'Just now';
    
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return rtf.format(-seconds, 'second');
    if (seconds < 3600) return rtf.format(-Math.floor(seconds/60), 'minute');
    if (seconds < 86400) return rtf.format(-Math.floor(seconds/3600), 'hour');
    if (seconds < 2592000) return rtf.format(-Math.floor(seconds/86400), 'day');
    if (seconds < 31536000) return rtf.format(-Math.floor(seconds/2592000), 'month');
    return rtf.format(-Math.floor(seconds/31536000), 'year');
}

// YouTube duration parsing
export function parseYouTubeDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = (match[1] ? parseInt(match[1]) : 0) * 3600;
    const minutes = (match[2] ? parseInt(match[2]) : 0) * 60;
    const seconds = (match[3] ? parseInt(match[3]) : 0);
    
    return hours + minutes + seconds;
}

// Duration formatting with hours support
export function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '0:00';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Additional helper for short number formatting
export function formatShortNumber(num) {
    if (typeof num !== 'number') return '0';
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
    return num.toString();
}
