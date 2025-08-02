import os
import logging
from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1) # needed for url_for to generate with https

# configure the database, relative to the app instance folder
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL","sqlite:///app.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# File upload configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

# initialize the app with the extension, flask-sqlalchemy >= 3.0.x
db.init_app(app)

# Initialize Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_room')
def handle_join_room(data):
    """Handle client joining a room"""
    room_code = data.get('room_code')
    if room_code:
        join_room(room_code)
        print(f'Client {request.sid} joined room: {room_code}')

@socketio.on('leave_room')
def handle_leave_room(data):
    """Handle client leaving a room"""
    room_code = data.get('room_code')
    if room_code:
        leave_room(room_code)
        print(f'Client {request.sid} left room: {room_code}')

@socketio.on('change_video')
def handle_change_video(data):
    """Handle video change from host and broadcast to all users in room"""
    room_code = data.get('room_code')
    video_url = data.get('video_url')
    video_type = data.get('video_type')
    user_id = data.get('user_id')
    
    if room_code and video_url and video_type:
        # Update room state in database
        from models import Room
        from routes import current_user
        
        room = Room.query.filter_by(room_code=room_code.upper()).first()
        if room:
            room.current_video_url = video_url
            room.current_video_type = video_type
            room.current_video_time = 0
            room.is_playing = False
            room.last_sync_time = datetime.now()
            db.session.commit()
            
            # Broadcast video change to all users in the room
            emit('video_changed', {
                'video_url': video_url,
                'video_type': video_type,
                'changed_by': user_id
            }, room=room_code, include_self=False)
            
            print(f'Video changed in room {room_code}: {video_type} - {video_url}')

@socketio.on('video_control')
def handle_video_control(data):
    """Handle video control (play/pause/seek) from host and broadcast to all users"""
    room_code = data.get('room_code')
    action = data.get('action')
    time = data.get('time', 0)
    user_id = data.get('user_id')
    
    if room_code and action:
        # Update room state in database
        from models import Room
        from datetime import datetime
        
        room = Room.query.filter_by(room_code=room_code.upper()).first()
        if room:
            if action == 'play':
                room.is_playing = True
            elif action == 'pause':
                room.is_playing = False
            elif action == 'seek':
                room.current_video_time = time
            
            room.current_video_time = time
            room.last_sync_time = datetime.now()
            db.session.commit()
            
            # Broadcast video control to all users in the room
            emit('video_control_update', {
                'action': action,
                'time': time,
                'controlled_by': user_id
            }, room=room_code, include_self=False)
            
            print(f'Video control in room {room_code}: {action} at {time}s')

with app.app_context():
    # Make sure to import the models here or their tables won't be created
    import models  # noqa: F401
    db.create_all()
    logging.info("Database tables created")


