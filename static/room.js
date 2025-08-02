// Room-specific JavaScript functionality

let youtubePlayer = null;
let localVideo = null;
let lastMessageId = 0;
let syncInterval = null;
let chatPollInterval = null;
let roomCode = '';
let isHost = false;
let currentVideoType = '';
let isSyncing = false;
let unreadCount = 0;
let isChatOpen = false;
let lastNotificationTime = 0;
let memberCount = 0;
let lastMemberCount = 0;
let lastVideoUrl = '';
let lastVideoType = '';
let disableAutoRefresh = false; // Debug flag to disable auto-refresh
let processedVideoMessages = new Set(); // Track processed video change messages
let lastVideoCheckTime = 0; // Track last video check time

// Socket.IO connection
let socket = null;

// Initialize room functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get room code from URL
    const pathParts = window.location.pathname.split('/');
    roomCode = pathParts[pathParts.length - 1];
    
    // Check if user is host
    const hostIndicator = document.querySelector('[data-host="true"]');
    isHost = hostIndicator !== null;
    
    // Get current video type
    const videoTypeElement = document.querySelector('[data-video-type]');
    currentVideoType = videoTypeElement ? videoTypeElement.dataset.videoType : '';
    
    // Get current user ID
    const userElement = document.querySelector('[data-user-id]');
    window.currentUserId = userElement ? userElement.dataset.userId : 'unknown';
    
    // Initialize last video state
    lastVideoUrl = window.currentVideoUrl || '';
    lastVideoType = currentVideoType;
    
    // No longer needed - using dynamic video updates instead
    
    // Clear processed messages set periodically to prevent memory leaks
    setInterval(() => {
        processedVideoMessages.clear();
        console.log('Cleared processed video messages set');
    }, 60000); // Clear every minute
    
    // Initialize member count and list
    initializeMemberData();
    
    // Initialize mobile notifications
    initializeMobileNotifications();
    
    // Start polling for updates
    startPolling();
    
    // No initial sync for video changes - only sync when host uploads/loads video
    
    // Initialize YouTube player if needed
    if (currentVideoType === 'youtube') {
        initializeYouTubePlayer();
    }
    
    // Initialize local video if needed
    if (currentVideoType === 'local') {
        initializeLocalVideo();
    }
    
    // Set up chat functionality
    setupChat();
    
    // Initialize chat sidebar state
    initializeChatSidebar();
    
    // Initialize chat polling
    initializeChat();
    
    // Set up video controls
    setupVideoControls();
    
    // Set up mobile chat toggle
    setupMobileChatToggle();
    
    // Set up mobile optimizations
    setupMobileOptimizations();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Socket.IO connection
    initializeSocketIO();
    
    // Observe chat sidebar for visibility changes
    const chatSidebar = document.getElementById('chatSidebar');
    if (chatSidebar) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    handleChatVisibilityChange();
                }
            });
        });
        observer.observe(chatSidebar, { attributes: true });
    }
});

// Initialize Socket.IO connection
function initializeSocketIO() {
    // Connect to Socket.IO server
    socket = io();
    
    // Connection events
    socket.on('connect', function() {
        console.log('Connected to Socket.IO server');
        
        // Join the room
        socket.emit('join_room', {
            room_code: roomCode
        });
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from Socket.IO server');
    });
    
    // Video change events
    socket.on('video_changed', function(data) {
        console.log('Received video change event:', data);
        
        const { video_url, video_type, changed_by } = data;
        
        // Update video content for all users
        updateVideoContent(video_url, video_type);
        
        // Show notification
        showVideoChangeNotification();
        
        // Update global state
        currentVideoUrl = video_url;
        currentVideoType = video_type;
        lastVideoUrl = video_url;
        lastVideoType = video_type;
    });
    
    // Video control events
    socket.on('video_control_update', function(data) {
        console.log('Received video control event:', data);
        
        const { action, time, controlled_by } = data;
        
        // Apply video control based on action
        if (action === 'play') {
            if (currentVideoType === 'youtube' && youtubePlayer) {
                youtubePlayer.playVideo();
            } else if (currentVideoType === 'local' && localVideo) {
                localVideo.play();
            }
        } else if (action === 'pause') {
            if (currentVideoType === 'youtube' && youtubePlayer) {
                youtubePlayer.pauseVideo();
            } else if (currentVideoType === 'local' && localVideo) {
                localVideo.pause();
            }
        } else if (action === 'seek') {
            if (currentVideoType === 'youtube' && youtubePlayer) {
                youtubePlayer.seekTo(time, true);
            } else if (currentVideoType === 'local' && localVideo) {
                localVideo.currentTime = time;
            }
        }
    });
}

// Initialize member data
function initializeMemberData() {
    // Get initial member count from the page
    const memberCountElement = document.querySelector('.member-count');
    if (memberCountElement) {
        const match = memberCountElement.textContent.match(/Members \((\d+)\)/);
        if (match) {
            memberCount = parseInt(match[1]);
            lastMemberCount = memberCount;
        }
    }
    
    // Get current video URL from the page
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        const youtubePlayer = videoContainer.querySelector('#youtubePlayer');
        const localVideo = videoContainer.querySelector('#localVideo');
        
        if (youtubePlayer && youtubePlayer.dataset.videoUrl) {
            window.currentVideoUrl = youtubePlayer.dataset.videoUrl;
        } else if (localVideo && localVideo.src) {
            window.currentVideoUrl = localVideo.src;
        }
    }
    
    // Poll for updates immediately
    pollMemberCount();
    pollMemberList();
}

// Setup functions
function setupChat() {
    // Initialize chat functionality
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    
    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendChatMessage(e);
        });
        
        // Clear unread count when user starts typing
        chatInput.addEventListener('focus', function() {
            clearUnreadCount();
        });
        
        // Handle Enter key press
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage(e);
            }
        });
    }
}

// Initialize chat sidebar state
function initializeChatSidebar() {
    const chatSidebar = document.getElementById('chatSidebar');
    if (chatSidebar) {
        // Ensure initial state is correct
        if (window.innerWidth <= 770) {
            // Mobile: start closed
            chatSidebar.style.transform = 'translateX(100%)';
            chatSidebar.classList.remove('open');
        } else {
            // Desktop: start open
            chatSidebar.style.transform = 'none';
            chatSidebar.classList.add('open');
        }
    }
}

function setupVideoControls() {
    // Set up video control buttons
    const playPauseBtn = document.getElementById('playPauseBtn');
    const seekBackBtn = document.getElementById('seekBackBtn');
    const seekForwardBtn = document.getElementById('seekForwardBtn');
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
            sendVideoControl('toggle_play');
        });
    }
    
    if (seekBackBtn) {
        seekBackBtn.addEventListener('click', function() {
            sendVideoControl('seek_back');
        });
    }
    
    if (seekForwardBtn) {
        seekForwardBtn.addEventListener('click', function() {
            sendVideoControl('seek_forward');
        });
    }
}

function setupMobileChatToggle() {
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatSidebar = document.getElementById('chatSidebar');
    
    if (chatToggleBtn && chatSidebar) {
        chatToggleBtn.addEventListener('click', function() {
            toggleMobileChat();
        });
    }
}

function setupEventListeners() {
    // Clear unread count when page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            clearUnreadCount();
        }
    });
    
    // Clear unread count when document gains focus
    document.addEventListener('focus', function() {
        clearUnreadCount();
    });
    
    // Set up file upload
    setupFileUpload();
}

function initializeYouTubePlayer() {
    // Get current video URL from the room data
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        const youtubePlayer = videoContainer.querySelector('#youtubePlayer');
        if (youtubePlayer && youtubePlayer.dataset.videoUrl) {
            const videoUrl = youtubePlayer.dataset.videoUrl;
            initializeYouTubePlayerWithUrl(videoUrl);
        }
    }
}

function initializeLocalVideo() {
    localVideo = document.getElementById('localVideo');
    if (localVideo) {
        setupLocalVideoEvents();
    }
}

// YouTube Player Integration
function initializeYouTubePlayerWithUrl(videoUrl) {
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) return;
    
    if (typeof YT !== 'undefined' && YT.Player) {
        createYouTubePlayer(videoId);
    } else {
        // Wait for YouTube API to load
        window.onYouTubeIframeAPIReady = () => {
            createYouTubePlayer(videoId);
        };
    }
}

function createYouTubePlayer(videoId) {
    const playerVars = {
        'modestbranding': 1,
        'rel': 0,
        'showinfo': 0
    };
    
    // Only host can control video playback
    if (isHost) {
        playerVars['controls'] = 1;
        playerVars['disablekb'] = 0;
        playerVars['fs'] = 0; // Disable fullscreen for host (they have controls)
    } else {
        // For non-host users, disable controls but keep fullscreen
        playerVars['controls'] = 0;
        playerVars['disablekb'] = 1;
        playerVars['fs'] = 1; // Enable fullscreen button for users
    }
    
    youtubePlayer = new YT.Player('youtubePlayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: playerVars,
        events: {
            onReady: onYouTubePlayerReady,
            onStateChange: onYouTubePlayerStateChange
        }
    });
}

function onYouTubePlayerReady(event) {
    // Sync with current room state after a short delay to ensure player is fully loaded
    setTimeout(() => {
        syncVideoState();
    }, 1000);
}

function onYouTubePlayerStateChange(event) {
    if (isSyncing) return;
    
    const currentTime = youtubePlayer.getCurrentTime();
    let action = null;
    
    switch (event.data) {
        case YT.PlayerState.PLAYING:
            action = 'play';
            break;
        case YT.PlayerState.PAUSED:
            action = 'pause';
            break;
        case YT.PlayerState.ENDED:
            action = 'pause';
            break;
    }
    
    if (action) {
        sendVideoControl(action, currentTime);
    }
}

// Local Video Integration
function setupLocalVideoEvents() {
    // Get the current local video element
    const currentLocalVideo = document.getElementById('localVideo');
    if (!currentLocalVideo) {
        console.log('No local video element found for event setup');
        return;
    }
    
    // Update global reference
    localVideo = currentLocalVideo;
    
    // Only host can control video playback
    if (isHost) {
        localVideo.setAttribute('controls', 'controls');
        
        // Remove existing event listeners to prevent duplicates
        localVideo.removeEventListener('play', handleLocalVideoPlay);
        localVideo.removeEventListener('pause', handleLocalVideoPause);
        localVideo.removeEventListener('seeked', handleLocalVideoSeek);
        
        // Add event listeners only for host
        localVideo.addEventListener('play', handleLocalVideoPlay);
        localVideo.addEventListener('pause', handleLocalVideoPause);
        localVideo.addEventListener('seeked', handleLocalVideoSeek);
        
        console.log('Local video events setup complete (host mode)');
    } else {
        // For non-host users, remove controls but keep fullscreen capability
        localVideo.removeAttribute('controls');
        
        // Add custom fullscreen button for non-host users
        addFullscreenButton(localVideo);
        
        console.log('Local video events setup complete (user mode - fullscreen only)');
    }
}

// Local video event handlers
function handleLocalVideoPlay() {
    if (!isSyncing && localVideo) {
        console.log('Local video play event');
        isSyncing = true;
        sendVideoControl('play', localVideo.currentTime);
        setTimeout(() => { isSyncing = false; }, 1000);
    }
}

function handleLocalVideoPause() {
    if (!isSyncing && localVideo) {
        console.log('Local video pause event');
        isSyncing = true;
        sendVideoControl('pause', localVideo.currentTime);
        setTimeout(() => { isSyncing = false; }, 1000);
    }
}

function handleLocalVideoSeek() {
    if (!isSyncing && localVideo) {
        console.log('Local video seek event');
        isSyncing = true;
        sendVideoControl('seek', localVideo.currentTime);
        setTimeout(() => { isSyncing = false; }, 1000);
    }
}

// Add fullscreen button for non-host users
function addFullscreenButton(videoElement) {
    // Remove existing fullscreen button if any
    const existingButton = document.getElementById('fullscreenButton');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Create fullscreen button
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'fullscreenButton';
    fullscreenButton.innerHTML = '⛶'; // Fullscreen icon
    fullscreenButton.className = 'absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded z-10 hover:bg-opacity-70 transition-all';
    fullscreenButton.title = 'Fullscreen';
    
    // Add click event
    fullscreenButton.addEventListener('click', () => {
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) {
            videoElement.msRequestFullscreen();
        }
    });
    
    // Add button to video container
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(fullscreenButton);
    }
    
    console.log('Fullscreen button added for non-host user');
}

// Mobile-specific optimizations
function setupMobileOptimizations() {
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Recalculate video container height
            const videoContainer = document.querySelector('.video-container');
            if (videoContainer) {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (isLandscape) {
                    videoContainer.style.height = 'calc(100vh - 80px)';
                } else {
                    videoContainer.style.height = 'calc(100vh - 120px)';
                }
            }
        }, 100);
    });
    
    // Mobile-friendly upload progress
    const fileInput = document.getElementById('videoFile');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Show mobile upload progress
                const mobileProgress = document.getElementById('mobileUploadProgress');
                const mobileProgressBar = document.getElementById('mobileUploadBar');
                const uploadPercentage = document.getElementById('uploadPercentage');
                
                if (mobileProgress && mobileProgressBar && uploadPercentage) {
                    mobileProgress.classList.remove('hidden');
                    
                    // Enhanced progress animation
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += Math.random() * 15;
                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(interval);
                            
                            // Hide progress after completion
                            setTimeout(() => {
                                mobileProgress.classList.add('hidden');
                            }, 2000);
                        }
                        
                        mobileProgressBar.style.width = progress + '%';
                        uploadPercentage.textContent = Math.round(progress) + '%';
                        
                        // Add pulse animation to percentage
                        uploadPercentage.style.animation = 'pulse 1s infinite';
                    }, 200);
                }
            }
        });
    }
    
    // Enhanced mobile button interactions
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Add smooth scrolling to chat
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.style.scrollBehavior = 'smooth';
    }
    
    // Enhanced mobile notifications
    if ('Notification' in window && Notification.permission === 'granted') {
        // Show welcome notification on mobile
        setTimeout(() => {
            new Notification('WatchWithMe', {
                body: 'Welcome to the room! Tap the chat button to start chatting.',
                icon: '/static/favicon.ico'
            });
        }, 2000);
    }
}

// Video Control Functions
function loadYouTubeVideo() {
    const urlInput = document.getElementById('youtubeUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }
    
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }
    
    // Emit Socket.IO event for real-time sync
    if (socket && socket.connected) {
        socket.emit('change_video', {
            room_code: roomCode,
            video_url: url,
            video_type: 'youtube',
            user_id: window.currentUserId || 'unknown'
        });
    }
    
    // Send to server for database persistence
    fetch(`/room/${roomCode}/video-control`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'load_youtube',
            url: url
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('YouTube video loaded successfully');
            urlInput.value = '';
            
            // Update current video URL
            window.currentVideoUrl = url;
            
            // Update video content dynamically for host
            updateVideoContent(url, 'youtube');
            
            // Show notification
            showVideoChangeNotification();
        } else {
            console.error('Error loading YouTube video:', data.error);
            alert('Error loading YouTube video: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error loading YouTube video:', error);
        alert('Failed to load video');
    });
}

// Make function globally available
window.loadYouTubeVideo = loadYouTubeVideo;

function sendVideoControl(action, time = 0) {
    if (!isHost) {
        console.log('Non-host user cannot send video controls');
        return;
    }
    
    console.log(`Sending video control: ${action} at time ${time}`);
    
    // Send via Socket.IO for real-time sync
    if (socket && socket.connected) {
        socket.emit('video_control', {
            room_code: roomCode,
            action: action,
            time: time,
            user_id: window.currentUserId || 'unknown'
        });
    }
    
    // Also send via HTTP for database persistence
    fetch(`/room/${roomCode}/video-control`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: action,
            time: time
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Video control sent successfully');
        } else {
            console.error('Error sending video control:', data.error);
        }
    })
    .catch(error => {
        console.error('Error sending video control:', error);
    });
}

// Update video content dynamically without page refresh
function updateVideoContent(videoUrl, videoType) {
    console.log('Updating video content:', { videoUrl, videoType });
    
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) {
        console.error('Video container not found');
        return;
    }
    
    // Clear existing video content
    videoContainer.innerHTML = '';
    
    if (videoType === 'youtube') {
        // Create YouTube player
        const youtubeDiv = document.createElement('div');
        youtubeDiv.id = 'youtubePlayer';
        youtubeDiv.className = 'w-full h-full';
        youtubeDiv.setAttribute('data-video-url', videoUrl);
        videoContainer.appendChild(youtubeDiv);
        
        // Initialize YouTube player
        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
            createYouTubePlayer(videoId);
        }
        
    } else if (videoType === 'local') {
        // Create local video element
        const videoElement = document.createElement('video');
        videoElement.id = 'localVideo';
        videoElement.className = 'w-full h-full';
        
        // Only host gets controls
        if (isHost) {
            videoElement.controls = true;
        }
        
        const sourceElement = document.createElement('source');
        sourceElement.src = videoUrl;
        sourceElement.type = 'video/mp4';
        
        videoElement.appendChild(sourceElement);
        videoElement.appendChild(document.createTextNode('Your browser does not support the video tag.'));
        
        videoContainer.appendChild(videoElement);
        
        // Wait for video to load before setting up events
        videoElement.addEventListener('loadedmetadata', () => {
            console.log('Local video loaded, setting up events');
            setupLocalVideoEvents();
        });
        
        // Fallback: setup events immediately if metadata is already loaded
        if (videoElement.readyState >= 1) {
            console.log('Local video already has metadata, setting up events immediately');
            setupLocalVideoEvents();
        }
        
    } else {
        // Show no video message
        const noVideoDiv = document.createElement('div');
        noVideoDiv.className = 'flex items-center justify-center h-full text-gray-400';
        noVideoDiv.innerHTML = `
            <div class="text-center">
                <i class="fas fa-video text-6xl mb-4"></i>
                <p class="text-xl">No video loaded</p>
                <p class="text-sm mt-2">Use the controls above to load a video</p>
            </div>
        `;
        videoContainer.appendChild(noVideoDiv);
    }
    
    // Update current video URL
    window.currentVideoUrl = videoUrl;
    currentVideoType = videoType;
    
    // Show a brief notification
    showVideoChangeNotification();
}

// Dynamic video change detection (no page refresh)
function checkForVideoChanges() {
    // Don't check if auto-refresh is disabled
    if (disableAutoRefresh) {
        console.log('Skipping video change check - disabled');
        return;
    }
    
    // Add cooldown period to prevent multiple checks in quick succession
    const now = Date.now();
    if (now - lastVideoCheckTime < 3000) { // 3 second cooldown
        console.log('Skipping video change check - cooldown period');
        return;
    }
    
    lastVideoCheckTime = now;
    
    fetch(`/room/${roomCode}/video-sync`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error('Video change check error:', data.error);
                return;
            }
            
            const currentVideoUrl = data.video_url || '';
            const currentVideoType = data.video_type || '';
            
            // Check if video has changed
            const videoChanged = currentVideoUrl && 
                               currentVideoUrl !== lastVideoUrl && 
                               currentVideoUrl !== window.currentVideoUrl;
            
            if (videoChanged && currentVideoUrl) {
                console.log('Video change detected, updating video content...');
                console.log('Previous:', { url: lastVideoUrl, type: lastVideoType });
                console.log('Current:', { url: currentVideoUrl, type: currentVideoType });
                
                // Update last known state
                lastVideoUrl = currentVideoUrl;
                lastVideoType = currentVideoType;
                
                // Update video content dynamically
                updateVideoContent(currentVideoUrl, currentVideoType);
            }
        })
        .catch(error => {
            console.error('Error checking for video changes:', error);
        });
}

// Check for video change notifications in chat messages
function checkForVideoChangeInMessages(messages) {
    for (const message of messages) {
        if (message.type === 'system' && 
            (message.message.includes('loaded a new YouTube video') || 
             message.message.includes('uploaded video'))) {
            
            // Check if we've already processed this message
            const messageKey = `${message.id}-${message.message}`;
            if (processedVideoMessages.has(messageKey)) {
                console.log('Already processed video change message:', message.message);
                continue;
            }
            
            console.log('Video change detected via chat message:', message.message);
            
            // Mark this message as processed
            processedVideoMessages.add(messageKey);
            
            // Only trigger if we're not already reloading and haven't processed this message
            if (!isReloading && !disableAutoRefresh) {
                // Trigger video change check for all users
                setTimeout(() => {
                    checkForVideoChanges();
                }, 500);
            }
            
            return true;
        }
    }
    return false;
}

// Video change notification
function showVideoChangeNotification() {
    // Show the video refresh indicator
    const refreshIndicator = document.getElementById('videoRefreshIndicator');
    if (refreshIndicator) {
        refreshIndicator.classList.remove('hidden');
    }
    
    // Also show a floating notification
    const notification = document.createElement('div');
    notification.id = 'videoChangeNotification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 9999;
            text-align: center;
            font-size: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        ">
            <div style="margin-bottom: 10px;">
                <i class="fas fa-sync-alt fa-spin" style="font-size: 24px; color: #3182ce;"></i>
            </div>
            <div>Loading new video...</div>
            <div style="font-size: 12px; color: #a0aec0; margin-top: 5px;">Please wait</div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds (in case reload doesn't happen)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        if (refreshIndicator) {
            refreshIndicator.classList.add('hidden');
        }
    }, 3000);
}

// No longer needed - using dynamic video updates instead

// Video Synchronization
function syncVideoState() {
    // Don't sync if page is not visible
    if (document.hidden) {
        console.log('Skipping sync - page hidden');
        return;
    }
    
    // Debug: log sync attempt
    console.log('Syncing video state...', { 
        lastVideoUrl, 
        lastVideoType,
        currentVideoUrl: window.currentVideoUrl,
        currentVideoType 
    });
    
    fetch(`/room/${roomCode}/video-sync`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error('Sync error:', data.error);
                return;
            }
            
            // Update current video URL and type for reference (for play/pause sync only)
            if (data.video_url) {
                window.currentVideoUrl = data.video_url;
            }
            
            if (data.video_type) {
                currentVideoType = data.video_type;
            }
            
            // Sync video state based on type (only for play/pause/time sync, not for video changes)
            if (data.video_type === 'youtube') {
                syncYouTubePlayer(data);
            } else if (data.video_type === 'local') {
                syncLocalVideo(data);
            }
        })
        .catch(error => {
            console.error('Error syncing video state:', error);
        });
}

function syncYouTubePlayer(data) {
    if (!youtubePlayer || typeof youtubePlayer.getPlayerState !== 'function') {
        console.log('YouTube player not ready for sync');
        return;
    }
    
    const currentTime = youtubePlayer.getCurrentTime();
    const targetTime = data.current_time;
    const timeDiff = Math.abs(currentTime - targetTime);
    const playerState = youtubePlayer.getPlayerState();
    
    console.log('YouTube sync:', {
        currentTime: currentTime.toFixed(2),
        targetTime: targetTime.toFixed(2),
        timeDiff: timeDiff.toFixed(2),
        isPlaying: data.is_playing,
        playerState: playerState
    });
    
    // Sync time if difference is more than 1 second
    if (timeDiff > 1) {
        console.log('Seeking YouTube to:', targetTime);
        youtubePlayer.seekTo(targetTime, true);
    }
    
    // Sync play/pause state
    if (data.is_playing) {
        // If host is playing, we should play too
        if (playerState === YT.PlayerState.PAUSED || 
            playerState === YT.PlayerState.CUED || 
            playerState === YT.PlayerState.ENDED) {
            console.log('Playing YouTube video');
            youtubePlayer.playVideo();
        }
    } else {
        // If host is paused, we should pause too
        if (playerState === YT.PlayerState.PLAYING || 
            playerState === YT.PlayerState.BUFFERING) {
            console.log('Pausing YouTube video');
            youtubePlayer.pauseVideo();
        }
    }
}

function syncLocalVideo(data) {
    // Get the current local video element (it might have been recreated)
    const currentLocalVideo = document.getElementById('localVideo');
    if (!currentLocalVideo) {
        console.log('Local video element not found for sync');
        return;
    }
    
    // Update the global localVideo reference
    localVideo = currentLocalVideo;
    
    const currentTime = localVideo.currentTime;
    const targetTime = data.current_time;
    const timeDiff = Math.abs(currentTime - targetTime);
    
    console.log('Local video sync:', {
        currentTime: currentTime.toFixed(2),
        targetTime: targetTime.toFixed(2),
        timeDiff: timeDiff.toFixed(2),
        isPlaying: data.is_playing,
        paused: localVideo.paused,
        readyState: localVideo.readyState,
        duration: localVideo.duration
    });
    
    // Add a small delay to prevent aggressive syncing
    if (isSyncing) {
        console.log('Skipping local video sync - already syncing');
        return;
    }
    
    // Don't sync if video is not ready (but be more lenient)
    if (localVideo.readyState < 1) {
        console.log('Local video not ready for sync (readyState:', localVideo.readyState, ')');
        return;
    }
    
    // Sync time if difference is more than 1 second and video has duration
    if (timeDiff > 1 && localVideo.duration > 0) {
        console.log('Seeking local video to:', targetTime);
        try {
            localVideo.currentTime = targetTime;
        } catch (error) {
            console.error('Error seeking local video:', error);
        }
    }
    
    // Sync play/pause state
    if (data.is_playing && localVideo.paused) {
        console.log('Playing local video');
        localVideo.play().catch(error => {
            console.error('Error playing local video:', error);
        });
    } else if (!data.is_playing && !localVideo.paused) {
        console.log('Pausing local video');
        localVideo.pause();
    }
}

// Chat Functions
function initializeChat() {
    // Get the last message ID for polling
    const lastMessage = document.querySelector('#chatMessages .message:last-child');
    if (lastMessage && lastMessage.dataset.messageId) {
        lastMessageId = parseInt(lastMessage.dataset.messageId);
    }
}

function sendChatMessage(event) {
    if (event) {
        event.preventDefault();
    }
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    fetch(`/room/${roomCode}/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.id) {
            chatInput.value = '';
            addChatMessage(data);
            lastMessageId = data.id;
        } else {
            console.error('Failed to send message:', data.error);
            alert(data.error || 'Failed to send message');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    });
}

function addChatMessage(messageData) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = messageData.id;
    
    if (messageData.type === 'system') {
        messageDiv.innerHTML = `
            <div class="text-center">
                <span class="text-xs text-gray-500 bg-discord-darkest px-2 py-1 rounded">
                    ${messageData.message}
                </span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="space-y-1">
                <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-white">${messageData.user_name}</span>
                    <span class="text-xs text-gray-500">${messageData.time}</span>
                </div>
                <p class="text-discord-text text-sm">${messageData.message}</p>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function pollChatMessages() {
    fetch(`/room/${roomCode}/messages?after_id=${lastMessageId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(messages => {
            let newMessages = 0;
            let hasVideoChange = false;
            
            messages.forEach(message => {
                addChatMessage(message);
                lastMessageId = Math.max(lastMessageId, message.id);
                newMessages++;
            });
            
            // Check for video change notifications in new messages
            if (newMessages > 0) {
                hasVideoChange = checkForVideoChangeInMessages(messages);
            }
            
            // Handle unread messages for mobile
            if (newMessages > 0 && !isChatVisible()) {
                // Increment unread count
                unreadCount += newMessages;
                updateUnreadCount(unreadCount);
                
                // Show mobile notification for new messages
                const now = Date.now();
                if (now - lastNotificationTime > 5000) { // Limit notifications to every 5 seconds
                    const latestMessage = messages[messages.length - 1];
                    if (latestMessage && latestMessage.type !== 'system') {
                        showMobileNotification(latestMessage);
                        lastNotificationTime = now;
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error polling chat messages:', error);
        });
}

// File Upload
function setupFileUpload() {
    const fileInput = document.getElementById('videoFile');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', handleVideoUpload);
}

function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid video file');
        return;
    }
    
    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size must be less than 500MB');
        return;
    }
    
    uploadVideoFile(file);
}

function uploadVideoFile(file) {
    const formData = new FormData();
    formData.append('video', file);
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadBar');
    
    if (progressDiv && progressBar) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
    }
    
    fetch(`/room/${roomCode}/upload-video`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (progressDiv && progressBar) {
            progressDiv.classList.add('hidden');
        }
        
        if (data.success) {
            console.log('Video uploaded successfully');
            
            // Emit Socket.IO event for real-time sync
            if (socket && socket.connected) {
                socket.emit('change_video', {
                    room_code: roomCode,
                    video_url: data.video_url,
                    video_type: 'local',
                    user_id: window.currentUserId || 'unknown'
                });
            }
            
            // Update video content dynamically for host
            updateVideoContent(data.video_url, 'local');
            
            // Show notification
            showVideoChangeNotification();
        } else {
            console.error('Upload failed:', data.error);
            alert('Upload failed: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        if (progressDiv && progressBar) {
            progressDiv.classList.add('hidden');
        }
        alert('Upload failed');
    });
    
    // Simulate upload progress (since we can't track real progress with fetch)
    if (progressBar) {
        simulateUploadProgress(progressBar);
    }
}



function simulateUploadProgress(progressBar) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 95) {
            clearInterval(interval);
            return;
        }
        progressBar.style.width = progress + '%';
    }, 200);
}

// Polling Functions
function startPolling() {
    // Only sync video state for play/pause/time sync, not for video changes
    // Video changes will be handled by immediate sync after upload/load
    syncInterval = setInterval(syncVideoState, 10000);
    
    // Poll chat messages every 5 seconds to prevent too frequent checks
    chatPollInterval = setInterval(pollChatMessages, 5000);
    
    // Poll member count every 10 seconds (reduced from 5 seconds)
    setInterval(pollMemberCount, 10000);
    
    // Poll member list every 15 seconds (reduced from 8 seconds)
    setInterval(pollMemberList, 15000);
    
    // Heartbeat to update video position every 5 seconds (reduced from 3 seconds)
    setInterval(sendHeartbeat, 5000);
    
    // Check if YouTube player is ready every 15 seconds (reduced from 8 seconds)
    if (!isHost && currentVideoType === 'youtube') {
        setInterval(checkYouTubePlayerReady, 15000);
    }
}

function checkYouTubePlayerReady() {
    if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function') {
        // Force a sync when player becomes ready
        syncVideoState();
    }
}

function sendHeartbeat() {
    let currentTime = 0;
    let isPlaying = false;
    let videoType = '';
    
    if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
        currentTime = youtubePlayer.getCurrentTime();
        isPlaying = youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;
        videoType = 'youtube';
    } else if (localVideo && !localVideo.paused) {
        currentTime = localVideo.currentTime;
        isPlaying = true;
        videoType = 'local';
    }
    
    if (currentTime > 0 && isPlaying) {
        console.log('Sending heartbeat:', { currentTime: currentTime.toFixed(2), isPlaying, videoType });
        sendVideoControl('heartbeat', currentTime);
    }
}

function stopPolling() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

// Utility Functions
function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Cleanup when leaving page
window.addEventListener('beforeunload', () => {
    stopPolling();
});

// Handle visibility change to pause/resume polling
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
        syncVideoState(); // Immediate sync when returning
        // Clear unread count when page becomes visible
        clearUnreadCount();
    }
});

// Handle page focus/blur for notifications
document.addEventListener('focus', () => {
    // Clear unread count when page gains focus
    clearUnreadCount();
});

document.addEventListener('blur', () => {
    // Page lost focus, notifications will be shown
});

// Chat visibility functions
function handleChatVisibilityChange() {
    if (isChatVisible()) {
        clearUnreadCount();
    }
}

function toggleMobileChat() {
    // Only work on mobile
    if (window.innerWidth > 770) {
        return;
    }
    
    const chatSidebar = document.getElementById('chatSidebar');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    
    if (chatSidebar && chatToggleBtn) {
        const currentTransform = chatSidebar.style.transform;
        const hasOpenClass = chatSidebar.classList.contains('open');
        
        // Check if chat is open (either transform is 0px or has open class)
        const isOpen = currentTransform === 'translateX(0px)' || hasOpenClass;
        
        if (isOpen) {
            // Close chat
            chatSidebar.style.transform = 'translateX(100%)';
            chatSidebar.classList.remove('open');
            isChatOpen = false;
        } else {
            // Open chat
            chatSidebar.style.transform = 'translateX(0px)';
            chatSidebar.classList.add('open');
            isChatOpen = true;
            if (typeof clearUnreadCount === 'function') {
                clearUnreadCount();
            }
        }
    }
}

// Member count functions
function updateMemberCount(count) {
    memberCount = count;
    const memberCountElements = document.querySelectorAll('.member-count');
    memberCountElements.forEach(element => {
        element.textContent = `Members (${count})`;
    });
}

function pollMemberCount() {
    fetch(`/room/${roomCode}/member-count`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.count !== lastMemberCount) {
                updateMemberCount(data.count);
                lastMemberCount = data.count;
            }
        })
        .catch(error => {
            console.error('Error polling member count:', error);
        });
}

// Member list functions
function updateMemberList(members) {
    const memberListContainer = document.querySelector('.mobile-members .space-y-2');
    if (!memberListContainer) return;
    
    memberListContainer.innerHTML = '';
    
    members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'flex items-center space-x-2';
        
        // Since User model doesn't have profile_image_url, always use default avatar
        const profileHtml = `<div class="w-6 h-6 bg-discord-accent rounded-full flex items-center justify-center">
            <i class="fas fa-user text-white text-xs"></i>
        </div>`;
        
        const hostIcon = member.role === 'host' ? '<i class="fas fa-crown text-yellow-500 text-xs"></i>' : '';
        
        memberDiv.innerHTML = `
            ${profileHtml}
            <span class="text-discord-text text-sm">${member.display_name}</span>
            ${hostIcon}
        `;
        
        memberListContainer.appendChild(memberDiv);
    });
}

function pollMemberList() {
    fetch(`/room/${roomCode}/members`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateMemberList(data.members);
            }
        })
        .catch(error => {
            console.error('Error polling member list:', error);
        });
}

// Check if chat is visible
function isChatVisible() {
    const chatSidebar = document.getElementById('chatSidebar');
    if (!chatSidebar) return false;
    
    // On mobile, check if sidebar is open
    if (window.innerWidth <= 770) {
        return chatSidebar.style.transform === 'translateX(0px)' || 
               chatSidebar.classList.contains('open');
    }
    
    // On desktop, chat is always visible
    return true;
}

// Update unread count based on chat visibility
function updateUnreadCountBasedOnVisibility() {
    if (isChatVisible()) {
        clearUnreadCount();
    }
}

// Mobile notification functions
function initializeMobileNotifications() {
    if (typeof Notification !== 'undefined') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied.');
            }
        });
    }
}

function showNotification(title, message, icon) {
    if (typeof Notification !== 'undefined') {
        new Notification(title, {
            body: message,
            icon: icon
        });
    } else {
        console.log('Notification API not supported.');
    }
}

function showMobileNotification(messageData) {
    if (typeof Notification !== 'undefined') {
        const title = messageData.user_name ? `${messageData.user_name}: ${messageData.message}` : messageData.message;
        new Notification(title, {
            body: messageData.message,
            icon: 'https://www.youtube.com/favicon.ico' // Use a placeholder icon
        });
    } else {
        console.log('Notification API not supported for mobile.');
    }
}

function updateUnreadCount(count) {
    unreadCount = count;
    const unreadBadge = document.getElementById('unreadBadge');
    if (unreadBadge) {
        unreadBadge.textContent = count > 0 ? count : '';
        unreadBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function clearUnreadCount() {
    unreadCount = 0;
    updateUnreadCount(0);
}

function incrementUnreadCount() {
    unreadCount++;
    updateUnreadCount(unreadCount);
}

function decrementUnreadCount() {
    unreadCount--;
    updateUnreadCount(unreadCount);
}

// Export functions for global access
window.roomFunctions = {
    loadYouTubeVideo,
    toggleMobileChat,
    syncVideoState,
    updateUnreadCount,
    clearUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount
};

// Debug functions
window.debugRoom = {
    disableAutoRefresh: () => { disableAutoRefresh = true; console.log('Auto-refresh disabled'); },
    enableAutoRefresh: () => { disableAutoRefresh = false; console.log('Auto-refresh enabled'); },
    getState: () => ({ lastVideoUrl, lastVideoType, disableAutoRefresh }),
    forceSync: () => syncVideoState(),
    checkVideoChanges: () => checkForVideoChanges(),
    updateVideo: (url, type) => updateVideoContent(url, type),
    testSync: () => {
        console.log('=== Video Sync Test ===');
        console.log('YouTube Player:', youtubePlayer);
        console.log('Local Video:', localVideo);
        console.log('Current Video Type:', currentVideoType);
        console.log('Current Video URL:', window.currentVideoUrl);
        
        // Test sync
        syncVideoState();
    },
    testYouTubeSync: () => {
        if (youtubePlayer) {
            console.log('Testing YouTube sync...');
            const testData = {
                current_time: youtubePlayer.getCurrentTime() + 10,
                is_playing: true
            };
            syncYouTubePlayer(testData);
        } else {
            console.log('YouTube player not available');
        }
    },
    testLocalSync: () => {
        const currentLocalVideo = document.getElementById('localVideo');
        if (currentLocalVideo) {
            console.log('Testing local video sync...');
            const testData = {
                current_time: currentLocalVideo.currentTime + 10,
                is_playing: true
            };
            syncLocalVideo(testData);
        } else {
            console.log('Local video not available');
        }
    },
    setupLocalEvents: () => {
        console.log('Manually setting up local video events...');
        setupLocalVideoEvents();
    },
    checkLocalVideo: () => {
        const currentLocalVideo = document.getElementById('localVideo');
        console.log('Local video check:', {
            element: currentLocalVideo,
            globalRef: localVideo,
            readyState: currentLocalVideo ? currentLocalVideo.readyState : 'N/A',
            duration: currentLocalVideo ? currentLocalVideo.duration : 'N/A',
            currentTime: currentLocalVideo ? currentLocalVideo.currentTime : 'N/A',
            paused: currentLocalVideo ? currentLocalVideo.paused : 'N/A'
        });
    }
};

// Make functions globally accessible
window.toggleMobileChat = toggleMobileChat;
window.clearUnreadCount = clearUnreadCount;
window.initializeChatSidebar = initializeChatSidebar;
