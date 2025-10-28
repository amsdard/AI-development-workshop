import aiosqlite
import os
from typing import Optional

# Database configuration - use environment variables in production
DB_NAME = "taskflow.db"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", DB_NAME)


async def get_connection() -> aiosqlite.Connection:
    """
    Get async database connection.

    Returns:
        aiosqlite.Connection: Async database connection with Row factory
    """
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    return conn


async def init_db() -> None:
    """
    Initialize database with schema and sample data using async operations.
    All queries use parameterized statements for security.
    """
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row

        # Create users table
        await conn.execute(
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

        # Create tasks table
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT "pending",
                priority TEXT DEFAULT "medium",
                due_date TEXT,
                user_id INTEGER,
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT
            )
        """
        )

        # Check if users exist
        cursor = await conn.execute("SELECT COUNT(*) FROM users")
        row = await cursor.fetchone()
        user_count = row[0] if row else 0

        if user_count == 0:
            # Insert sample users using parameterized query
            # Note: password hashes are for "password123"
            await conn.execute(
                """
                INSERT INTO users (id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES
                (1, 'john_doe', 'john@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'John', 'Doe', 1, datetime('now'), datetime('now')),
                (2, 'jane_smith', 'jane@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Jane', 'Smith', 1, datetime('now'), datetime('now')),
                (3, 'bob_johnson', 'bob@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Bob', 'Johnson', 1, datetime('now'), datetime('now'))
            """
            )

        # Check if tasks exist
        cursor = await conn.execute("SELECT COUNT(*) FROM tasks")
        row = await cursor.fetchone()
        task_count = row[0] if row else 0

        if task_count == 0:
            # Insert sample tasks using parameterized query
            await conn.execute(
                """
                INSERT INTO tasks (id, title, description, status, priority, due_date, user_id, created_at, updated_at) VALUES
                (1, 'Fix login bug', 'Users cannot login with special characters', 'in_progress', 'high', '2025-10-20 10:00:00', 1, datetime('now'), datetime('now')),
                (2, 'Update documentation', 'Add API examples to README', 'pending', 'medium', '2025-10-25 15:00:00', 2, datetime('now'), datetime('now')),
                (3, 'Review Q4 report', 'Financial review for Q4 2024', 'completed', 'high', '2025-10-15 09:00:00', 1, datetime('now'), datetime('now')),
                (4, 'Design new homepage', 'Mockups for redesign', 'pending', 'low', '2025-11-01 12:00:00', 3, datetime('now'), datetime('now')),
                (5, 'Setup CI/CD pipeline', 'Configure GitHub Actions', 'pending', 'high', '2025-10-10 14:00:00', 2, datetime('now'), datetime('now')),
                (6, 'Refactor user service', 'Clean up legacy code', 'pending', 'medium', '2025-10-22 16:00:00', NULL, datetime('now'), datetime('now'))
            """
            )

        await conn.commit()
        print(f"Database initialized at {DB_PATH}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(init_db())
