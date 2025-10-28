import asyncio
from models.user import UserCreate, User
import sqlite3


def get_users():
    """Get all users"""
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    conn.close()

    users_list = []
    for row in rows:
        u = User._from_row(row)
        users_list.append(u.to_dict())

    return users_list


def get_user(user_id):
    """Get user by ID"""
    found_user = User.find_by_id(int(user_id))

    if found_user:
        return found_user.to_dict()
    return None


def create_user(data):
    """Create user"""
    user_data = UserCreate(**data)

    # Manual object creation
    new_user = User()
    new_user.username = user_data.username
    new_user.email = user_data.email
    new_user.first_name = user_data.first_name
    new_user.last_name = user_data.last_name
    new_user.is_active = user_data.is_active

    # Set password from plain text
    new_user.set_password(user_data.password)

    new_user.save()
    return new_user.to_dict()
