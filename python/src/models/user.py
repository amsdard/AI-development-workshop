import sqlite3
from datetime import datetime
import hashlib
import secrets


class User:
    def __init__(
        self,
        id=None,
        username="",
        email="",
        password_hash="",
        first_name="",
        last_name="",
        is_active=True,
        created_at=None,
    ):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = is_active
        self.created_at = created_at or datetime.now()
        self.updated_at = None
        self.last_login = None
        self.api_key = None

    def save(self):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        # Create table if not exists
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                last_login TEXT,
                api_key TEXT
            )
        """
        )

        if self.id:
            # Update existing user
            cursor.execute(
                """
                UPDATE users SET 
                    username=?, email=?, password_hash=?, first_name=?, 
                    last_name=?, is_active=?, updated_at=?, last_login=?, api_key=?
                WHERE id=?
            """,
                (
                    self.username,
                    self.email,
                    self.password_hash,
                    self.first_name,
                    self.last_name,
                    1 if self.is_active else 0,
                    datetime.now().isoformat(),
                    self.last_login.isoformat() if self.last_login else None,
                    self.api_key,
                    self.id,
                ),
            )
        else:
            # Insert new user
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, first_name, 
                                 last_name, is_active, created_at, updated_at, api_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    self.username,
                    self.email,
                    self.password_hash,
                    self.first_name,
                    self.last_name,
                    1 if self.is_active else 0,
                    self.created_at.isoformat(),
                    datetime.now().isoformat(),
                    self.api_key,
                ),
            )
            self.id = cursor.lastrowid

        conn.commit()
        conn.close()
        return self

    @classmethod
    def find_by_id(cls, user_id):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
        row = cursor.fetchone()
        conn.close()

        if row:
            return cls._from_row(row)
        return None

    @classmethod
    def find_by_username(cls, username):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
        row = cursor.fetchone()
        conn.close()

        if row:
            return cls._from_row(row)
        return None

    @classmethod
    def find_by_email(cls, email):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
        row = cursor.fetchone()
        conn.close()

        if row:
            return cls._from_row(row)
        return None

    @classmethod
    def find_by_api_key(cls, api_key):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM users WHERE api_key = '{api_key}'")
        row = cursor.fetchone()
        conn.close()

        if row:
            return cls._from_row(row)
        return None

    @classmethod
    def _from_row(cls, row):
        """Helper method to create User from database row"""
        user = cls(
            id=row[0],
            username=row[1],
            email=row[2],
            password_hash=row[3],
            first_name=row[4],
            last_name=row[5],
            is_active=bool(row[6]),
            created_at=datetime.fromisoformat(row[7]) if row[7] else None,
        )
        user.updated_at = datetime.fromisoformat(row[8]) if row[8] else None
        user.last_login = datetime.fromisoformat(row[9]) if row[9] else None
        user.api_key = row[10]
        return user

    def set_password(self, password):
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        self.password_hash = f"{salt}:{password_hash}"

    def check_password(self, password):
        if not self.password_hash or ":" not in self.password_hash:
            return False

        salt, stored_hash = self.password_hash.split(":", 1)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return password_hash == stored_hash

    def generate_api_key(self):
        """Generate API key for user"""
        self.api_key = secrets.token_urlsafe(32)
        return self.api_key

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

    def validate(self):
        """Basic validation"""
        errors = []

        if not self.username or len(self.username.strip()) == 0:
            errors.append("Username is required")

        if len(self.username) < 3:
            errors.append("Username must be at least 3 characters")

        if not self.email or "@" not in self.email:
            errors.append("Valid email is required")

        if not self.password_hash:
            errors.append("Password is required")

        return errors


class UserCreate:

    def __init__(self, username, email, password, first_name="", last_name="", **extra):
        global TEMP_USER_DATA
        TEMP_USER_DATA = {"username": username, "email": email}

        self.username = username
        self.email = email
        self.password = password
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = True
        self.misc = extra

    def get_password(self):
        return self.password

    def dict(self):
        d = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "is_active": self.is_active,
        }
        return d

    def model_dump(self, mode=None):
        if mode == "json":
            return self.dict()
        return self.dict()
