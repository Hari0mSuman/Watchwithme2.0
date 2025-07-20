from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), unique=True, nullable=False, index=True)
    host_username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=True)
    current_video = db.Column(db.String(500), nullable=True)
    video_type = db.Column(db.String(20), nullable=True)  # 'youtube' or 'local'
    video_time = db.Column(db.Float, default=0.0)
    is_playing = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('RoomUser', backref='room', lazy=True, cascade='all, delete-orphan')
    pending_users = db.relationship('PendingUser', backref='room', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'code': self.code,
            'host': self.host_username,
            'password': self.password,
            'current_video': self.current_video,
            'video_type': self.video_type,
            'video_time': self.video_time,
            'is_playing': self.is_playing,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RoomUser(db.Model):
    __tablename__ = 'room_users'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=True)
    
    # Unique constraint to prevent duplicate users in same room
    __table_args__ = (db.UniqueConstraint('room_id', 'username', name='unique_room_user'),)

class PendingUser(db.Model):
    __tablename__ = 'pending_users'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate pending requests
    __table_args__ = (db.UniqueConstraint('room_id', 'username', name='unique_pending_user'),)

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    room = db.relationship('Room', backref='chat_messages', lazy=True)
    
    def to_dict(self):
        return {
            'username': self.username,
            'message': self.message,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }