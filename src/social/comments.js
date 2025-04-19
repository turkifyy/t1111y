import { APP_STATE, DOM } from '../app/state';
import { showAuthModal } from '../ui/modals';
import { showToast } from '../ui/toast';
import { debounce, escapeHtml, isValidId } from '../utils/helpers';

let commentsLoaded = false;

export async function showComments(videoId) {
    if (!isValidId(videoId)) {
        console.error('Invalid video ID');
        return showToast('Invalid video', 'error');
    }

    if (!APP_STATE.currentUser) {
        showAuthModal();
        return showToast('Please login to comment', 'info');
    }

    try {
        // تحميل التعليقات
        const commentsQuery = firebase.query(
            firebase.collection(firebase.db, 'comments'),
            firebase.where('videoId', '==', videoId),
            firebase.orderBy('timestamp', 'desc'),
            firebase.limit(50)
        );

        const snapshot = await firebase.getDocs(commentsQuery);
        renderComments(snapshot.docs);
        
        if (!commentsLoaded) {
            setupCommentsUI(videoId);
            commentsLoaded = true;
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        showToast('Failed to load comments', 'error');
    }
}

function renderComments(comments) {
    DOM.commentsContainer.innerHTML = '';

    if (comments.length === 0) {
        DOM.commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
        return;
    }

    comments.forEach(doc => {
        const comment = doc.data();
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.innerHTML = `
            <img src="${escapeHtml(comment.userAvatar)}" alt="${escapeHtml(comment.userName)}" class="comment-avatar">
            <div class="comment-content">
                <h4 class="comment-user">${escapeHtml(comment.userName)}</h4>
                <p class="comment-text">${escapeHtml(comment.text)}</p>
                <p class="comment-time">${new Date(comment.timestamp?.toDate()).toLocaleString()}</p>
            </div>
        `;
        DOM.commentsContainer.appendChild(commentEl);
    });
}

function setupCommentsUI(videoId) {
    DOM.commentForm.addEventListener('submit', debounce(async (e) => {
        e.preventDefault();
        const commentText = DOM.commentInput.value.trim();
        
        if (commentText.length < 1) return;
        if (commentText.length > 200) {
            return showToast('Comment too long (max 200 chars)', 'error');
        }

        try {
            await firebase.addDoc(firebase.collection(firebase.db, 'comments'), {
                videoId: videoId,
                userId: APP_STATE.currentUser.id,
                userName: APP_STATE.currentUser.name,
                userAvatar: APP_STATE.currentUser.avatar,
                text: commentText,
                timestamp: firebase.serverTimestamp()
            });
            
            DOM.commentInput.value = '';
            showToast('Comment posted', 'success');
            showComments(videoId); // Refresh comments
        } catch (error) {
            console.error('Error posting comment:', error);
            showToast('Failed to post comment', 'error');
        }
    }, 500));
}
