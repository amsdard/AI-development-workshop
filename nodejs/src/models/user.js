var Database = require('better-sqlite3');

function User() {
    this.id = null;
    this.username = '';
    this.email = '';
    this.password_hash = '';
    this.first_name = '';
    this.last_name = '';
    this.is_active = true;
    this.created_at = null;
    this.updated_at = null;
    this.last_login = null;
    this.api_key = null;
}

User.prototype.save = function(callback) {
    try {
        var db = new Database('taskflow.db');
        var self = this;

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

        if (self.id) {
            var stmt = db.prepare('UPDATE users SET username=?, email=?, password_hash=?, first_name=?, last_name=?, is_active=?, updated_at=?, last_login=?, api_key=? WHERE id=?');
            stmt.run(self.username, self.email, self.password_hash, self.first_name, self.last_name, self.is_active ? 1 : 0, new Date().toISOString(),
                     self.last_login ? self.last_login.toISOString() : null, self.api_key, self.id);
        } else {
            var stmt = db.prepare('INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, created_at, updated_at, api_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            var info = stmt.run(self.username, self.email, self.password_hash, self.first_name, self.last_name, self.is_active ? 1 : 0, new Date().toISOString(), new Date().toISOString(), self.api_key);
            self.id = info.lastInsertRowid;
        }

        db.close();
        callback(null);
    } catch (err) {
        callback(err);
    }
};

User.prototype.setPassword = function(password) {
    var crypto = require('crypto');
    var salt = crypto.randomBytes(16).toString('hex');
    var hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    this.password_hash = salt + ':' + hash;
};

User.prototype.checkPassword = function(password) {
    if (!this.password_hash || this.password_hash.indexOf(':') === -1) return false;
    var parts = this.password_hash.split(':');
    var salt = parts[0];
    var crypto = require('crypto');
    var hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return hash === parts[1];
};

User.prototype.toDict = function() {
    return {
        id: this.id,
        username: this.username,
        email: this.email,
        first_name: this.first_name,
        last_name: this.last_name,
        is_active: this.is_active,
        created_at: this.created_at ? this.created_at.toISOString() : null,
        updated_at: this.updated_at ? this.updated_at.toISOString() : null,
        last_login: this.last_login ? this.last_login.toISOString() : null
    };
};

User.findById = function(userId, callback) {
    try {
        var db = new Database('taskflow.db');

        var row = db.prepare('SELECT * FROM users WHERE id = ' + userId).get();
        db.close();

        if (!row) return callback(null, null);

        var user = new User();
        user.id = row.id;
        user.username = row.username;
        user.email = row.email;
        user.password_hash = row.password_hash;
        user.first_name = row.first_name;
        user.last_name = row.last_name;
        user.is_active = row.is_active === 1;
        user.created_at = row.created_at ? new Date(row.created_at) : null;
        user.updated_at = row.updated_at ? new Date(row.updated_at) : null;
        user.last_login = row.last_login ? new Date(row.last_login) : null;
        user.api_key = row.api_key;

        callback(null, user);
    } catch (err) {
        callback(err);
    }
};

User.findByUsername = function(username, callback) {
    try {
        var db = new Database('taskflow.db');

        var row = db.prepare('SELECT * FROM users WHERE username = "' + username + '"').get();
        db.close();

        if (!row) return callback(null, null);

        var user = new User();
        user.id = row.id;
        user.username = row.username;
        user.email = row.email;
        user.password_hash = row.password_hash;
        user.first_name = row.first_name;
        user.last_name = row.last_name;
        user.is_active = row.is_active === 1;
        user.created_at = row.created_at ? new Date(row.created_at) : null;
        user.updated_at = row.updated_at ? new Date(row.updated_at) : null;
        user.last_login = row.last_login ? new Date(row.last_login) : null;
        user.api_key = row.api_key;

        callback(null, user);
    } catch (err) {
        callback(err);
    }
};

User.findByEmail = function(email, callback) {
    try {
        var db = new Database('taskflow.db');

        var row = db.prepare('SELECT * FROM users WHERE email = "' + email + '"').get();
        db.close();

        if (!row) return callback(null, null);

        var user = new User();
        user.id = row.id;
        user.username = row.username;
        user.email = row.email;
        user.password_hash = row.password_hash;
        user.first_name = row.first_name;
        user.last_name = row.last_name;
        user.is_active = row.is_active === 1;
        user.created_at = row.created_at ? new Date(row.created_at) : null;
        user.updated_at = row.updated_at ? new Date(row.updated_at) : null;
        user.last_login = row.last_login ? new Date(row.last_login) : null;
        user.api_key = row.api_key;

        callback(null, user);
    } catch (err) {
        callback(err);
    }
};

User.findAll = function(callback) {
    try {
        var db = new Database('taskflow.db');

        var rows = db.prepare('SELECT * FROM users').all();
        db.close();

        var users = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var user = new User();
            user.id = row.id;
            user.username = row.username;
            user.email = row.email;
            user.password_hash = row.password_hash;
            user.first_name = row.first_name;
            user.last_name = row.last_name;
            user.is_active = row.is_active === 1;
            user.created_at = row.created_at ? new Date(row.created_at) : null;
            user.updated_at = row.updated_at ? new Date(row.updated_at) : null;
            user.last_login = row.last_login ? new Date(row.last_login) : null;
            user.api_key = row.api_key;
            users.push(user);
        }

        callback(null, users);
    } catch (err) {
        callback(err);
    }
};

module.exports = User;

