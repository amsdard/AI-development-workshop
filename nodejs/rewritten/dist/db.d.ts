import Database from 'better-sqlite3';
import { z } from 'zod';
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
export declare const DatabaseConfigSchema: z.ZodObject<{
    dbPath: z.ZodString;
    enableWAL: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    enableForeignKeys: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    dbPath: string;
    enableWAL: boolean;
    enableForeignKeys: boolean;
    timeout: number;
}, {
    dbPath: string;
    enableWAL?: boolean | undefined;
    enableForeignKeys?: boolean | undefined;
    timeout?: number | undefined;
}>;
export declare class DatabaseManager {
    private db;
    private config;
    private isConnected;
    constructor(config: DatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    initializeTables(): Promise<void>;
    seedData(seedData?: SeedData): Promise<void>;
    getStats(): Promise<DatabaseStats>;
    executeQuery<T = any>(query: string, params?: any[]): Promise<T[]>;
    executeUpdate(query: string, params?: any[]): Promise<{
        changes: number;
        lastInsertRowid: number;
    }>;
    getDatabase(): Database.Database;
    isDatabaseConnected(): boolean;
    backup(backupPath: string): Promise<void>;
}
export declare function createDatabaseManager(config: DatabaseConfig): DatabaseManager;
export declare const defaultConfig: DatabaseConfig;
export declare const dbManager: DatabaseManager;
export declare function initDB(): Promise<void>;
//# sourceMappingURL=db.d.ts.map