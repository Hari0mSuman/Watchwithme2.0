import eventlet
eventlet.monkey_patch()

from app import app, socketio

if __name__ == '__main__':
    # Run with eventlet mode for WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)