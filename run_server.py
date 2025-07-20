#!/usr/bin/env python3
import eventlet
eventlet.monkey_patch()

import os
import sys
import logging

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, socketio

if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    logger.info("Starting WatchWithMe server with SocketIO and eventlet...")
    logger.info("Server will be available at http://0.0.0.0:5000")
    
    # Run with SocketIO's built-in eventlet server
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=5000, 
        debug=False,
        use_reloader=False,
        log_output=True
    )