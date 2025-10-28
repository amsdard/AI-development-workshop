var Database = require('better-sqlite3');

function initDB(callback) {
    try {
        var db = new Database('taskflow.db');

        // Create tables
        db.exec('CREATE TABLE IF NOT EXISTS users (' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
            'username TEXT UNIQUE NOT NULL,' +
            'email TEXT UNIQUE NOT NULL,' +
            'password_hash TEXT NOT NULL,' +
            'first_name TEXT,' +
            'last_name TEXT,' +
            'is_active INTEGER DEFAULT 1,' +
            'created_at TEXT,' +
            'updated_at TEXT,' +
            'last_login TEXT,' +
            'api_key TEXT' +
            ')');

        db.exec('CREATE TABLE IF NOT EXISTS tasks (' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
            'title TEXT NOT NULL,' +
            'description TEXT,' +
            'status TEXT DEFAULT "pending",' +
            'priority TEXT DEFAULT "medium",' +
            'due_date TEXT,' +
            'user_id INTEGER,' +
            'created_at TEXT,' +
            'updated_at TEXT,' +
            'deleted_at TEXT' +
            ')');

        // Check if we need to seed data
        var userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

        if (userCount.count === 0) {
            db.exec("INSERT INTO users (id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES " +
                "(1, 'john_doe', 'john@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'John', 'Doe', 1, datetime('now'), datetime('now')), " +
                "(2, 'jane_smith', 'jane@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Jane', 'Smith', 1, datetime('now'), datetime('now')), " +
                "(3, 'bob_johnson', 'bob@example.com', 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Bob', 'Johnson', 1, datetime('now'), datetime('now'))");
        }

        var taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();

        if (taskCount.count === 0) {
            db.exec("INSERT INTO tasks (id, title, description, status, priority, due_date, user_id, created_at, updated_at) VALUES " +
                "(1, 'Fix login bug', 'Users cannot login with special characters', 'in_progress', 'high', '2025-10-20 10:00:00', 1, datetime('now'), datetime('now')), " +
                "(2, 'Update documentation', 'Add API examples to README', 'pending', 'medium', '2025-10-25 15:00:00', 2, datetime('now'), datetime('now')), " +
                "(3, 'Review Q4 report', 'Financial review for Q4 2024', 'completed', 'high', '2025-10-15 09:00:00', 1, datetime('now'), datetime('now')), " +
                "(4, 'Design new homepage', 'Mockups for redesign', 'pending', 'low', '2025-11-01 12:00:00', 3, datetime('now'), datetime('now')), " +
                "(5, 'Setup CI/CD pipeline', 'Configure GitHub Actions', 'pending', 'high', '2025-10-10 14:00:00', 2, datetime('now'), datetime('now')), " +
                "(6, 'Refactor user service', 'Clean up legacy code', 'pending', 'medium', '2025-10-22 16:00:00', NULL, datetime('now'), datetime('now'))");
        }

        db.close();
        callback(null);
    } catch (err) {
        callback(err);
    }
}

module.exports = { initDB: initDB };

