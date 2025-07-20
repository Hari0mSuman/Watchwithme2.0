# WatchWithMe - Real-time Video Watching Platform

## Overview

WatchWithMe is a Flask-based web application that enables multiple users to watch videos together in real-time synchronization. The platform supports both YouTube video URLs and local video file uploads, featuring room-based sessions with host approval systems and real-time chat functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Flask with Flask-SocketIO for real-time communication
- **Session Management**: Flask sessions with configurable secret keys
- **Real-time Communication**: WebSocket connections using SocketIO with threading async mode
- **File Handling**: Werkzeug utilities for secure file uploads
- **Storage**: In-memory data structures for room and user management (production-ready for Redis/database migration)

### Frontend Architecture
- **Styling**: Tailwind CSS for responsive UI components
- **Icons**: Font Awesome for visual elements
- **Real-time Client**: Socket.IO client library for WebSocket communication
- **Video Players**: 
  - HTML5 video element for local files
  - YouTube iframe embeds for YouTube content

### Data Storage Strategy
- **Current**: PostgreSQL database with SQLAlchemy ORM
- **Architecture**: Persistent storage with normalized table structure
- **Models**: Room, RoomUser, PendingUser, ChatMessage tables
- **Migration**: Successfully migrated from in-memory to database storage

## Key Components

### Room Management System
- **Room Creation**: Generates unique 6-character alphanumeric codes
- **Access Control**: Optional password protection and host approval workflow
- **User Sessions**: Persistent user state management across connections

### Video Synchronization Engine
- **Dual Player Support**: Seamless switching between YouTube and local video players
- **Real-time Sync**: Play, pause, seek, and timestamp synchronization across all room participants
- **State Management**: Centralized video state tracking for consistent playback experience

### File Upload System
- **Security**: Filename sanitization and extension validation
- **Capacity**: 500MB maximum file size limit
- **Supported Formats**: Comprehensive video format support (mp4, avi, mov, mkv, webm, ogg, wmv, flv, 3gp)
- **Storage**: Local filesystem with `/uploads` directory structure

### Real-time Communication
- **Chat System**: Group messaging within rooms
- **User Notifications**: Join/leave events and system messages
- **Connection Management**: Automatic reconnection and connection state handling

## Data Flow

### Room Creation Flow
1. User submits room creation form with optional password
2. System generates unique room code and initializes room data structure
3. Creator automatically becomes host with full permissions
4. Room state stored in memory with user session binding

### Join Room Flow
1. User provides username and room code (with optional password)
2. System validates credentials and room existence
3. If password-protected, validates password match
4. Host receives join request for approval
5. Upon approval, user gains room access and receives current video state

### Video Synchronization Flow
1. Host or authorized user loads video (YouTube URL or file upload)
2. Server broadcasts video change to all room participants
3. Client players initialize with synchronized timestamp and play state
4. All playback controls (play/pause/seek) propagate through server to maintain sync

## External Dependencies

### Frontend Libraries
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Font Awesome**: Icon library for enhanced visual interface
- **Socket.IO Client**: Real-time bidirectional communication

### Backend Dependencies
- **Flask**: Core web framework
- **Flask-SocketIO**: WebSocket support for real-time features
- **Flask-SQLAlchemy**: Database ORM for PostgreSQL integration
- **PostgreSQL**: Primary database for persistent data storage
- **Eventlet**: Async worker for WebSocket support
- **Werkzeug**: WSGI utilities for secure file handling

### Third-party Integrations
- **YouTube**: Iframe embed integration for YouTube video playback
- **CDN Resources**: External delivery for frontend libraries

## Deployment Strategy

### Environment Configuration
- **Session Security**: Environment-based secret key configuration
- **Development Mode**: Built-in Flask development server support
- **Production Considerations**: Threading-based SocketIO for scalability

### File Storage
- **Local Development**: Filesystem-based upload storage
- **Production Migration Path**: Easily configurable for cloud storage solutions

### Database Architecture
- **PostgreSQL Tables**:
  - `rooms`: Core room data with video state
  - `room_users`: Approved users with online status
  - `pending_users`: Users awaiting host approval
  - `chat_messages`: Persistent chat history
- **Relationships**: Proper foreign key constraints and cascading deletes
- **Session Management**: Database-backed user state with online tracking

### Recent Changes (July 2025)
- ✓ Integrated PostgreSQL database replacing in-memory storage
- ✓ Created comprehensive database models with SQLAlchemy
- ✓ Updated all SocketIO handlers for database operations
- ✓ Added persistent chat message storage
- ✓ Implemented proper user session management with database

### Security Features
- **File Upload Security**: Extension whitelist and filename sanitization
- **Session Management**: Secure session handling with configurable secrets
- **CORS Configuration**: Controlled cross-origin resource sharing for SocketIO