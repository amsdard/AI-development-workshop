import { z } from 'zod';
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
export declare const UserCreateSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    first_name: z.ZodOptional<z.ZodString>;
    last_name: z.ZodOptional<z.ZodString>;
    is_active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    password: string;
    is_active: boolean;
    first_name?: string | undefined;
    last_name?: string | undefined;
}, {
    username: string;
    email: string;
    password: string;
    first_name?: string | undefined;
    last_name?: string | undefined;
    is_active?: boolean | undefined;
}>;
export declare const UserUpdateSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    first_name: z.ZodOptional<z.ZodString>;
    last_name: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    last_login: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    api_key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    email?: string | undefined;
    first_name?: string | undefined;
    last_name?: string | undefined;
    is_active?: boolean | undefined;
    last_login?: Date | null | undefined;
    api_key?: string | null | undefined;
}, {
    username?: string | undefined;
    email?: string | undefined;
    first_name?: string | undefined;
    last_name?: string | undefined;
    is_active?: boolean | undefined;
    last_login?: Date | null | undefined;
    api_key?: string | null | undefined;
}>;
export declare class UserModel {
    private db;
    constructor(dbPath?: string);
    private initializeTable;
    save(user: User): Promise<User>;
    findById(userId: number): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByApiKey(apiKey: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    delete(userId: number): Promise<boolean>;
    private mapRowToUser;
    static setPassword(password: string): string;
    static checkPassword(password: string, passwordHash: string): boolean;
    static generateApiKey(): string;
    static toSafeObject(user: User): Omit<User, 'password_hash'>;
    close(): void;
}
export declare function createUser(userData: UserCreate): User;
export declare const userModel: UserModel;
//# sourceMappingURL=user.d.ts.map