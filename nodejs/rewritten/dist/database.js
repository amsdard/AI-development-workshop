"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbManager = exports.defaultConfig = exports.DatabaseManager = exports.DatabaseConfigSchema = void 0;
exports.createDatabaseManager = createDatabaseManager;
exports.initDatabase = initDatabase;
exports.getDatabase = getDatabase;
exports.saveDatabase = saveDatabase;
exports.closeDatabase = closeDatabase;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Zod validation schemas
exports.DatabaseConfigSchema = zod_1.z.object({
    dbPath: zod_1.z.string().min(1),
    autoSave: zod_1.z.boolean().optional().default(false),
    autoSaveInterval: zod_1.z.number().int().positive().optional().default(30000), // 30 seconds
    enableWAL: zod_1.z.boolean().optional().default(false),
    enableForeignKeys: zod_1.z.boolean().optional().default(true),
    timeout: zod_1.z.number().int().positive().optional().default(5000),
});
class DatabaseManager {
    constructor(config) {
        this.connection = null;
        this.autoSaveTimer = null;
        this.isInitialized = false;
        this.config = exports.DatabaseConfigSchema.parse(config);
    }
    // Singleton pattern
    static getInstance(config) {
        if (!DatabaseManager.instance) {
            if (!config) {
                throw new Error('DatabaseManager instance not initialized. Provide config on first call.');
            }
            DatabaseManager.instance = new DatabaseManager(config);
        }
        return DatabaseManager.instance;
    }
    static resetInstance() {
        if (DatabaseManager.instance) {
            DatabaseManager.instance.cleanup();
            DatabaseManager.instance = null;
        }
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Initialize SQL.js
            const SQL = await (0, sql_js_1.default)({
            // Optional: Add wasm binary path if needed
            // locateFile: (file: string) => `https://sql.js.org/dist/${file}`
            });
            // Ensure directory exists
            const dbDir = path_1.default.dirname(this.config.dbPath);
            if (!fs_1.default.existsSync(dbDir)) {
                fs_1.default.mkdirSync(dbDir, { recursive: true });
            }
            let database;
            // Try to load existing database
            if (fs_1.default.existsSync(this.config.dbPath)) {
                try {
                    const data = fs_1.default.readFileSync(this.config.dbPath);
                    database = new SQL.Database(data);
                }
                catch (error) {
                    console.warn(`Failed to load existing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    database = new SQL.Database();
                }
            }
            else {
                database = new SQL.Database();
            }
            // Configure database settings
            if (this.config.enableWAL) {
                database.exec('PRAGMA journal_mode = WAL');
            }
            if (this.config.enableForeignKeys) {
                database.exec('PRAGMA foreign_keys = ON');
            }
            database.exec('PRAGMA synchronous = NORMAL');
            database.exec('PRAGMA cache_size = 1000');
            database.exec('PRAGMA temp_store = MEMORY');
            this.connection = {
                database,
                sql: SQL,
                config: this.config,
            };
            this.isInitialized = true;
            // Setup auto-save if enabled
            if (this.config.autoSave) {
                this.setupAutoSave();
                // Save immediately to create the file
                await this.save();
            }
            console.log('Database initialized successfully');
        }
        catch (error) {
            throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getDatabase() {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.connection.database;
    }
    getSQL() {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.connection.sql;
    }
    async save() {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        try {
            const data = this.connection.database.export();
            const buffer = Buffer.from(data);
            // Write to temporary file first, then rename (atomic operation)
            const tempPath = `${this.config.dbPath}.tmp`;
            fs_1.default.writeFileSync(tempPath, buffer);
            fs_1.default.renameSync(tempPath, this.config.dbPath);
            console.log('Database saved successfully');
        }
        catch (error) {
            throw new Error(`Failed to save database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async close() {
        try {
            if (this.connection) {
                await this.save();
                this.connection.database.close();
                this.connection = null;
            }
            this.cleanup();
            this.isInitialized = false;
            console.log('Database closed successfully');
        }
        catch (error) {
            throw new Error(`Failed to close database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getStats() {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        try {
            const stats = {
                isInitialized: this.isInitialized,
            };
            // Get file stats
            if (fs_1.default.existsSync(this.config.dbPath)) {
                const fileStat = fs_1.default.statSync(this.config.dbPath);
                stats.lastModified = fileStat.mtime;
                stats.fileSize = fileStat.size;
            }
            // Get database stats
            try {
                const tableCountResult = this.connection.database.exec("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
                stats.tableCount = tableCountResult[0]?.values[0]?.[0] || 0;
                // Get user count
                try {
                    const userCountResult = this.connection.database.exec('SELECT COUNT(*) as count FROM users');
                    stats.userCount = userCountResult[0]?.values[0]?.[0] || 0;
                }
                catch {
                    // Users table might not exist yet
                    stats.userCount = 0;
                }
                // Get task count
                try {
                    const taskCountResult = this.connection.database.exec('SELECT COUNT(*) as count FROM tasks');
                    stats.taskCount = taskCountResult[0]?.values[0]?.[0] || 0;
                }
                catch {
                    // Tasks table might not exist yet
                    stats.taskCount = 0;
                }
            }
            catch (error) {
                // Database might be empty or corrupted
                console.warn('Could not retrieve database statistics:', error);
            }
            return stats;
        }
        catch (error) {
            throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeQuery(query, params = []) {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        try {
            const stmt = this.connection.database.prepare(query);
            const result = [];
            // Bind parameters if provided
            if (params.length > 0) {
                stmt.bind(params);
            }
            while (stmt.step()) {
                result.push(stmt.getAsObject());
            }
            stmt.free();
            return result;
        }
        catch (error) {
            throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeUpdate(query, params = []) {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        try {
            const stmt = this.connection.database.prepare(query);
            // Bind parameters if provided
            if (params.length > 0) {
                stmt.bind(params);
            }
            stmt.step();
            const changes = this.connection.database.getRowsModified();
            const lastInsertRowid = this.connection.database.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0;
            stmt.free();
            return { changes, lastInsertRowid };
        }
        catch (error) {
            throw new Error(`Failed to execute update: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async backup(backupPath) {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        try {
            const data = this.connection.database.export();
            const buffer = Buffer.from(data);
            // Ensure backup directory exists
            const backupDir = path_1.default.dirname(backupPath);
            if (!fs_1.default.existsSync(backupDir)) {
                fs_1.default.mkdirSync(backupDir, { recursive: true });
            }
            fs_1.default.writeFileSync(backupPath, buffer);
            console.log(`Database backed up to: ${backupPath}`);
        }
        catch (error) {
            throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    isDatabaseInitialized() {
        return this.isInitialized && this.connection !== null;
    }
    getConfig() {
        return { ...this.config };
    }
    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        this.autoSaveTimer = setInterval(async () => {
            try {
                await this.save();
            }
            catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, this.config.autoSaveInterval);
    }
    cleanup() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
}
exports.DatabaseManager = DatabaseManager;
DatabaseManager.instance = null;
// Factory function for creating database manager
function createDatabaseManager(config) {
    // Validate config first
    const validatedConfig = exports.DatabaseConfigSchema.parse(config);
    return DatabaseManager.getInstance(validatedConfig);
}
// Default configuration
exports.defaultConfig = {
    dbPath: 'taskflow.db',
    autoSave: false,
    autoSaveInterval: 30000,
    enableWAL: false,
    enableForeignKeys: true,
    timeout: 5000,
};
// Legacy functions for backward compatibility
let legacyManager = null;
async function initDatabase(config) {
    const managerConfig = config || exports.defaultConfig;
    legacyManager = createDatabaseManager(managerConfig);
    await legacyManager.initialize();
    return legacyManager.getDatabase();
}
function getDatabase() {
    if (!legacyManager) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return legacyManager.getDatabase();
}
async function saveDatabase() {
    if (!legacyManager) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    await legacyManager.save();
}
async function closeDatabase() {
    if (legacyManager) {
        await legacyManager.close();
        legacyManager = null;
    }
}
// Export the singleton instance getter
exports.dbManager = DatabaseManager.getInstance;
//# sourceMappingURL=database.js.map