"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskService = exports.OverdueTasksQuerySchema = exports.TaskFiltersSchema = void 0;
exports.getTasks = getTasks;
exports.getTask = getTask;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
const zod_1 = require("zod");
const task_1 = require("../models/task");
// Validation schemas for service operations
exports.TaskFiltersSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    userId: zod_1.z.number().int().positive().optional(),
    search: zod_1.z.string().min(1).optional(),
    dueDateFrom: zod_1.z.string().datetime().optional(),
    dueDateTo: zod_1.z.string().datetime().optional(),
    overdue: zod_1.z.boolean().optional(),
    page: zod_1.z.number().int().optional().default(1).transform(val => val < 1 ? 1 : val),
    limit: zod_1.z.number().int().optional().default(10).transform(val => val < 1 ? 10 : val > 100 ? 100 : val),
    sortBy: zod_1.z.enum(['title', 'status', 'priority', 'due_date', 'created_at', 'updated_at']).optional().default('created_at'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
exports.OverdueTasksQuerySchema = zod_1.z.object({
    days: zod_1.z.number().int().min(0).optional().default(0),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    offset: zod_1.z.number().int().min(0).optional().default(0),
});
class TaskService {
    /**
     * Get all tasks with optional filtering and pagination
     */
    async getTasks(filters) {
        try {
            // Validate filters
            const validatedFilters = exports.TaskFiltersSchema.parse(filters || {});
            // Get all tasks from the model
            const tasks = await task_1.taskModel.findAll();
            // Apply filters
            let filteredTasks = tasks;
            // Filter by status
            if (validatedFilters.status) {
                filteredTasks = filteredTasks.filter((task) => task.status === validatedFilters.status);
            }
            // Filter by priority
            if (validatedFilters.priority) {
                filteredTasks = filteredTasks.filter((task) => task.priority === validatedFilters.priority);
            }
            // Filter by user
            if (validatedFilters.userId) {
                filteredTasks = filteredTasks.filter((task) => task.user_id === validatedFilters.userId);
            }
            // Filter by search term
            if (validatedFilters.search) {
                const searchTerm = validatedFilters.search.toLowerCase();
                filteredTasks = filteredTasks.filter((task) => task.title.toLowerCase().includes(searchTerm) ||
                    (task.description && task.description.toLowerCase().includes(searchTerm)));
            }
            // Filter by due date range
            if (validatedFilters.dueDateFrom) {
                const fromDate = new Date(validatedFilters.dueDateFrom);
                filteredTasks = filteredTasks.filter((task) => task.due_date && new Date(task.due_date) >= fromDate);
            }
            if (validatedFilters.dueDateTo) {
                const toDate = new Date(validatedFilters.dueDateTo);
                filteredTasks = filteredTasks.filter((task) => task.due_date && new Date(task.due_date) <= toDate);
            }
            // Filter overdue tasks
            if (validatedFilters.overdue) {
                const now = new Date();
                filteredTasks = filteredTasks.filter((task) => task.due_date &&
                    new Date(task.due_date) < now &&
                    task.status !== 'completed');
            }
            // Sort tasks
            filteredTasks.sort((a, b) => {
                const aValue = this.getSortValue(a, validatedFilters.sortBy);
                const bValue = this.getSortValue(b, validatedFilters.sortBy);
                if (validatedFilters.sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                }
                else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });
            // Apply pagination
            const startIndex = (validatedFilters.page - 1) * validatedFilters.limit;
            const endIndex = startIndex + validatedFilters.limit;
            const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
            // Calculate statistics
            const now = new Date();
            const overdue = filteredTasks.filter((task) => task.due_date &&
                new Date(task.due_date) < now &&
                task.status !== 'completed').length;
            const completed = filteredTasks.filter((task) => task.status === 'completed').length;
            const pending = filteredTasks.filter((task) => task.status === 'pending').length;
            return {
                success: true,
                data: {
                    tasks: paginatedTasks,
                    total: filteredTasks.length,
                    page: validatedFilters.page,
                    limit: validatedFilters.limit,
                    overdue,
                    completed,
                    pending,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get a single task by ID
     */
    async getTask(taskId) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            const task = await task_1.taskModel.findById(taskId);
            if (!task) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            return {
                success: true,
                data: task,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get tasks by user ID
     */
    async getTasksByUser(userId) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            const tasks = await task_1.taskModel.findAll();
            const userTasks = tasks.filter((task) => task.user_id === userId);
            return {
                success: true,
                data: userTasks,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get overdue tasks with query parameters
     */
    async getOverdueTasks(query = {}) {
        try {
            // Validate query parameters
            const validatedQuery = exports.OverdueTasksQuerySchema.parse(query);
            // Get overdue tasks from database with pagination
            const tasks = await task_1.taskModel.findOverdue(validatedQuery.days, validatedQuery.limit, validatedQuery.offset);
            // Get total count for pagination
            const total = await task_1.taskModel.countOverdue(validatedQuery.days);
            // Calculate days_overdue for each task
            const tasksWithDaysOverdue = tasks.map(task => ({
                ...task,
                days_overdue: task.due_date ? task_1.TaskModel.calculateDaysOverdue(task.due_date) : 0
            }));
            // Calculate hasMore flag
            const hasMore = (validatedQuery.offset + validatedQuery.limit) < total;
            return {
                success: true,
                data: {
                    tasks: tasksWithDaysOverdue,
                    total,
                    limit: validatedQuery.limit,
                    offset: validatedQuery.offset,
                    hasMore
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Create a new task
     */
    async createTask(taskData) {
        try {
            // Validate input data
            const validatedData = task_1.TaskCreateSchema.parse(taskData);
            // Create new task
            const task = new task_1.TaskModel();
            const taskObj = {
                id: null,
                title: validatedData.title,
                description: validatedData.description || '',
                status: validatedData.status || 'pending',
                priority: validatedData.priority || 'medium',
                user_id: validatedData.user_id || null,
                due_date: validatedData.due_date ? new Date(validatedData.due_date) : null,
                created_at: new Date(),
                updated_at: null,
                deleted_at: null,
            };
            const savedTask = await task.save(taskObj);
            return {
                success: true,
                data: savedTask,
                message: 'Task created successfully',
            };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return {
                    success: false,
                    error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Update an existing task
     */
    async updateTask(taskId, taskData) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            // Validate input data
            const validatedData = task_1.TaskUpdateSchema.parse(taskData);
            // Check if task exists
            const existingTask = await task_1.taskModel.findById(taskId);
            if (!existingTask) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            // Update task
            const task = new task_1.TaskModel();
            const updatedTask = await task.save({
                ...existingTask,
                title: validatedData.title || existingTask.title,
                description: validatedData.description !== undefined ? validatedData.description : existingTask.description,
                status: validatedData.status || existingTask.status,
                priority: validatedData.priority || existingTask.priority,
                user_id: validatedData.user_id !== undefined ? validatedData.user_id : existingTask.user_id,
                due_date: validatedData.due_date !== undefined ?
                    (validatedData.due_date ? new Date(validatedData.due_date) : null) :
                    existingTask.due_date,
                updated_at: new Date(),
            });
            return {
                success: true,
                data: updatedTask,
                message: 'Task updated successfully',
            };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return {
                    success: false,
                    error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            // Check if task exists
            const existingTask = await task_1.taskModel.findById(taskId);
            if (!existingTask) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            // Delete task
            await task_1.taskModel.delete(taskId);
            return {
                success: true,
                message: 'Task deleted successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Mark task as completed
     */
    async completeTask(taskId) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            const task = await task_1.taskModel.findById(taskId);
            if (!task) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            const taskModelInstance = new task_1.TaskModel();
            const updatedTask = await taskModelInstance.save({
                ...task,
                status: 'completed',
                updated_at: new Date(),
            });
            return {
                success: true,
                data: updatedTask,
                message: 'Task completed successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Mark task as in progress
     */
    async startTask(taskId) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            const task = await task_1.taskModel.findById(taskId);
            if (!task) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            const taskModelInstance = new task_1.TaskModel();
            const updatedTask = await taskModelInstance.save({
                ...task,
                status: 'in_progress',
                updated_at: new Date(),
            });
            return {
                success: true,
                data: updatedTask,
                message: 'Task started successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Cancel a task
     */
    async cancelTask(taskId) {
        try {
            if (!taskId || taskId <= 0) {
                return {
                    success: false,
                    error: 'Invalid task ID provided',
                };
            }
            const task = await task_1.taskModel.findById(taskId);
            if (!task) {
                return {
                    success: false,
                    error: 'Task not found',
                };
            }
            const taskModelInstance = new task_1.TaskModel();
            const updatedTask = await taskModelInstance.save({
                ...task,
                status: 'cancelled',
                updated_at: new Date(),
            });
            return {
                success: true,
                data: updatedTask,
                message: 'Task cancelled successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get task statistics
     */
    async getTaskStats() {
        try {
            const tasks = await task_1.taskModel.findAll();
            const now = new Date();
            const stats = {
                total: tasks.length,
                pending: tasks.filter((task) => task.status === 'pending').length,
                in_progress: tasks.filter((task) => task.status === 'in_progress').length,
                completed: tasks.filter((task) => task.status === 'completed').length,
                cancelled: tasks.filter((task) => task.status === 'cancelled').length,
                overdue: tasks.filter((task) => task.due_date &&
                    new Date(task.due_date) < now &&
                    task.status !== 'completed').length,
                byPriority: {
                    low: tasks.filter((task) => task.priority === 'low').length,
                    medium: tasks.filter((task) => task.priority === 'medium').length,
                    high: tasks.filter((task) => task.priority === 'high').length,
                    urgent: tasks.filter((task) => task.priority === 'urgent').length,
                },
                byUser: this.getTasksByUserStats(tasks),
                recentActivity: this.getRecentActivity(tasks),
            };
            return {
                success: true,
                data: stats,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get tasks due today
     */
    async getTasksDueToday() {
        try {
            const tasks = await task_1.taskModel.findAll();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tasksDueToday = tasks.filter((task) => {
                if (!task.due_date)
                    return false;
                const dueDate = new Date(task.due_date);
                return dueDate >= today && dueDate < tomorrow && task.status !== 'completed';
            });
            return {
                success: true,
                data: tasksDueToday,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get tasks due this week
     */
    async getTasksDueThisWeek() {
        try {
            const tasks = await task_1.taskModel.findAll();
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            const tasksDueThisWeek = tasks.filter((task) => {
                if (!task.due_date)
                    return false;
                const dueDate = new Date(task.due_date);
                return dueDate >= startOfWeek && dueDate < endOfWeek && task.status !== 'completed';
            });
            return {
                success: true,
                data: tasksDueThisWeek,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Helper method to get sort value for a task
     */
    getSortValue(task, sortBy) {
        switch (sortBy) {
            case 'title':
                return task.title;
            case 'status':
                return task.status;
            case 'priority':
                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                return priorityOrder[task.priority] || 0;
            case 'due_date':
                return task.due_date ? new Date(task.due_date).getTime() : 0;
            case 'created_at':
                return task.created_at ? new Date(task.created_at).getTime() : 0;
            case 'updated_at':
                return task.updated_at ? new Date(task.updated_at).getTime() : 0;
            default:
                return task.created_at ? new Date(task.created_at).getTime() : 0;
        }
    }
    /**
     * Helper method to get tasks by user statistics
     */
    getTasksByUserStats(tasks) {
        const userStats = new Map();
        tasks.forEach((task) => {
            if (task.user_id) {
                if (!userStats.has(task.user_id)) {
                    userStats.set(task.user_id, { username: `User ${task.user_id}`, task_count: 0 });
                }
                const stats = userStats.get(task.user_id);
                stats.task_count++;
            }
        });
        return Array.from(userStats.entries()).map(([user_id, stats]) => ({
            user_id,
            ...stats,
        }));
    }
    /**
     * Helper method to get recent activity
     */
    getRecentActivity(tasks) {
        return tasks
            .filter((task) => task.updated_at)
            .sort((a, b) => {
            const aTime = new Date(a.updated_at).getTime();
            const bTime = new Date(b.updated_at).getTime();
            return bTime - aTime;
        })
            .slice(0, 10)
            .map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            updated_at: new Date(task.updated_at),
        }));
    }
}
exports.TaskService = TaskService;
// Create singleton instance
exports.taskService = new TaskService();
// Legacy functions for backward compatibility
async function getTasks(filters) {
    const result = await exports.taskService.getTasks(filters);
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get tasks');
    }
    return result.data.tasks;
}
async function getTask(taskId) {
    const result = await exports.taskService.getTask(taskId);
    if (!result.success) {
        throw new Error(result.error || 'Failed to get task');
    }
    return result.data || null;
}
async function createTask(taskData) {
    const result = await exports.taskService.createTask(taskData);
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create task');
    }
    return result.data;
}
async function updateTask(taskId, taskData) {
    const result = await exports.taskService.updateTask(taskId, taskData);
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update task');
    }
    return result.data;
}
async function deleteTask(taskId) {
    const result = await exports.taskService.deleteTask(taskId);
    if (!result.success) {
        throw new Error(result.error || 'Failed to delete task');
    }
    return true;
}
//# sourceMappingURL=task_service.js.map