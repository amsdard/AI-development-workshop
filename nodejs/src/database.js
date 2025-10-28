var initSqlJs = require('sql.js');
var fs = require('fs');

var dbInstance = null;
var SQL = null;

async function initializeSQL() {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    return SQL;
}

function getDatabase() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return dbInstance;
}

async function initDatabase() {
    SQL = await initializeSQL();

    try {
        var data = fs.readFileSync('taskflow.db');
        dbInstance = new SQL.Database(data);
    } catch (err) {
        dbInstance = new SQL.Database();
    }

    return dbInstance;
}

function saveDatabase() {
    if (dbInstance) {
        var data = dbInstance.export();
        var buffer = Buffer.from(data);
        fs.writeFileSync('taskflow.db', buffer);
    }
}

function closeDatabase() {
    saveDatabase();
}

module.exports = {
    initDatabase: initDatabase,
    getDatabase: getDatabase,
    saveDatabase: saveDatabase,
    closeDatabase: closeDatabase
};
