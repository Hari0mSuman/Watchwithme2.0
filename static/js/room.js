// Room functionality for WatchWithMe
let socket;
let currentVideoType = null;
let currentVideoSource = null;
let isVideoLoaded = false;
let localPlayer = null;
let youtubePlayer = null;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io({
        transports: ['websocket', 'polling']
    });

    // Connection events
    socket.on('connect', function() {
        console.log('Connected to server');
        showNotification('Connected to room', 'success');
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        showNotification('Disconnected from server', 'error');
    });

    // Room state events
    socket.on('room_state', function(data) {
        console.log('Room state received:', data);
        updateUserList(data.users || []);
        updatePendingUsers(data.pending_users || []);
        
        if (data.current_video) {
            loadVideo(data.video_type, data.current_video, data.video_time, data.is_playing);
        }
    });

    // User management events
    socket.on('user_joined', function(data) {
        showNotification(`${data.username} joined the room`, 'info');
        addChatMessage('system', `${data.username} joined the room`);
    });

    socket.on('user_left', function(data) {
        showNotification(`${data.username} left the room`, 'info');
        addChatMessage('system', `${data.username} left the room`);
    });

    socket.on('user_approved', function(data) {
        if (data.username === window.roomData.username) {
            // This user was approved
            window.location.reload();
        } else {
            showNotification(`${data.username} was approved to join`, 'success');
        }
    });

    socket.on('user_rejected', function(data) {
        if (data.username === window.roomData.username) {
            // This user was rejected
            alert('Your request to join was rejected.');
            window.location.href = '/';
        }
    });

    socket.on('pending_users_updated', function(data) {
        updatePendingUsers(data.pending_users);
    });

    // Video synchronization events
    socket.on('video_changed', function(data) {
        console.log('Video changed:', data);
        loadVideo(data.video_type, data.video_source, data.time, data.is_playing);
    });

    socket.on('video_play', function(data) {
        console.log('Video play event:', data);
        syncVideoPlay(data.time);
    });

    socket.on('video_pause', function(data) {
        console.log('Video pause event:', data);
        syncVideoPause(data.time);
    });

    socket.on('video_seek', function(data) {
        console.log('Video seek event:', data);
        syncVideoSeek(data.time);
    });

    // Chat events
    socket.on('new_message', function(data) {
        addChatMessage(data.username, data.message, data.timestamp);
    });

    // Error handling
    socket.on('error', function(data) {
        showNotification(data.message, 'error');
    });
}

// Video management functions
function loadVideo(videoType, videoSource, time = 0, isPlaying = false) {
    currentVideoType = videoType;
    currentVideoSource = videoSource;
    
    const videoContainer = document.getElementById('video-container');
    const youtubePlayer = document.getElementById('youtube-player');
    const localPlayer = document.getElementById('local-player');
    
    // Hide all players first
    videoContainer.classList.add('hidden');
    youtubePlayer.classList.add('hidden');
    localPlayer.classList.add('hidden');
    
    if (videoType === 'youtube') {
        const embedUrl = `https://www.youtube.com/embed/${videoSource}?enablejsapi=1&controls=1&start=${Math.floor(time)}`;
        youtubePlayer.src = embedUrl;
        youtubePlayer.classList.remove('hidden');
        isVideoLoaded = true;
    } else if (videoType === 'local') {
        localPlayer.src = `/uploads/${videoSource}`;
        localPlayer.currentTime = time;
        localPlayer.classList.remove('hidden');
        
        localPlayer.addEventListener('loadeddata', function() {
            isVideoLoaded = true;
            if (isPlaying) {
                localPlayer.play();
            }
        });
    }
    
    updateTimeDisplay(time);
}

function syncVideoPlay(time) {
    if (currentVideoType === 'local' && localPlayer && isVideoLoaded) {
        localPlayer.currentTime = time;
        localPlayer.play();
    }
    // YouTube player sync would need YouTube API integration
}

function syncVideoPause(time) {
    if (currentVideoType === 'local' && localPlayer && isVideoLoaded) {
        localPlayer.currentTime = time;
        localPlayer.pause();
    }
    // YouTube player sync would need YouTube API integration
}

function syncVideoSeek(time) {
    if (currentVideoType === 'local' && localPlayer && isVideoLoaded) {
        localPlayer.currentTime = time;
    }
    updateTimeDisplay(time);
    // YouTube player sync would need YouTube API integration
}

// UI Helper functions
function updateUserList(users) {
    const userList = document.getElementById('user-list');
    const userCount = document.getElementById('user-count');
    
    userList.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'flex items-center text-sm text-gray-300';
        userElement.innerHTML = `
            <i class="fas fa-user mr-2 text-gray-500"></i>
            ${user}
            ${user === window.roomData.username ? ' (You)' : ''}
        `;
        userList.appendChild(userElement);
    });
    
    userCount.textContent = users.length;
}

function updatePendingUsers(pendingUsers) {
    if (!window.roomData.is_host) return;
    
    const pendingSection = document.getElementById('pending-section');
    const pendingList = document.getElementById('pending-list');
    
    if (pendingUsers.length === 0) {
        pendingSection.classList.add('hidden');
        return;
    }
    
    pendingSection.classList.remove('hidden');
    pendingList.innerHTML = '';
    
    pendingUsers.forEach(username => {
        const pendingElement = document.createElement('div');
        pendingElement.className = 'flex items-center justify-between text-sm bg-gray-700 p-2 rounded';
        pendingElement.innerHTML = `
            <span>${username}</span>
            <div class="flex space-x-1">
                <button onclick="approveUser('${username}')" 
                        class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="rejectUser('${username}')" 
                        class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        pendingList.appendChild(pendingElement);
    });
}

function approveUser(username) {
    socket.emit('approve_user', { username: username });
}

function rejectUser(username) {
    socket.emit('reject_user', { username: username });
}

function addChatMessage(username, message, timestamp = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    
    if (username === 'system') {
        messageElement.className = 'text-center text-gray-500 text-sm italic';
        messageElement.textContent = message;
    } else {
        const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        messageElement.className = 'bg-gray-700 rounded-lg p-3';
        messageElement.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-purple-300">${username}</span>
                <span class="text-xs text-gray-500">${time}</span>
            </div>
            <div class="text-white">${escapeHtml(message)}</div>
        `;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateTimeDisplay(seconds) {
    const timeDisplay = document.getElementById('time-display');
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 
        'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event handlers
function setupEventHandlers() {
    // Skip if user is pending approval
    if (window.roomData.pending_approval) {
        return;
    }

    // Chat form
    document.getElementById('chat-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message) {
            socket.emit('send_message', {
                message: message,
                timestamp: new Date().toISOString()
            });
            input.value = '';
        }
    });

    // YouTube URL
    document.getElementById('set-youtube-btn').addEventListener('click', function() {
        const urlInput = document.getElementById('youtube-url');
        const url = urlInput.value.trim();
        
        if (url) {
            socket.emit('set_youtube_video', { url: url });
            urlInput.value = '';
        }
    });

    // Video upload
    const uploadBtn = document.getElementById('upload-btn');
    const uploadInput = document.getElementById('video-upload');
    
    uploadBtn.addEventListener('click', function() {
        uploadInput.click();
    });

    uploadInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            uploadVideo(file);
        }
    });

    // Video controls
    document.getElementById('play-btn').addEventListener('click', function() {
        if (currentVideoType === 'local' && localPlayer) {
            const currentTime = localPlayer.currentTime || 0;
            socket.emit('video_play', { time: currentTime });
        }
    });

    document.getElementById('pause-btn').addEventListener('click', function() {
        if (currentVideoType === 'local' && localPlayer) {
            const currentTime = localPlayer.currentTime || 0;
            socket.emit('video_pause', { time: currentTime });
        }
    });

    // Seek bar
    const seekBar = document.getElementById('seek-bar');
    seekBar.addEventListener('change', function() {
        if (currentVideoType === 'local' && localPlayer && localPlayer.duration) {
            const seekTime = (this.value / 100) * localPlayer.duration;
            socket.emit('video_seek', { time: seekTime });
        }
    });

    // Local video player events
    localPlayer = document.getElementById('local-player');
    if (localPlayer) {
        localPlayer.addEventListener('timeupdate', function() {
            if (this.duration) {
                const progress = (this.currentTime / this.duration) * 100;
                seekBar.value = progress;
                updateTimeDisplay(this.currentTime);
            }
        });
    }
}

function uploadVideo(file) {
    const formData = new FormData();
    formData.append('video_file', file);
    
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    progressContainer.classList.remove('hidden');
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
        }
    });
    
    xhr.addEventListener('load', function() {
        progressContainer.classList.add('hidden');
        
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            showNotification('Video uploaded successfully!', 'success');
        } else {
            const error = JSON.parse(xhr.responseText);
            showNotification(error.error || 'Upload failed', 'error');
        }
    });
    
    xhr.addEventListener('error', function() {
        progressContainer.classList.add('hidden');
        showNotification('Upload failed', 'error');
    });
    
    xhr.open('POST', `/upload_video/${window.roomData.room_code}`);
    xhr.send(formData);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Room page loaded, initializing...');
    
    // Skip initialization if user is pending approval
    if (window.roomData.pending_approval) {
        console.log('User pending approval, skipping socket initialization');
        return;
    }
    
    initializeSocket();
    setupEventHandlers();
});
