#!/usr/bin/env python3
"""
Database initialization script for WatchWithMe
Run this script to set up the database and create admin user
"""

import os
import sys
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User

def init_database():
    """Initialize database and create admin user"""
    with app.app_context():
        print("🚀 Initializing WatchWithMe database...")
        
        # Create all tables
        db.create_all()
        print("✅ Database tables created")
        
        # Check if admin user exists
        admin_user = User.query.filter_by(is_admin=True).first()
        
        # Get admin credentials from environment variables
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@watchwithme.com")
        admin_first_name = os.environ.get("ADMIN_FIRST_NAME", "Admin")
        admin_last_name = os.environ.get("ADMIN_LAST_NAME", "User")
        
        if admin_user:
            print(f"✅ Admin user already exists: {admin_user.username}")
            # Reset password to environment variable value
            admin_user.set_password(admin_password)
            db.session.commit()
            print("✅ Admin password reset from environment variable")
        else:
            print("📝 Creating admin user...")
            
            # Create admin user with environment variables
            admin = User()
            admin.username = admin_username
            admin.email = admin_email
            admin.first_name = admin_first_name
            admin.last_name = admin_last_name
            admin.is_admin = True
            admin.is_banned = False
            admin.set_password(admin_password)
            
            db.session.add(admin)
            db.session.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Username: {admin_username}")
            print("   Password: [from environment variable]")
        
        # Show all users
        users = User.query.all()
        print(f"\n📊 Total users in database: {len(users)}")
        for user in users:
            print(f"   - {user.username} (Admin: {user.is_admin})")
        
        print("\n🎉 Database initialization completed!")
        print("🔑 Admin credentials:")
        print(f"   Username: {admin_username}")
        print("   Password: [from environment variable]")
        print("   Admin Panel: /admin")

if __name__ == "__main__":
    init_database() 