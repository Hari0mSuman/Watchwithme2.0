// Main JavaScript file for WatchWithMe
console.log('WatchWithMe main.js loaded');

// Utility functions
function showNotification(message, type = 'info') {
    // Simple notification system
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

// Form validation helpers
function validateUsername(username) {
    return username && username.trim().length >= 2;
}

function validateRoomCode(roomCode) {
    return roomCode && /^[A-Z0-9]{6}$/.test(roomCode.trim());
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing main.js');
    
    // Auto-focus first input
    const firstInput = document.querySelector('input[type="text"]');
    if (firstInput) {
        firstInput.focus();
    }
});
