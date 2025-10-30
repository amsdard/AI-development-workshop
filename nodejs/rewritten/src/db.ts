import Database from 'better-sqlite3';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// TypeScript interfaces
export interface DatabaseConfig {
  dbPath: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  timeout?: number;
}

export interface DatabaseStats {
  userCount: number;
  taskCount: number;
  isInitialized: boolean;
  lastModified?: Date | undefined;
}

export interface SeedData {
  users: Array<{
    id: number;
    username: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    user_id: number | null;
  }>;
}

// Zod validation schemas
export const DatabaseConfigSchema = z.object({
  dbPath: z.string().min(1),
  enableWAL: z.boolean().optional().default(true),
  enableForeignKeys: z.boolean().optional().default(true),
  timeout: z.number().int().positive().optional().default(5000),
});

export class DatabaseManager {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = DatabaseConfigSchema.parse(config);
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected && this.db) {
        return;
      }

      // Ensure directory exists
      const dbDir = path.dirname(this.config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(this.config.dbPath);
      
      // Configure database settings
      if (this.config.enableWAL) {
        this.db.pragma('journal_mode = WAL');
      }
      
      if (this.config.enableForeignKeys) {
        this.db.pragma('foreign_keys = ON');
      }

      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = MEMORY');

      this.isConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.isConnected = false;
      }
    } catch (error) {
      throw new Error(`Failed to disconnect from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async initializeTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      // Create users table
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

      // Create tasks table
      this.db.exec(`
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
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
      `);
    } catch (error) {
      throw new Error(`Failed to initialize tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async seedData(seedData?: SeedData): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      // Check if data already exists
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };

      if (userCount.count > 0 || taskCount.count > 0) {
        console.log('Database already contains data, skipping seed.');
        return;
      }

      const defaultSeedData: SeedData = {
        users: [
          {
            id: 1,
            username: 'john_doe',
            email: 'john@example.com',
            password_hash: 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            first_name: 'John',
            last_name: 'Doe',
            is_active: true,
          },
          {
            id: 2,
            username: 'jane_smith',
            email: 'jane@example.com',
            password_hash: 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            first_name: 'Jane',
            last_name: 'Smith',
            is_active: true,
          },
          {
            id: 3,
            username: 'bob_johnson',
            email: 'bob@example.com',
            password_hash: 'abc123:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            first_name: 'Bob',
            last_name: 'Johnson',
            is_active: true,
          },
        ],
        tasks: [
          {
            id: 1,
            title: 'Fix login bug',
            description: 'Users cannot login with special characters',
            status: 'in_progress',
            priority: 'high',
            due_date: '2025-10-20 10:00:00',
            user_id: 1,
          },
          {
            id: 2,
            title: 'Update documentation',
            description: 'Add API examples to README',
            status: 'pending',
            priority: 'medium',
            due_date: '2025-10-25 15:00:00',
            user_id: 2,
          },
          {
            id: 3,
            title: 'Review Q4 report',
            description: 'Financial review for Q4 2024',
            status: 'completed',
            priority: 'high',
            due_date: '2025-10-15 09:00:00',
            user_id: 1,
          },
          {
            id: 4,
            title: 'Design new homepage',
            description: 'Mockups for redesign',
            status: 'pending',
            priority: 'low',
            due_date: '2025-11-01 12:00:00',
            user_id: 3,
          },
          {
            id: 5,
            title: 'Setup CI/CD pipeline',
            description: 'Configure GitHub Actions',
            status: 'pending',
            priority: 'high',
            due_date: '2025-10-10 14:00:00',
            user_id: 2,
          },
          {
            id: 6,
            title: 'Refactor user service',
            description: 'Clean up legacy code',
            status: 'pending',
            priority: 'medium',
            due_date: null,
            user_id: null,
          },
        ],
      };

      const data = seedData || defaultSeedData;
      const now = new Date().toISOString();

      // Insert users
      const insertUser = this.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of data.users) {
        insertUser.run(
          user.id,
          user.username,
          user.email,
          user.password_hash,
          user.first_name,
          user.last_name,
          user.is_active ? 1 : 0,
          now,
          now
        );
      }

      // Insert tasks
      const insertTask = this.db.prepare(`
        INSERT INTO tasks (id, title, description, status, priority, due_date, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const task of data.tasks) {
        insertTask.run(
          task.id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.due_date,
          task.user_id,
          now,
          now
        );
      }

      console.log(`Seeded database with ${data.users.length} users and ${data.tasks.length} tasks.`);
    } catch (error) {
      throw new Error(`Failed to seed database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(): Promise<DatabaseStats> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
      
      const stats = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
      const isInitialized = stats.user_version > 0;

      // Get file modification time
      let lastModified: Date | undefined;
      try {
        const stat = fs.statSync(this.config.dbPath);
        lastModified = stat.mtime;
      } catch {
        // File might not exist yet
      }

      return {
        userCount: userCount.count,
        taskCount: taskCount.count,
        isInitialized,
        lastModified,
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const stmt = this.db.prepare(query);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeUpdate(query: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    } catch (error) {
      throw new Error(`Failed to execute update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  isDatabaseConnected(): boolean {
    return this.isConnected && this.db !== null;
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const backup = this.db.backup(backupPath);
      await backup;
    } catch (error) {
      throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Factory function for creating database manager
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager {
  return new DatabaseManager(config);
}

// Default configuration
export const defaultConfig: DatabaseConfig = {
  dbPath: 'taskflow.db',
  enableWAL: true,
  enableForeignKeys: true,
  timeout: 5000,
};

// Default instance for backward compatibility
export const dbManager = new DatabaseManager(defaultConfig);

// Legacy function for backward compatibility
export async function initDB(): Promise<void> {
  try {
    await dbManager.connect();
    await dbManager.initializeTables();
    await dbManager.seedData();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
