import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// TypeScript interfaces
export interface DatabaseConfig {
  dbPath: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  timeout?: number;
}

export interface DatabaseStats {
  isInitialized: boolean;
  lastModified?: Date;
  fileSize?: number;
  tableCount?: number;
  userCount?: number;
  taskCount?: number;
}

export interface DatabaseConnection {
  database: Database;
  sql: SqlJsStatic;
  config: DatabaseConfig;
}

// Zod validation schemas
export const DatabaseConfigSchema = z.object({
  dbPath: z.string().min(1),
  autoSave: z.boolean().optional().default(false),
  autoSaveInterval: z.number().int().positive().optional().default(30000), // 30 seconds
  enableWAL: z.boolean().optional().default(false),
  enableForeignKeys: z.boolean().optional().default(true),
  timeout: z.number().int().positive().optional().default(5000),
});

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private connection: DatabaseConnection | null = null;
  private config: DatabaseConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  private constructor(config: DatabaseConfig) {
    this.config = DatabaseConfigSchema.parse(config);
  }

  // Singleton pattern
  public static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      if (!config) {
        throw new Error('DatabaseManager instance not initialized. Provide config on first call.');
      }
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  public static resetInstance(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.cleanup();
      DatabaseManager.instance = null;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize SQL.js
      const SQL = await initSqlJs({
        // Optional: Add wasm binary path if needed
        // locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Ensure directory exists
      const dbDir = path.dirname(this.config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      let database: Database;
      
      // Try to load existing database
      if (fs.existsSync(this.config.dbPath)) {
        try {
          const data = fs.readFileSync(this.config.dbPath);
          database = new SQL.Database(data);
        } catch (error) {
          console.warn(`Failed to load existing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
          database = new SQL.Database();
        }
      } else {
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
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getDatabase(): Database {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.connection.database;
  }

  getSQL(): SqlJsStatic {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.connection.sql;
  }

  async save(): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const data = this.connection.database.export();
      const buffer = Buffer.from(data);
      
      // Write to temporary file first, then rename (atomic operation)
      const tempPath = `${this.config.dbPath}.tmp`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, this.config.dbPath);
      
      console.log('Database saved successfully');
    } catch (error) {
      throw new Error(`Failed to save database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.connection) {
        await this.save();
        this.connection.database.close();
        this.connection = null;
      }
      
      this.cleanup();
      this.isInitialized = false;
      
      console.log('Database closed successfully');
    } catch (error) {
      throw new Error(`Failed to close database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(): Promise<DatabaseStats> {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const stats: DatabaseStats = {
        isInitialized: this.isInitialized,
      };

      // Get file stats
      if (fs.existsSync(this.config.dbPath)) {
        const fileStat = fs.statSync(this.config.dbPath);
        stats.lastModified = fileStat.mtime;
        stats.fileSize = fileStat.size;
      }

      // Get database stats
      try {
        const tableCountResult = this.connection.database.exec(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
        );
        stats.tableCount = tableCountResult[0]?.values[0]?.[0] as number || 0;

        // Get user count
        try {
          const userCountResult = this.connection.database.exec('SELECT COUNT(*) as count FROM users');
          stats.userCount = userCountResult[0]?.values[0]?.[0] as number || 0;
        } catch {
          // Users table might not exist yet
          stats.userCount = 0;
        }

        // Get task count
        try {
          const taskCountResult = this.connection.database.exec('SELECT COUNT(*) as count FROM tasks');
          stats.taskCount = taskCountResult[0]?.values[0]?.[0] as number || 0;
        } catch {
          // Tasks table might not exist yet
          stats.taskCount = 0;
        }
      } catch (error) {
        // Database might be empty or corrupted
        console.warn('Could not retrieve database statistics:', error);
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const stmt = this.connection.database.prepare(query);
      const result: T[] = [];
      
      // Bind parameters if provided
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      while (stmt.step()) {
        result.push(stmt.getAsObject() as T);
      }
      
      stmt.free();
      return result;
    } catch (error) {
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeUpdate(query: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
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
      const lastInsertRowid = this.connection.database.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number || 0;
      
      stmt.free();
      return { changes, lastInsertRowid };
    } catch (error) {
      throw new Error(`Failed to execute update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const data = this.connection.database.export();
      const buffer = Buffer.from(data);
      
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, buffer);
      console.log(`Database backed up to: ${backupPath}`);
    } catch (error) {
      throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isDatabaseInitialized(): boolean {
    return this.isInitialized && this.connection !== null;
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.save();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.config.autoSaveInterval);
  }


  private cleanup(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}

// Factory function for creating database manager
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager {
  // Validate config first
  const validatedConfig = DatabaseConfigSchema.parse(config);
  return DatabaseManager.getInstance(validatedConfig);
}

// Default configuration
export const defaultConfig: DatabaseConfig = {
  dbPath: 'taskflow.db',
  autoSave: false,
  autoSaveInterval: 30000,
  enableWAL: false,
  enableForeignKeys: true,
  timeout: 5000,
};

// Legacy functions for backward compatibility
let legacyManager: DatabaseManager | null = null;

export async function initDatabase(config?: DatabaseConfig): Promise<Database> {
  const managerConfig = config || defaultConfig;
  legacyManager = createDatabaseManager(managerConfig);
  await legacyManager.initialize();
  return legacyManager.getDatabase();
}

export function getDatabase(): Database {
  if (!legacyManager) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return legacyManager.getDatabase();
}

export async function saveDatabase(): Promise<void> {
  if (!legacyManager) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  await legacyManager.save();
}

export async function closeDatabase(): Promise<void> {
  if (legacyManager) {
    await legacyManager.close();
    legacyManager = null;
  }
}

// Export the singleton instance getter
export const dbManager = DatabaseManager.getInstance;
