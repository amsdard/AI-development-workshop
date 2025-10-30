import Database from 'better-sqlite3';
import { z } from 'zod';
import crypto from 'crypto';

// TypeScript interfaces
export interface User {
  id: number | null;
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: Date | null;
  updated_at: Date | null;
  last_login: Date | null;
  api_key: string | null;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  last_login?: Date | null;
  api_key?: string | null;
}

// Zod validation schemas
export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UserUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional(),
  last_login: z.date().nullable().optional(),
  api_key: z.string().nullable().optional(),
});

export class UserModel {
  private db: Database.Database;

  constructor(dbPath: string = 'taskflow.db') {
    this.db = new Database(dbPath);
    this.initializeTable();
  }

  private initializeTable(): void {
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

  async save(user: User): Promise<User> {
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
        
        stmt.run(
          user.username,
          user.email,
          user.password_hash,
          user.first_name,
          user.last_name,
          user.is_active ? 1 : 0,
          now,
          user.last_login?.toISOString() || null,
          user.api_key,
          user.id
        );
      } else {
        // Insert new user
        const stmt = this.db.prepare(`
          INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, created_at, updated_at, api_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          user.username,
          user.email,
          user.password_hash,
          user.first_name,
          user.last_name,
          user.is_active ? 1 : 0,
          now,
          now,
          user.api_key
        );
        
        user.id = Number(result.lastInsertRowid);
      }

      user.updated_at = new Date(now);
      return user;
    } catch (error) {
      throw new Error(`Failed to save user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(userId: number): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const row = stmt.get(userId) as any;

      if (!row) return null;

      return this.mapRowToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
      const row = stmt.get(username) as any;

      if (!row) return null;

      return this.mapRowToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const row = stmt.get(email) as any;

      if (!row) return null;

      return this.mapRowToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE api_key = ?');
      const row = stmt.get(apiKey) as any;

      if (!row) return null;

      return this.mapRowToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users');
      const rows = stmt.all() as any[];

      return rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      throw new Error(`Failed to find all users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(userId: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(userId);
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRowToUser(row: any): User {
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
  static setPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return `${salt}:${hash}`;
  }

  static checkPassword(password: string, passwordHash: string): boolean {
    if (!passwordHash || !passwordHash.includes(':')) return false;
    
    const [salt, storedHash] = passwordHash.split(':');
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return hash === storedHash;
  }

  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Convert user to safe object (without password_hash)
  static toSafeObject(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  close(): void {
    this.db.close();
  }
}

// Factory function for creating users
export function createUser(userData: UserCreate): User {
  const validatedData = UserCreateSchema.parse(userData);
  
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
export const userModel = new UserModel();
