import os
import random
import string
import logging
from flask import Flask, render_template, request, session, redirect, url_for, send_from_directory, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
from werkzeug.utils import secure_filename
import uuid
from models import db, Room, RoomUser, PendingUser, ChatMessage

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
    "pool_size": 10,
    "max_overflow": 20
}
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///watchwithme.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # optional but recommended

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db.init_app(app)

# Initialize SocketIO with threading for WebSocket support (better compatibility with SQLAlchemy)
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins="*")

# Create all database tables
with app.app_context():
    db.create_all()

def generate_room_code():
    """Generate a unique 6-character room code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        existing_room = Room.query.filter_by(code=code).first()
        if not existing_room:
            return code

def is_allowed_file(filename):
    """Check if file extension is allowed for video uploads"""
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'ogg', 'wmv', 'flv', '3gp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Home page for joining or creating rooms"""
    return render_template('index.html')

@app.route('/create_room', methods=['POST'])
def create_room():
    """Create a new room with optional password"""
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    
    if not username:
        return redirect(url_for('index', error='Username is required'))
    
    try:
        # Generate unique room code
        room_code = generate_room_code()
        
        # Create new room in database
        new_room = Room(
            code=room_code,
            host_username=username,
            password=password if password else None
        )
        db.session.add(new_room)
        db.session.commit()
        
        # Add host as approved user
        room_user = RoomUser(
            room_id=new_room.id,
            username=username
        )
        db.session.add(room_user)
        db.session.commit()
        
        # Set session data
        session['username'] = username
        session['room_code'] = room_code
        session['is_host'] = True
        
        return redirect(url_for('room', room_code=room_code))
        
    except Exception as e:
        logging.error(f"Error creating room: {str(e)}")
        db.session.rollback()
        return redirect(url_for('index', error='Failed to create room'))

@app.route('/join_room', methods=['POST'])
def join_room_request():
    """Request to join an existing room"""
    username = request.form.get('username', '').strip()
    room_code = request.form.get('room_code', '').strip().upper()
    password = request.form.get('password', '').strip()
    
    if not username or not room_code:
        return redirect(url_for('index', error='Username and room code are required'))
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return redirect(url_for('index', error='Room not found'))
    
    # Check password if required
    if room.password and room.password != password:
        return redirect(url_for('index', error='Incorrect password'))
    
    try:
        # Check if user is already approved
        existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
        if existing_user:
            session['username'] = username
            session['room_code'] = room_code
            session['is_host'] = (username == room.host_username)
            session['pending_approval'] = False
            return redirect(url_for('room', room_code=room_code))
        
        # Check if user is already pending
        existing_pending = PendingUser.query.filter_by(room_id=room.id, username=username).first()
        if not existing_pending:
            # Add to pending users
            pending_user = PendingUser(
                room_id=room.id,
                username=username
            )
            db.session.add(pending_user)
            db.session.commit()
        
        session['username'] = username
        session['room_code'] = room_code
        session['is_host'] = False
        session['pending_approval'] = True
        
        return redirect(url_for('room', room_code=room_code))
        
    except Exception as e:
        logging.error(f"Error joining room: {str(e)}")
        db.session.rollback()
        return redirect(url_for('index', error='Failed to join room'))

@app.route('/room/<room_code>')
def room(room_code):
    """Room page for watching videos together"""
    if 'username' not in session or session.get('room_code') != room_code:
        return redirect(url_for('index', error='Please join the room first'))
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return redirect(url_for('index', error='Room not found'))
    
    username = session['username']
    
    # Check if user needs approval
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if not existing_user and not session.get('is_host', False):
        session['pending_approval'] = True
    else:
        session['pending_approval'] = False
    
    # Convert room to dict for template compatibility
    room_data = room.to_dict()
    
    return render_template('room.html', 
                         room_code=room_code, 
                         username=username,
                         is_host=session.get('is_host', False),
                         pending_approval=session.get('pending_approval', False),
                         room_data=room_data)

@app.route('/upload_video/<room_code>', methods=['POST'])
def upload_video(room_code):
    """Handle video file upload"""
    if 'username' not in session or session.get('room_code') != room_code:
        return jsonify({'error': 'Unauthorized'}), 401
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    if 'video_file' not in request.files:
        return jsonify({'error': 'No file selected'}), 400
    
    file = request.files['video_file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not is_allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload a video file.'}), 400
    
    # Generate unique filename
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    try:
        file.save(file_path)
        
        # Update room with new video
        room.current_video = unique_filename
        room.video_type = 'local'
        room.video_time = 0
        room.is_playing = False
        db.session.commit()
        
        # Notify all users in the room
        socketio.emit('video_changed', {
            'video_type': 'local',
            'video_source': unique_filename,
            'time': 0,
            'is_playing': False
        }, room=room_code)
        
        return jsonify({'success': True, 'filename': unique_filename})
    
    except Exception as e:
        logging.error(f"Error uploading file: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to upload file'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded video files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Socket.IO Events
@socketio.on('connect')
def on_connect():
    """Handle client connection"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return False  # Reject connection
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return False  # Reject connection
    
    join_room(room_code)
    
    # Mark user as online if they're approved
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if existing_user:
        existing_user.is_online = True
        db.session.commit()
    
    # Get current users and pending users
    current_users = [u.username for u in RoomUser.query.filter_by(room_id=room.id, is_online=True).all()]
    pending_users = [p.username for p in PendingUser.query.filter_by(room_id=room.id).all()]
    
    # Send current room state to the new user
    emit('room_state', {
        'current_video': room.current_video,
        'video_type': room.video_type,
        'video_time': room.video_time,
        'is_playing': room.is_playing,
        'users': current_users,
        'pending_users': pending_users
    })
    
    # Notify other users
    emit('user_joined', {'username': username}, room=room_code, include_self=False)
    
    logging.info(f"User {username} connected to room {room_code}")

@socketio.on('disconnect')
def on_disconnect():
    """Handle client disconnection"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if username and room_code:
        room = Room.query.filter_by(code=room_code).first()
        if room:
            # Mark user as offline
            existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
            if existing_user:
                existing_user.is_online = False
                db.session.commit()
        
        # Notify other users
        emit('user_left', {'username': username}, room=room_code)
        
        logging.info(f"User {username} disconnected from room {room_code}")

@socketio.on('send_message')
def handle_message(data):
    """Handle chat messages"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    message = data.get('message', '').strip()
    if not message:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    try:
        # Save message to database
        chat_message = ChatMessage(
            room_id=room.id,
            username=username,
            message=message
        )
        db.session.add(chat_message)
        db.session.commit()
        
        # Broadcast message to room
        emit('new_message', {
            'username': username,
            'message': message,
            'timestamp': chat_message.timestamp.isoformat()
        }, room=room_code)
        
    except Exception as e:
        logging.error(f"Error saving chat message: {str(e)}")
        db.session.rollback()

@socketio.on('video_play')
def handle_video_play(data):
    """Handle video play event"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Check if user is approved
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if not existing_user:
        return
    
    try:
        room.is_playing = True
        room.video_time = data.get('time', 0)
        db.session.commit()
        
        emit('video_play', {'time': room.video_time}, room=room_code, include_self=False)
    except Exception as e:
        logging.error(f"Error handling video play: {str(e)}")
        db.session.rollback()

@socketio.on('video_pause')
def handle_video_pause(data):
    """Handle video pause event"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Check if user is approved
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if not existing_user:
        return
    
    try:
        room.is_playing = False
        room.video_time = data.get('time', 0)
        db.session.commit()
        
        emit('video_pause', {'time': room.video_time}, room=room_code, include_self=False)
    except Exception as e:
        logging.error(f"Error handling video pause: {str(e)}")
        db.session.rollback()

@socketio.on('video_seek')
def handle_video_seek(data):
    """Handle video seek event"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Check if user is approved
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if not existing_user:
        return
    
    try:
        room.video_time = data.get('time', 0)
        db.session.commit()
        
        emit('video_seek', {'time': room.video_time}, room=room_code, include_self=False)
    except Exception as e:
        logging.error(f"Error handling video seek: {str(e)}")
        db.session.rollback()

@socketio.on('set_youtube_video')
def handle_youtube_video(data):
    """Handle YouTube video URL change"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Check if user is approved
    existing_user = RoomUser.query.filter_by(room_id=room.id, username=username).first()
    if not existing_user:
        return
    
    youtube_url = data.get('url', '').strip()
    if not youtube_url:
        return
    
    # Extract YouTube video ID
    video_id = None
    if 'youtube.com/watch?v=' in youtube_url:
        video_id = youtube_url.split('watch?v=')[1].split('&')[0]
    elif 'youtu.be/' in youtube_url:
        video_id = youtube_url.split('youtu.be/')[1].split('?')[0]
    
    if not video_id:
        emit('error', {'message': 'Invalid YouTube URL'})
        return
    
    try:
        # Update room with new video
        room.current_video = video_id
        room.video_type = 'youtube'
        room.video_time = 0
        room.is_playing = False
        db.session.commit()
        
        # Notify all users in the room
        emit('video_changed', {
            'video_type': 'youtube',
            'video_source': video_id,
            'time': 0,
            'is_playing': False
        }, room=room_code)
    except Exception as e:
        logging.error(f"Error setting YouTube video: {str(e)}")
        db.session.rollback()

@socketio.on('approve_user')
def handle_approve_user(data):
    """Handle host approving a pending user"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Only host can approve users
    if username != room.host_username:
        return
    
    pending_username = data.get('username')
    if not pending_username:
        return
    
    try:
        # Find and remove from pending users
        pending_user = PendingUser.query.filter_by(room_id=room.id, username=pending_username).first()
        if pending_user:
            db.session.delete(pending_user)
            
            # Add to approved users
            room_user = RoomUser(
                room_id=room.id,
                username=pending_username,
                is_online=True
            )
            db.session.add(room_user)
            db.session.commit()
            
            # Get updated pending users list
            pending_users = [p.username for p in PendingUser.query.filter_by(room_id=room.id).all()]
            
            # Notify the approved user and update room
            emit('user_approved', {'username': pending_username}, room=room_code)
            emit('pending_users_updated', {'pending_users': pending_users}, room=room_code)
            
    except Exception as e:
        logging.error(f"Error approving user: {str(e)}")
        db.session.rollback()

@socketio.on('reject_user')
def handle_reject_user(data):
    """Handle host rejecting a pending user"""
    username = session.get('username')
    room_code = session.get('room_code')
    
    if not username or not room_code:
        return
    
    room = Room.query.filter_by(code=room_code).first()
    if not room:
        return
    
    # Only host can reject users
    if username != room.host_username:
        return
    
    pending_username = data.get('username')
    if not pending_username:
        return
    
    try:
        # Find and remove from pending users
        pending_user = PendingUser.query.filter_by(room_id=room.id, username=pending_username).first()
        if pending_user:
            db.session.delete(pending_user)
            db.session.commit()
            
            # Get updated pending users list
            pending_users = [p.username for p in PendingUser.query.filter_by(room_id=room.id).all()]
            
            # Notify about the rejection
            emit('user_rejected', {'username': pending_username}, room=room_code)
            emit('pending_users_updated', {'pending_users': pending_users}, room=room_code)
            
    except Exception as e:
        logging.error(f"Error rejecting user: {str(e)}")
        db.session.rollback()
     
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
   
