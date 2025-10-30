import { z } from 'zod';
import { Task, TaskCreate, TaskUpdate } from '../models/task';
export interface TaskServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface TaskListResponse {
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    overdue: number;
    completed: number;
    pending: number;
}
export interface TaskFilters {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    userId?: number;
    search?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    overdue?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'status' | 'priority' | 'due_date' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}
export interface OverdueTasksQuery {
    days?: number;
    limit?: number;
    offset?: number;
}
export interface OverdueTasksResponse {
    tasks: Array<Task & {
        days_overdue: number;
    }>;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
export interface TaskStats {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    byPriority: {
        low: number;
        medium: number;
        high: number;
        urgent: number;
    };
    byUser: Array<{
        user_id: number;
        username: string;
        task_count: number;
    }>;
    recentActivity: Array<{
        id: number;
        title: string;
        status: string;
        updated_at: Date;
    }>;
}
export declare const TaskFiltersSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    userId: z.ZodOptional<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    dueDateFrom: z.ZodOptional<z.ZodString>;
    dueDateTo: z.ZodOptional<z.ZodString>;
    overdue: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodNumber>>, number, number | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodNumber>>, number, number | undefined>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["title", "status", "priority", "due_date", "created_at", "updated_at"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "status" | "created_at" | "updated_at" | "title" | "priority" | "due_date";
    sortOrder: "asc" | "desc";
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    search?: string | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    userId?: number | undefined;
    dueDateFrom?: string | undefined;
    dueDateTo?: string | undefined;
    overdue?: boolean | undefined;
}, {
    status?: "in_progress" | "pending" | "completed" | "cancelled" | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "status" | "created_at" | "updated_at" | "title" | "priority" | "due_date" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    priority?: "high" | "medium" | "low" | "urgent" | undefined;
    userId?: number | undefined;
    dueDateFrom?: string | undefined;
    dueDateTo?: string | undefined;
    overdue?: boolean | undefined;
}>;
export declare const OverdueTasksQuerySchema: z.ZodObject<{
    days: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    days: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    days?: number | undefined;
}>;
export declare class TaskService {
    /**
     * Get all tasks with optional filtering and pagination
     */
    getTasks(filters?: TaskFilters): Promise<TaskServiceResponse<TaskListResponse>>;
    /**
     * Get a single task by ID
     */
    getTask(taskId: number): Promise<TaskServiceResponse<Task>>;
    /**
     * Get tasks by user ID
     */
    getTasksByUser(userId: number): Promise<TaskServiceResponse<Task[]>>;
    /**
     * Get overdue tasks with query parameters
     */
    getOverdueTasks(query?: OverdueTasksQuery): Promise<TaskServiceResponse<OverdueTasksResponse>>;
    /**
     * Create a new task
     */
    createTask(taskData: TaskCreate): Promise<TaskServiceResponse<Task>>;
    /**
     * Update an existing task
     */
    updateTask(taskId: number, taskData: TaskUpdate): Promise<TaskServiceResponse<Task>>;
    /**
     * Delete a task
     */
    deleteTask(taskId: number): Promise<TaskServiceResponse<void>>;
    /**
     * Mark task as completed
     */
    completeTask(taskId: number): Promise<TaskServiceResponse<Task>>;
    /**
     * Mark task as in progress
     */
    startTask(taskId: number): Promise<TaskServiceResponse<Task>>;
    /**
     * Cancel a task
     */
    cancelTask(taskId: number): Promise<TaskServiceResponse<Task>>;
    /**
     * Get task statistics
     */
    getTaskStats(): Promise<TaskServiceResponse<TaskStats>>;
    /**
     * Get tasks due today
     */
    getTasksDueToday(): Promise<TaskServiceResponse<Task[]>>;
    /**
     * Get tasks due this week
     */
    getTasksDueThisWeek(): Promise<TaskServiceResponse<Task[]>>;
    /**
     * Helper method to get sort value for a task
     */
    private getSortValue;
    /**
     * Helper method to get tasks by user statistics
     */
    private getTasksByUserStats;
    /**
     * Helper method to get recent activity
     */
    private getRecentActivity;
}
export declare const taskService: TaskService;
export declare function getTasks(filters?: TaskFilters): Promise<Task[]>;
export declare function getTask(taskId: number): Promise<Task | null>;
export declare function createTask(taskData: TaskCreate): Promise<Task>;
export declare function updateTask(taskId: number, taskData: TaskUpdate): Promise<Task>;
export declare function deleteTask(taskId: number): Promise<boolean>;
//# sourceMappingURL=task_service.d.ts.map