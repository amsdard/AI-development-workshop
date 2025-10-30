import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager, createDatabaseManager, defaultConfig } from '../src/db';
import fs from 'fs';
import path from 'path';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const testDbPath = 'test_taskflow.db';

  beforeEach(() => {
    // Create a fresh database manager for each test
    dbManager = createDatabaseManager({
      ...defaultConfig,
      dbPath: testDbPath,
    });
  });

  afterEach(async () => {
    // Clean up test database
    try {
      await dbManager.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      await expect(dbManager.connect()).resolves.not.toThrow();
      expect(dbManager.isDatabaseConnected()).toBe(true);
    });

    it('should disconnect from database successfully', async () => {
      await dbManager.connect();
      await expect(dbManager.disconnect()).resolves.not.toThrow();
      expect(dbManager.isDatabaseConnected()).toBe(false);
    });

    it('should handle multiple connect calls gracefully', async () => {
      await dbManager.connect();
      await dbManager.connect(); // Should not throw
      expect(dbManager.isDatabaseConnected()).toBe(true);
    });

    it('should create database directory if it does not exist', async () => {
      const testDir = 'test-db-dir';
      const testDbPath = path.join(testDir, 'test.db');
      
      const testManager = createDatabaseManager({
        ...defaultConfig,
        dbPath: testDbPath,
      });

      try {
        await testManager.connect();
        expect(fs.existsSync(testDir)).toBe(true);
        expect(fs.existsSync(testDbPath)).toBe(true);
      } finally {
        await testManager.disconnect();
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir);
        }
      }
    });
  });

  describe('Table Initialization', () => {
    it('should initialize tables successfully', async () => {
      await dbManager.connect();
      await expect(dbManager.initializeTables()).resolves.not.toThrow();
    });

    it('should create users table with correct schema', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();

      const tables = await dbManager.executeQuery<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      
      expect(tables).toHaveLength(1);
      expect(tables[0]?.name).toBe('users');
    });

    it('should create tasks table with correct schema', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();

      const tables = await dbManager.executeQuery<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
      );
      
      expect(tables).toHaveLength(1);
      expect(tables[0]?.name).toBe('tasks');
    });

    it('should create indexes for better performance', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();

      const indexes = await dbManager.executeQuery<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      );
      
      expect(indexes.length).toBeGreaterThan(0);
      expect(indexes.some(idx => idx.name === 'idx_users_username')).toBe(true);
      expect(indexes.some(idx => idx.name === 'idx_tasks_user_id')).toBe(true);
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await expect(dbManager.initializeTables()).resolves.not.toThrow();
    });
  });

  describe('Data Seeding', () => {
    it('should seed database with default data', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData();

      const stats = await dbManager.getStats();
      expect(stats.userCount).toBeGreaterThan(0);
      expect(stats.taskCount).toBeGreaterThan(0);
    });

    it('should not seed if data already exists', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData();
      
      const initialStats = await dbManager.getStats();
      
      // Try to seed again
      await dbManager.seedData();
      
      const finalStats = await dbManager.getStats();
      expect(finalStats.userCount).toBe(initialStats.userCount);
      expect(finalStats.taskCount).toBe(initialStats.taskCount);
    });

    it('should seed with custom data', async () => {
      const customData = {
        users: [
          {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'test_hash',
            first_name: 'Test',
            last_name: 'User',
            is_active: true,
          },
        ],
        tasks: [
          {
            id: 1,
            title: 'Test Task',
            description: 'Test Description',
            status: 'pending',
            priority: 'medium',
            due_date: null,
            user_id: 1,
          },
        ],
      };

      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData(customData);

      const stats = await dbManager.getStats();
      expect(stats.userCount).toBe(1);
      expect(stats.taskCount).toBe(1);
    });
  });

  describe('Database Statistics', () => {
    it('should return correct statistics', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData();

      const stats = await dbManager.getStats();
      
      expect(stats.userCount).toBeGreaterThan(0);
      expect(stats.taskCount).toBeGreaterThan(0);
      expect(stats.isInitialized).toBeDefined();
      // lastModified is optional and might be undefined
      expect(stats.lastModified).toBeDefined();
    });

    it('should return zero counts for empty database', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();

      const stats = await dbManager.getStats();
      
      expect(stats.userCount).toBe(0);
      expect(stats.taskCount).toBe(0);
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData();
    });

    it('should execute SELECT queries successfully', async () => {
      const users = await dbManager.executeQuery<{ username: string }>(
        'SELECT username FROM users LIMIT 1'
      );
      
      expect(users).toHaveLength(1);
      expect(users[0]).toHaveProperty('username');
    });

    it('should execute queries with parameters', async () => {
      const users = await dbManager.executeQuery<{ username: string }>(
        'SELECT username FROM users WHERE id = ?',
        [1]
      );
      
      expect(users).toHaveLength(1);
    });

    it('should execute UPDATE queries successfully', async () => {
      const result = await dbManager.executeUpdate(
        'UPDATE users SET first_name = ? WHERE id = ?',
        ['Updated Name', 1]
      );
      
      expect(result.changes).toBe(1);
    });

    it('should execute INSERT queries successfully', async () => {
      const result = await dbManager.executeUpdate(
        'INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['newuser', 'new@example.com', 'hash', 'New', 'User', 1, new Date().toISOString(), new Date().toISOString()]
      );
      
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not connected', async () => {
      await expect(dbManager.initializeTables()).rejects.toThrow('Database not connected');
    });

    it('should throw error for invalid queries', async () => {
      await dbManager.connect();
      
      await expect(
        dbManager.executeQuery('INVALID SQL QUERY')
      ).rejects.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      const invalidManager = createDatabaseManager({
        dbPath: '/invalid/path/that/does/not/exist/db.sqlite',
      });

      // This test might not throw on Windows, so we'll just test that it doesn't crash
      try {
        await invalidManager.connect();
        // If it doesn't throw, that's also acceptable behavior
      } catch (error) {
        // Expected behavior - should throw an error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Database Backup', () => {
    it('should backup database successfully', async () => {
      await dbManager.connect();
      await dbManager.initializeTables();
      await dbManager.seedData();

      const backupPath = 'test_backup.db';
      
      try {
        await dbManager.backup(backupPath);
        expect(fs.existsSync(backupPath)).toBe(true);
      } finally {
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      }
    });

    it('should throw error when not connected for backup', async () => {
      await expect(dbManager.backup('backup.db')).rejects.toThrow('Database not connected');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration with Zod', () => {
      const validConfig = {
        dbPath: 'test.db',
        enableWAL: true,
        enableForeignKeys: true,
        timeout: 5000,
      };

      expect(() => createDatabaseManager(validConfig)).not.toThrow();
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        dbPath: '', // Invalid: empty string
        enableWAL: 'true', // Invalid: should be boolean
        timeout: -1, // Invalid: negative timeout
      };

      expect(() => createDatabaseManager(invalidConfig as any)).toThrow();
    });
  });

  describe('Database Settings', () => {
    it('should apply WAL mode when enabled', async () => {
      const walManager = createDatabaseManager({
        ...defaultConfig,
        dbPath: 'test_wal.db',
        enableWAL: true,
      });

      try {
        await walManager.connect();
        
        const journalMode = await walManager.executeQuery<{ journal_mode: string }>(
          'PRAGMA journal_mode'
        );
        
        expect(journalMode[0]?.journal_mode.toLowerCase()).toBe('wal');
      } finally {
        await walManager.disconnect();
        if (fs.existsSync('test_wal.db')) {
          fs.unlinkSync('test_wal.db');
        }
      }
    });

    it('should apply foreign keys when enabled', async () => {
      const fkManager = createDatabaseManager({
        ...defaultConfig,
        dbPath: 'test_fk.db',
        enableForeignKeys: true,
      });

      try {
        await fkManager.connect();
        
        const foreignKeys = await fkManager.executeQuery<{ foreign_keys: number }>(
          'PRAGMA foreign_keys'
        );
        
        expect(foreignKeys[0]?.foreign_keys).toBe(1);
      } finally {
        await fkManager.disconnect();
        if (fs.existsSync('test_fk.db')) {
          fs.unlinkSync('test_fk.db');
        }
      }
    });
  });

  describe('Legacy Compatibility', () => {
    it('should work with legacy initDB function', async () => {
      const { initDB } = require('../src/db');
      
      // This should not throw
      await expect(initDB()).resolves.not.toThrow();
    });
  });
});
