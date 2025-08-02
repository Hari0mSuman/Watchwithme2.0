#!/usr/bin/env python3
"""
Setup script to create the first admin user for WatchWithMe
Run this script to create an admin user and set up the database
"""

import os
import sys
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User

def create_admin_user():
    """Create the first admin user"""
    with app.app_context():
        # Check if admin user already exists
        admin_user = User.query.filter_by(is_admin=True).first()
        if admin_user:
            print(f"Admin user already exists: {admin_user.username}")
            return admin_user
        
        # Create admin user
        admin = User()
        admin.username = "admin"
        admin.email = "admin@watchwithme.com"
        admin.first_name = "Admin"
        admin.last_name = "User"
        admin.is_admin = True
        admin.is_banned = False
        admin.set_password("admin123")  # Change this password!
        
        db.session.add(admin)
        db.session.commit()
        
        print("✅ Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("⚠️  IMPORTANT: Change the password after first login!")
        
        return admin

def setup_database():
    """Set up the database tables"""
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")

def main():
    """Main setup function"""
    print("🚀 Setting up WatchWithMe Admin Panel...")
    print("=" * 50)
    
    try:
        # Set up database
        setup_database()
        
        # Create admin user
        create_admin_user()
        
        print("=" * 50)
        print("✅ Setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Run your Flask application: python app.py")
        print("2. Go to http://localhost:5000")
        print("3. Login with admin/admin123")
        print("4. Change the admin password immediately!")
        print("5. Access admin panel at http://localhost:5000/admin")
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 