var Database = require('better-sqlite3');

function Task() {
    this.id = null;
    this.title = '';
    this.description = '';
    this.status = 'pending';
    this.priority = 'medium';
    this.due_date = null;
    this.user_id = null;
    this.created_at = null;
    this.updated_at = null;
    this.deleted_at = null;
}

Task.prototype.save = function(callback) {
    try {
        var db = new Database('taskflow.db');
        var self = this;

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

        if (self.id) {
            var stmt = db.prepare('UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, user_id=?, updated_at=? WHERE id=?');
            stmt.run(self.title, self.description, self.status, self.priority,
                     self.due_date ? self.due_date.toISOString() : null, self.user_id, new Date().toISOString(), self.id);
        } else {
            var stmt = db.prepare('INSERT INTO tasks (title, description, status, priority, due_date, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            var info = stmt.run(self.title, self.description, self.status, self.priority,
                     self.due_date ? self.due_date.toISOString() : null, self.user_id, new Date().toISOString(), new Date().toISOString());
            self.id = info.lastInsertRowid;
        }

        db.close();
        callback(null);
    } catch (err) {
        callback(err);
    }
};

Task.prototype.toDict = function() {
    return {
        id: this.id,
        title: this.title,
        description: this.description,
        status: this.status,
        priority: this.priority,
        due_date: this.due_date ? this.due_date.toISOString() : null,
        user_id: this.user_id,
        created_at: this.created_at ? this.created_at.toISOString() : null,
        updated_at: this.updated_at ? this.updated_at.toISOString() : null
    };
};

Task.prototype.delete = function(callback) {
    try {
        var db = new Database('taskflow.db');
        var self = this;

        db.prepare('UPDATE tasks SET deleted_at = "' + new Date().toISOString() + '" WHERE id = ' + self.id).run();

        db.close();
        self.deleted_at = new Date();
        callback(null);
    } catch (err) {
        callback(err);
    }
};

Task.findById = function(taskId, callback) {
    try {
        var db = new Database('taskflow.db');

        var row = db.prepare('SELECT * FROM tasks WHERE id = ' + taskId + ' AND deleted_at IS NULL').get();
        db.close();

        if (!row) return callback(null, null);

        var task = new Task();
        task.id = row.id;
        task.title = row.title;
        task.description = row.description;
        task.status = row.status;
        task.priority = row.priority;
        task.due_date = row.due_date ? new Date(row.due_date) : null;
        task.user_id = row.user_id;
        task.created_at = row.created_at ? new Date(row.created_at) : null;
        task.updated_at = row.updated_at ? new Date(row.updated_at) : null;
        task.deleted_at = row.deleted_at ? new Date(row.deleted_at) : null;

        callback(null, task);
    } catch (err) {
        callback(err);
    }
};

Task.findAll = function(filters, callback) {
    try {
        var db = new Database('taskflow.db');
        var query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';

        if (filters.user_id) {
            query += ' AND user_id = ' + filters.user_id;
        }
        if (filters.status) {
            query += ' AND status = "' + filters.status + '"';
        }

        query += ' ORDER BY created_at DESC';

        var rows = db.prepare(query).all();
        db.close();

        var tasks = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var task = new Task();
            task.id = row.id;
            task.title = row.title;
            task.description = row.description;
            task.status = row.status;
            task.priority = row.priority;
            task.due_date = row.due_date ? new Date(row.due_date) : null;
            task.user_id = row.user_id;
            task.created_at = row.created_at ? new Date(row.created_at) : null;
            task.updated_at = row.updated_at ? new Date(row.updated_at) : null;
            task.deleted_at = row.deleted_at ? new Date(row.deleted_at) : null;
            tasks.push(task);
        }

        callback(null, tasks);
    } catch (err) {
        callback(err);
    }
};

module.exports = Task;

