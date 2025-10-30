"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userModel = exports.UserModel = exports.UserUpdateSchema = exports.UserCreateSchema = void 0;
exports.createUser = createUser;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
// Zod validation schemas
exports.UserCreateSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional().default(true),
});
exports.UserUpdateSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).optional(),
    email: zod_1.z.string().email().optional(),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    last_login: zod_1.z.date().nullable().optional(),
    api_key: zod_1.z.string().nullable().optional(),
});
class UserModel {
    constructor(dbPath = 'taskflow.db') {
        this.db = new better_sqlite3_1.default(dbPath);
        this.initializeTable();
    }
    initializeTable() {
        this.db.exec(`
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
    `);
    }
    async save(user) {
        try {
            const now = new Date().toISOString();
            if (user.id) {
                // Update existing user
                const stmt = this.db.prepare(`
          UPDATE users SET 
            username = ?, email = ?, password_hash = ?, first_name = ?, 
            last_name = ?, is_active = ?, updated_at = ?, last_login = ?, api_key = ?
          WHERE id = ?
        `);
                stmt.run(user.username, user.email, user.password_hash, user.first_name, user.last_name, user.is_active ? 1 : 0, now, user.last_login?.toISOString() || null, user.api_key, user.id);
            }
            else {
                // Insert new user
                const stmt = this.db.prepare(`
          INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, created_at, updated_at, api_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                const result = stmt.run(user.username, user.email, user.password_hash, user.first_name, user.last_name, user.is_active ? 1 : 0, now, now, user.api_key);
                user.id = Number(result.lastInsertRowid);
            }
            user.updated_at = new Date(now);
            return user;
        }
        catch (error) {
            throw new Error(`Failed to save user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findById(userId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
            const row = stmt.get(userId);
            if (!row)
                return null;
            return this.mapRowToUser(row);
        }
        catch (error) {
            throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findByUsername(username) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
            const row = stmt.get(username);
            if (!row)
                return null;
            return this.mapRowToUser(row);
        }
        catch (error) {
            throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findByEmail(email) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
            const row = stmt.get(email);
            if (!row)
                return null;
            return this.mapRowToUser(row);
        }
        catch (error) {
            throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findByApiKey(apiKey) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE api_key = ?');
            const row = stmt.get(apiKey);
            if (!row)
                return null;
            return this.mapRowToUser(row);
        }
        catch (error) {
            throw new Error(`Failed to find user by API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findAll() {
        try {
            const stmt = this.db.prepare('SELECT * FROM users');
            const rows = stmt.all();
            return rows.map(row => this.mapRowToUser(row));
        }
        catch (error) {
            throw new Error(`Failed to find all users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async delete(userId) {
        try {
            const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = stmt.run(userId);
            return result.changes > 0;
        }
        catch (error) {
            throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    mapRowToUser(row) {
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            password_hash: row.password_hash,
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            is_active: row.is_active === 1,
            created_at: row.created_at ? new Date(row.created_at) : null,
            updated_at: row.updated_at ? new Date(row.updated_at) : null,
            last_login: row.last_login ? new Date(row.last_login) : null,
            api_key: row.api_key,
        };
    }
    // Password utility methods
    static setPassword(password) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.createHash('sha256').update(password + salt).digest('hex');
        return `${salt}:${hash}`;
    }
    static checkPassword(password, passwordHash) {
        if (!passwordHash || !passwordHash.includes(':'))
            return false;
        const [salt, storedHash] = passwordHash.split(':');
        const hash = crypto_1.default.createHash('sha256').update(password + salt).digest('hex');
        return hash === storedHash;
    }
    static generateApiKey() {
        return crypto_1.default.randomBytes(32).toString('base64url');
    }
    // Convert user to safe object (without password_hash)
    static toSafeObject(user) {
        const { password_hash, ...safeUser } = user;
        return safeUser;
    }
    close() {
        this.db.close();
    }
}
exports.UserModel = UserModel;
// Factory function for creating users
function createUser(userData) {
    const validatedData = exports.UserCreateSchema.parse(userData);
    return {
        id: null,
        username: validatedData.username,
        email: validatedData.email,
        password_hash: UserModel.setPassword(validatedData.password),
        first_name: validatedData.first_name || '',
        last_name: validatedData.last_name || '',
        is_active: validatedData.is_active ?? true,
        created_at: new Date(),
        updated_at: null,
        last_login: null,
        api_key: null,
    };
}
// Default instance for backward compatibility
exports.userModel = new UserModel();
//# sourceMappingURL=user.js.map