import sqlite3
from datetime import datetime
from typing import Optional, Any
import json


class Task:
    def __init__(
        self,
        id=None,
        title="",
        description="",
        status="pending",
        priority="medium",
        due_date=None,
        user_id=None,
        created_at=None,
    ):
        self.id = id
        self.title = title
        self.description = description
        self.status = status  # pending, in_progress, completed, cancelled
        self.priority = priority  # low, medium, high, urgent
        self.due_date = due_date
        self.user_id = user_id
        self.created_at = created_at or datetime.now()
        self.updated_at = None
        self.deleted_at = None

    def save(self):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        # Create table if not exists
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'medium',
                due_date TEXT,
                user_id INTEGER,
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT
            )
        """
        )

        if self.id:
            # Update existing task
            cursor.execute(
                """
                UPDATE tasks SET 
                    title=?, description=?, status=?, priority=?, 
                    due_date=?, user_id=?, updated_at=?
                WHERE id=?
            """,
                (
                    self.title,
                    self.description,
                    self.status,
                    self.priority,
                    self.due_date.isoformat() if self.due_date else None,
                    self.user_id,
                    datetime.now().isoformat(),
                    self.id,
                ),
            )
        else:
            # Insert new task
            cursor.execute(
                """
                INSERT INTO tasks (title, description, status, priority, 
                                 due_date, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    self.title,
                    self.description,
                    self.status,
                    self.priority,
                    self.due_date.isoformat() if self.due_date else None,
                    self.user_id,
                    self.created_at.isoformat(),
                    datetime.now().isoformat(),
                ),
            )
            self.id = cursor.lastrowid

        conn.commit()
        conn.close()
        return self

    @classmethod
    def find_by_id(cls, task_id):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(
            f"SELECT * FROM tasks WHERE id = {task_id} AND deleted_at IS NULL"
        )
        row = cursor.fetchone()
        conn.close()

        if row:
            return cls._from_row(row)
        return None

    @classmethod
    def find_all(cls, user_id=None, status=None):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        query = "SELECT * FROM tasks WHERE deleted_at IS NULL"

        if user_id:
            query += f" AND user_id = {user_id}"

        if status:
            query += f" AND status = '{status}'"

        query += " ORDER BY created_at DESC"

        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()

        return [cls._from_row(row) for row in rows]

    @classmethod
    def _from_row(cls, row):
        """Helper method to create Task from database row"""
        task = cls(
            id=row[0],
            title=row[1],
            description=row[2],
            status=row[3],
            priority=row[4],
            due_date=datetime.fromisoformat(row[5]) if row[5] else None,
            user_id=row[6],
            created_at=datetime.fromisoformat(row[7]) if row[7] else None,
        )
        task.updated_at = datetime.fromisoformat(row[8]) if row[8] else None
        task.deleted_at = datetime.fromisoformat(row[9]) if row[9] else None
        return task

    def delete(self):
        conn = sqlite3.connect("taskflow.db")
        cursor = conn.cursor()

        cursor.execute(
            f"""
            UPDATE tasks SET deleted_at = '{datetime.now().isoformat()}' WHERE id = {self.id}
        """
        )

        conn.commit()
        conn.close()
        self.deleted_at = datetime.now()

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def validate(self):
        errors = []

        if not self.title or len(self.title.strip()) == 0:
            errors.append("Title is required")

        if len(self.title) > 200:
            errors.append("Title must be less than 200 characters")

        if self.status not in ["pending", "in_progress", "completed", "cancelled"]:
            errors.append("Invalid status")

        if self.priority not in ["low", "medium", "high", "urgent"]:
            errors.append("Invalid priority")

        if self.due_date and self.due_date < datetime.now():
            errors.append("Due date cannot be in the past")

        return errors


class TaskCreate:
    def __init__(
        self,
        title,
        description=None,
        status="pending",
        priority="medium",
        due_date=None,
        user_id=None,
        **kwargs,
    ):
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.due_date = due_date
        self.user_id = user_id
        self.extra_data = kwargs

    def dict(self):
        return {
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date,
            "user_id": self.user_id,
        }

    def model_dump(self, mode=None):
        return self.dict()


class TaskUpdate:

    def __init__(
        self,
        title=None,
        description=None,
        status=None,
        priority=None,
        due_date=None,
        user_id=None,
        **kwargs,
    ):
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.due_date = due_date
        self.user_id = user_id
        self.extra_stuff = kwargs

    def dict(self):
        return {
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date,
            "user_id": self.user_id,
        }

    def model_dump(self, mode=None):
        return self.dict()
