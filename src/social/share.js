import { showToast } from '../ui/toast';
import { isValidId } from '../utils/helpers';

// تحقق من صحة بيانات الفيديو
const validateVideo = (video) => {
    return video && 
           isValidId(video.id) && 
           typeof video.title === 'string' &&
           video.title.length > 0;
};

export function shareVideo(video) {
    if (!validateVideo(video)) {
        console.error('Invalid video data');
        return showToast('Cannot share this video', 'error');
    }

    const shareData = {
        title: video.title.substring(0, 60), // تحديد الطول
        text: 'Check out this video on ClipNow',
        url: `https://clipnow.com/video/${encodeURIComponent(video.id)}`
    };

    if (navigator.share) {
        navigator.share(shareData)
            .catch(err => {
                console.log('Sharing failed:', err);
                fallbackShare(video);
            });
    } else {
        fallbackShare(video);
    }
}

function fallbackShare(video) {
    const shareUrl = `https://clipnow.com/video/${encodeURIComponent(video.id)}`;
    
    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            showToast('Link copied to clipboard', 'success');
        })
        .catch(() => {
            // افتح في نافذة آمنة مع سياسات أمان
            const newWindow = window.open(
                `https://wa.me/?text=${encodeURIComponent(`Check this video: ${shareUrl}`)}`,
                '_blank',
                'noopener,noreferrer'
            );
            
            if (!newWindow) {
                showToast('Please allow popups to share', 'info');
            }
        });
}
