# WatchWithMe - Real-time Collaborative Video Watching Platform

A Flask-based web application that allows users to watch videos together in real-time, with synchronized playback controls and chat functionality.

## 🚀 Features

- **Real-time Video Synchronization**: Watch videos together with synchronized play/pause/seek controls
- **YouTube Integration**: Load and watch YouTube videos together
- **Local Video Upload**: Upload and watch local video files together
- **Live Chat**: Real-time chat functionality during video watching
- **Room-based System**: Create and join rooms for collaborative watching
- **Host Controls**: Only the host can control video playback, ensuring synchronized experience
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Admin Panel**: Admin interface for user and room management
- **Socket.IO Real-time Sync**: Instant video changes and control synchronization

## 🛠️ Technology Stack

- **Backend**: Flask, Flask-SQLAlchemy, Flask-Login, Flask-SocketIO
- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **Real-time Communication**: Socket.IO
- **Video Players**: YouTube IFrame API, HTML5 Video
- **Deployment**: Render.com

## 📦 Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/watchwithme.git
   cd watchwithme
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=sqlite:///app.db
   SESSION_SECRET=your-secret-key-here
   ```

5. **Initialize the database**
   ```bash
   python migrate_db.py
   ```

6. **Create admin user (optional)**
   ```bash
   python setup_admin.py
   ```

7. **Run the application**
   ```bash
   python main.py
   ```

8. **Access the application**
   Open your browser and go to `http://localhost:5000`

## 🎮 Usage

### Creating a Room

1. Register an account or log in
2. Click "Create Room" on the homepage
3. Share the room code with friends
4. Start watching videos together!

### Joining a Room

1. Enter the room code provided by the host
2. Join the room and start chatting
3. The host will control video playback for everyone

### Video Controls

- **Host Only**: Play, pause, seek, and change videos
- **All Users**: Fullscreen controls and chat
- **Real-time Sync**: All actions are synchronized across all users via Socket.IO

## 🚀 Deployment on Render

### Automatic Deployment

1. **Fork/Clone this repository** to your GitHub account
2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Create a new account or sign in
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure the service**:
   - **Name**: `watchwithme-app`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Free (or paid for better performance)

4. **Set Environment Variables**:
   - `DATABASE_URL`: Will be automatically set by Render
   - `SESSION_SECRET`: Generate a random secret key
   - `PYTHON_VERSION`: `3.9.16`

5. **Deploy**: Click "Create Web Service"

### Manual Deployment

If you prefer manual deployment:

1. **Create a PostgreSQL database** on Render
2. **Create a web service** pointing to your repository
3. **Set environment variables** as mentioned above
4. **Deploy the service**

## ⚙️ Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection string | Yes | `sqlite:///app.db` |
| `SESSION_SECRET` | Flask session secret key | Yes | Auto-generated |
| `PYTHON_VERSION` | Python version for deployment | No | `3.9.16` |

## 📁 Project Structure

```
watchwithme/
├── app.py                 # Flask app configuration with Socket.IO
├── main.py               # Application entry point
├── models.py             # Database models
├── routes.py             # Flask routes and views
├── requirements.txt      # Python dependencies
├── render.yaml           # Render deployment config
├── Procfile             # Process file for deployment
├── runtime.txt          # Python runtime specification
├── templates/           # HTML templates
│   ├── base.html        # Base template with Socket.IO
│   ├── index.html       # Homepage
│   ├── room.html        # Room page
│   └── auth/           # Authentication templates
├── static/              # Static files
│   ├── style.css        # CSS styles
│   ├── app.js          # Main JavaScript
│   └── room.js         # Room-specific JavaScript with Socket.IO
└── uploads/            # Video upload directory
```

## 🔧 Features in Detail

### Real-time Video Synchronization

- **Socket.IO Integration**: Real-time communication between users
- **Host Controls**: Only host can control video playback
- **Automatic Sync**: All users stay synchronized automatically
- **YouTube & Local Videos**: Support for both video types
- **Instant Updates**: Video changes propagate immediately to all users

### Chat System

- **Real-time Messaging**: Instant message delivery
- **User Presence**: See who's in the room
- **Mobile Optimized**: Responsive chat interface

### Admin Panel

- **User Management**: View and manage users
- **Room Management**: Monitor active rooms
- **System Overview**: Dashboard with statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/watchwithme/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🙏 Acknowledgments

- Flask community for the excellent web framework
- Socket.IO for real-time communication
- Tailwind CSS for beautiful styling
- YouTube IFrame API for video integration

---

**Made with ❤️ for collaborative video watching**