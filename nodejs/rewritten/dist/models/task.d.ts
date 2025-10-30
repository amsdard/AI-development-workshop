import { z } from 'zod';
export interface Task {
    id: number | null;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: Date | null;
    user_id: number | null;
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
}
export interface TaskCreate {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: Date | null;
    user_id?: number | null;
}
export interface TaskUpdate {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: Date | null;
    user_id?: number | null;
}
export interface TaskFilters {
    user_id?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    limit?: number;
    offset?: number;
}
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export declare const TaskCreateSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
    due_date: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    user_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: "in_progress" | "pending" | "completed" | "cancelled";
    title: string;
    priority: "high" | "medium" | "low" | "urgent";
    description?: string | undefined;
    due_date?: Date | null | undefined;
    user_id?: number | null | undefined;
}, {
    title: string;
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    description?: string | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    due_date?: Date | null | undefined;
    user_id?: number | null | undefined;
}>;
export declare const TaskUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    due_date: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    user_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    due_date?: Date | null | undefined;
    user_id?: number | null | undefined;
}, {
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    due_date?: Date | null | undefined;
    user_id?: number | null | undefined;
}>;
export declare const TaskFiltersSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    user_id?: number | undefined;
}, {
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    limit?: number | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    user_id?: number | undefined;
    offset?: number | undefined;
}>;
export declare class TaskModel {
    private db;
    constructor(dbPath?: string);
    private initializeTable;
    save(task: Task): Promise<Task>;
    findById(taskId: number): Promise<Task | null>;
    findAll(filters?: TaskFilters): Promise<Task[]>;
    findByUserId(userId: number, filters?: Omit<TaskFilters, 'user_id'>): Promise<Task[]>;
    findByStatus(status: TaskStatus, filters?: Omit<TaskFilters, 'status'>): Promise<Task[]>;
    findByPriority(priority: TaskPriority, filters?: Omit<TaskFilters, 'priority'>): Promise<Task[]>;
    delete(taskId: number): Promise<boolean>;
    hardDelete(taskId: number): Promise<boolean>;
    count(filters?: TaskFilters): Promise<number>;
    private mapRowToTask;
    static toSafeObject(task: Task): Omit<Task, 'deleted_at'>;
    /**
     * Find overdue tasks with pagination and days filtering
     */
    findOverdue(days?: number, limit?: number, offset?: number): Promise<Task[]>;
    /**
     * Count total overdue tasks for pagination
     */
    countOverdue(days?: number): Promise<number>;
    /**
     * Calculate days overdue for a task
     */
    static calculateDaysOverdue(dueDate: Date): number;
    close(): void;
}
export declare function createTask(taskData: TaskCreate): Task;
export declare const taskModel: TaskModel;
//# sourceMappingURL=task.d.ts.map