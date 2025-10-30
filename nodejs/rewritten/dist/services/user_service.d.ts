import { z } from 'zod';
import { User, UserCreate, UserUpdate } from '../models/user';
export interface UserServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
}
export interface UserFilters {
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'username' | 'email' | 'created_at' | 'last_login';
    sortOrder?: 'asc' | 'desc';
}
export declare const UserFiltersSchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodBoolean>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodNumber>>, number, number | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodNumber>>, number, number | undefined>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["username", "email", "created_at", "last_login"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "username" | "email" | "last_login" | "created_at";
    sortOrder: "asc" | "desc";
    isActive?: boolean | undefined;
    search?: string | undefined;
}, {
    isActive?: boolean | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "username" | "email" | "last_login" | "created_at" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare class UserService {
    /**
     * Get all users with optional filtering and pagination
     */
    getUsers(filters?: UserFilters): Promise<UserServiceResponse<UserListResponse>>;
    /**
     * Get a single user by ID
     */
    getUser(userId: number): Promise<UserServiceResponse<User>>;
    /**
     * Get a user by username
     */
    getUserByUsername(username: string): Promise<UserServiceResponse<User>>;
    /**
     * Get a user by email
     */
    getUserByEmail(email: string): Promise<UserServiceResponse<User>>;
    /**
     * Create a new user
     */
    createUser(userCreateData: UserCreate): Promise<UserServiceResponse<User>>;
    /**
     * Update an existing user
     */
    updateUser(userId: number, userData: UserUpdate): Promise<UserServiceResponse<User>>;
    /**
     * Delete a user
     */
    deleteUser(userId: number): Promise<UserServiceResponse<void>>;
    /**
     * Activate a user
     */
    activateUser(userId: number): Promise<UserServiceResponse<User>>;
    /**
     * Deactivate a user
     */
    deactivateUser(userId: number): Promise<UserServiceResponse<User>>;
    /**
     * Get user statistics
     */
    getUserStats(): Promise<UserServiceResponse<{
        total: number;
        active: number;
        inactive: number;
        recentlyCreated: number;
    }>>;
    /**
     * Helper method to get sort value for a user
     */
    private getSortValue;
}
export declare const userService: UserService;
export declare function getUsers(filters?: UserFilters): Promise<UserListResponse>;
export declare function getUser(userId: number): Promise<User | null>;
export declare function createUser(userData: UserCreate): Promise<User>;
//# sourceMappingURL=user_service.d.ts.map