# WatchWithMe Admin Panel Integration

## Overview

The admin panel has been successfully integrated with your WatchWithMe application. The admin panel provides comprehensive user and room management capabilities with a modern, responsive interface.

## Features

### 🔐 Admin Authentication
- Secure admin access with role-based permissions
- Admin users can access the admin panel via the navigation bar
- Automatic redirect for non-admin users

### 📊 Dashboard
- Real-time statistics (users, rooms, admins, banned users)
- Recent activity overview
- Quick action buttons
- Platform status monitoring

### 👥 User Management
- View all users with pagination
- Search users by name or email
- Promote users to admin
- Ban/unban users
- User statistics and status tracking

### 🏠 Room Management
- View all rooms with pagination
- Search rooms by name or code
- Delete rooms
- Monitor room activity and video status
- View room members and hosts

### 🎨 UI/UX Features
- Responsive design that works on all devices
- Dark theme matching your existing design
- Smooth animations and transitions
- Loading states and error handling
- Search functionality for both users and rooms

## Setup Instructions

### 1. Database Migration
The admin panel requires new database columns. Run the migration script:

```bash
python migrate_db.py
```

This will:
- Add `is_admin` and `is_banned` columns to the users table
- Create the first admin user (admin/admin123)

### 2. Access Admin Panel
1. Start your Flask application: `python app.py`
2. Go to http://localhost:5000
3. Login with admin credentials:
   - Username: `admin`
   - Password: `admin123`
4. Click the "Admin" button in the navigation bar
5. **IMPORTANT**: Change the admin password immediately after first login

## Admin Panel Routes

### Dashboard
- **URL**: `/admin`
- **Description**: Main admin dashboard with statistics and quick actions

### User Management
- **URL**: `/admin/users`
- **Description**: Manage users, promote to admin, ban/unban users

### Room Management
- **URL**: `/admin/rooms`
- **Description**: View and manage rooms, delete rooms

### API Endpoints
- `POST /admin/api/promote_user` - Promote user to admin
- `POST /admin/api/ban_user` - Ban user
- `POST /admin/api/unban_user` - Unban user
- `POST /admin/api/delete_room` - Delete room
- `GET /admin/api/get_user_stats` - Get user statistics
- `GET /admin/api/get_room_stats` - Get room statistics

## Security Features

### Admin Access Control
- Only users with `is_admin=True` can access admin routes
- Automatic redirect for unauthorized users
- Session-based authentication

### User Moderation
- Ban/unban functionality
- Admin promotion system
- User status tracking

### Room Management
- Room deletion with confirmation
- Room activity monitoring
- Member count tracking

## Database Schema Updates

The following columns were added to the `users` table:

```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
```

## Files Added/Modified

### New Files
- `templates/admin/dashboard.html` - Admin dashboard template
- `templates/admin/users.html` - User management template
- `templates/admin/rooms.html` - Room management template
- `migrate_db.py` - Database migration script
- `setup_admin.py` - Admin setup script
- `ADMIN_INTEGRATION.md` - This documentation

### Modified Files
- `routes.py` - Added admin routes and decorators
- `models.py` - Added admin fields to User model
- `templates/base.html` - Added admin navigation link

## Usage Examples

### Promoting a User to Admin
1. Go to Admin Panel → Manage Users
2. Find the user you want to promote
3. Click the "Promote" button
4. Confirm the action

### Banning a User
1. Go to Admin Panel → Manage Users
2. Find the user you want to ban
3. Click the "Ban" button
4. Confirm the action

### Deleting a Room
1. Go to Admin Panel → Manage Rooms
2. Find the room you want to delete
3. Click the "Delete" button
4. Confirm the action

## Customization

### Adding New Admin Features
1. Add new routes in `routes.py` with `@admin_required` decorator
2. Create corresponding templates in `templates/admin/`
3. Update the dashboard with new statistics or quick actions

### Styling
The admin panel uses the same design system as your main application:
- Discord-inspired dark theme
- Tailwind CSS for styling
- Font Awesome icons
- Responsive design

## Troubleshooting

### Common Issues

1. **Admin button not showing**: Make sure the user has `is_admin=True` in the database
2. **Access denied**: Check if the user is logged in and has admin privileges
3. **Database errors**: Run the migration script again if needed

### Database Issues
If you encounter database errors:
```bash
python migrate_db.py
```

### Reset Admin Password
If you need to reset the admin password:
```python
from app import app, db
from models import User

with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    admin.set_password('new_password')
    db.session.commit()
```

## Support

The admin panel is fully integrated with your existing WatchWithMe application. All admin functionality works with your current database and user system.

For additional features or customization, you can extend the admin routes and templates following the same patterns established in the integration.