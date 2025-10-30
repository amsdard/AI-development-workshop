import type { Database, SqlJsStatic } from 'sql.js';
import { z } from 'zod';
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
export declare const DatabaseConfigSchema: z.ZodObject<{
    dbPath: z.ZodString;
    autoSave: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoSaveInterval: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    enableWAL: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    enableForeignKeys: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    dbPath: string;
    enableWAL: boolean;
    enableForeignKeys: boolean;
    timeout: number;
    autoSave: boolean;
    autoSaveInterval: number;
}, {
    dbPath: string;
    enableWAL?: boolean | undefined;
    enableForeignKeys?: boolean | undefined;
    timeout?: number | undefined;
    autoSave?: boolean | undefined;
    autoSaveInterval?: number | undefined;
}>;
export declare class DatabaseManager {
    private static instance;
    private connection;
    private config;
    private autoSaveTimer;
    private isInitialized;
    private constructor();
    static getInstance(config?: DatabaseConfig): DatabaseManager;
    static resetInstance(): void;
    initialize(): Promise<void>;
    getDatabase(): Database;
    getSQL(): SqlJsStatic;
    save(): Promise<void>;
    close(): Promise<void>;
    getStats(): Promise<DatabaseStats>;
    executeQuery<T = any>(query: string, params?: any[]): Promise<T[]>;
    executeUpdate(query: string, params?: any[]): Promise<{
        changes: number;
        lastInsertRowid: number;
    }>;
    backup(backupPath: string): Promise<void>;
    isDatabaseInitialized(): boolean;
    getConfig(): DatabaseConfig;
    private setupAutoSave;
    private cleanup;
}
export declare function createDatabaseManager(config: DatabaseConfig): DatabaseManager;
export declare const defaultConfig: DatabaseConfig;
export declare function initDatabase(config?: DatabaseConfig): Promise<Database>;
export declare function getDatabase(): Database;
export declare function saveDatabase(): Promise<void>;
export declare function closeDatabase(): Promise<void>;
export declare const dbManager: typeof DatabaseManager.getInstance;
//# sourceMappingURL=database.d.ts.map