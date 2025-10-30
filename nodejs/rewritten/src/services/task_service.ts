import { z } from 'zod';
import { TaskModel, Task, TaskCreate, TaskUpdate, TaskCreateSchema, TaskUpdateSchema, taskModel } from '../models/task';

// Service interfaces
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

// Validation schemas for service operations
export const TaskFiltersSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  userId: z.number().int().positive().optional(),
  search: z.string().min(1).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  overdue: z.boolean().optional(),
  page: z.number().int().optional().default(1).transform(val => val < 1 ? 1 : val),
  limit: z.number().int().optional().default(10).transform(val => val < 1 ? 10 : val > 100 ? 100 : val),
  sortBy: z.enum(['title', 'status', 'priority', 'due_date', 'created_at', 'updated_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class TaskService {
  /**
   * Get all tasks with optional filtering and pagination
   */
  async getTasks(filters?: TaskFilters): Promise<TaskServiceResponse<TaskListResponse>> {
    try {
      // Validate filters
      const validatedFilters = TaskFiltersSchema.parse(filters || {});
      
      // Get all tasks from the model
      const tasks = await taskModel.findAll();
      
      // Apply filters
      let filteredTasks = tasks;
      
      // Filter by status
      if (validatedFilters.status) {
        filteredTasks = filteredTasks.filter((task: Task) => task.status === validatedFilters.status);
      }
      
      // Filter by priority
      if (validatedFilters.priority) {
        filteredTasks = filteredTasks.filter((task: Task) => task.priority === validatedFilters.priority);
      }
      
      // Filter by user
      if (validatedFilters.userId) {
        filteredTasks = filteredTasks.filter((task: Task) => task.user_id === validatedFilters.userId);
      }
      
      // Filter by search term
      if (validatedFilters.search) {
        const searchTerm = validatedFilters.search.toLowerCase();
        filteredTasks = filteredTasks.filter((task: Task) => 
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description && task.description.toLowerCase().includes(searchTerm))
        );
      }
      
      // Filter by due date range
      if (validatedFilters.dueDateFrom) {
        const fromDate = new Date(validatedFilters.dueDateFrom);
        filteredTasks = filteredTasks.filter((task: Task) => 
          task.due_date && new Date(task.due_date) >= fromDate
        );
      }
      
      if (validatedFilters.dueDateTo) {
        const toDate = new Date(validatedFilters.dueDateTo);
        filteredTasks = filteredTasks.filter((task: Task) => 
          task.due_date && new Date(task.due_date) <= toDate
        );
      }
      
      // Filter overdue tasks
      if (validatedFilters.overdue) {
        const now = new Date();
        filteredTasks = filteredTasks.filter((task: Task) => 
          task.due_date && 
          new Date(task.due_date) < now && 
          task.status !== 'completed'
        );
      }
      
      // Sort tasks
      filteredTasks.sort((a: Task, b: Task) => {
        const aValue = this.getSortValue(a, validatedFilters.sortBy);
        const bValue = this.getSortValue(b, validatedFilters.sortBy);
        
        if (validatedFilters.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
      
      // Apply pagination
      const startIndex = (validatedFilters.page - 1) * validatedFilters.limit;
      const endIndex = startIndex + validatedFilters.limit;
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
      
      // Calculate statistics
      const now = new Date();
      const overdue = filteredTasks.filter((task: Task) => 
        task.due_date && 
        new Date(task.due_date) < now && 
        task.status !== 'completed'
      ).length;
      
      const completed = filteredTasks.filter((task: Task) => task.status === 'completed').length;
      const pending = filteredTasks.filter((task: Task) => task.status === 'pending').length;
      
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: number): Promise<TaskServiceResponse<Task>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      const task = await taskModel.findById(taskId);
      
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get tasks by user ID
   */
  async getTasksByUser(userId: number): Promise<TaskServiceResponse<Task[]>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      const tasks = await taskModel.findAll();
      const userTasks = tasks.filter((task: Task) => task.user_id === userId);
      
      return {
        success: true,
        data: userTasks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<TaskServiceResponse<Task[]>> {
    try {
      const tasks = await taskModel.findAll();
      const now = new Date();
      
      const overdueTasks = tasks.filter((task: Task) => 
        task.due_date && 
        new Date(task.due_date) < now && 
        task.status !== 'completed'
      );
      
      return {
        success: true,
        data: overdueTasks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: TaskCreate): Promise<TaskServiceResponse<Task>> {
    try {
      // Validate input data
      const validatedData = TaskCreateSchema.parse(taskData);
      
      // Create new task
      const task = new TaskModel();
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
    } catch (error) {
      if (error instanceof z.ZodError) {
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
  async updateTask(taskId: number, taskData: TaskUpdate): Promise<TaskServiceResponse<Task>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      // Validate input data
      const validatedData = TaskUpdateSchema.parse(taskData);
      
      // Check if task exists
      const existingTask = await taskModel.findById(taskId);
      if (!existingTask) {
        return {
          success: false,
          error: 'Task not found',
        };
      }
      
      // Update task
      const task = new TaskModel();
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
    } catch (error) {
      if (error instanceof z.ZodError) {
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
  async deleteTask(taskId: number): Promise<TaskServiceResponse<void>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      // Check if task exists
      const existingTask = await taskModel.findById(taskId);
      if (!existingTask) {
        return {
          success: false,
          error: 'Task not found',
        };
      }
      
      // Delete task
      await taskModel.delete(taskId);
      
      return {
        success: true,
        message: 'Task deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: number): Promise<TaskServiceResponse<Task>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      const task = await taskModel.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      const taskModelInstance = new TaskModel();
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Mark task as in progress
   */
  async startTask(taskId: number): Promise<TaskServiceResponse<Task>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      const task = await taskModel.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      const taskModelInstance = new TaskModel();
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: number): Promise<TaskServiceResponse<Task>> {
    try {
      if (!taskId || taskId <= 0) {
        return {
          success: false,
          error: 'Invalid task ID provided',
        };
      }

      const task = await taskModel.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      const taskModelInstance = new TaskModel();
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<TaskServiceResponse<TaskStats>> {
    try {
      const tasks = await taskModel.findAll();
      const now = new Date();
      
      const stats = {
        total: tasks.length,
        pending: tasks.filter((task: Task) => task.status === 'pending').length,
        in_progress: tasks.filter((task: Task) => task.status === 'in_progress').length,
        completed: tasks.filter((task: Task) => task.status === 'completed').length,
        cancelled: tasks.filter((task: Task) => task.status === 'cancelled').length,
        overdue: tasks.filter((task: Task) => 
          task.due_date && 
          new Date(task.due_date) < now && 
          task.status !== 'completed'
        ).length,
        byPriority: {
          low: tasks.filter((task: Task) => task.priority === 'low').length,
          medium: tasks.filter((task: Task) => task.priority === 'medium').length,
          high: tasks.filter((task: Task) => task.priority === 'high').length,
          urgent: tasks.filter((task: Task) => task.priority === 'urgent').length,
        },
        byUser: this.getTasksByUserStats(tasks),
        recentActivity: this.getRecentActivity(tasks),
      };
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(): Promise<TaskServiceResponse<Task[]>> {
    try {
      const tasks = await taskModel.findAll();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const tasksDueToday = tasks.filter((task: Task) => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= today && dueDate < tomorrow && task.status !== 'completed';
      });
      
      return {
        success: true,
        data: tasksDueToday,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get tasks due this week
   */
  async getTasksDueThisWeek(): Promise<TaskServiceResponse<Task[]>> {
    try {
      const tasks = await taskModel.findAll();
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const tasksDueThisWeek = tasks.filter((task: Task) => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= startOfWeek && dueDate < endOfWeek && task.status !== 'completed';
      });
      
      return {
        success: true,
        data: tasksDueThisWeek,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper method to get sort value for a task
   */
  private getSortValue(task: Task, sortBy: string): any {
    switch (sortBy) {
      case 'title':
        return task.title;
      case 'status':
        return task.status;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[task.priority as keyof typeof priorityOrder] || 0;
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
  private getTasksByUserStats(tasks: Task[]): Array<{ user_id: number; username: string; task_count: number }> {
    const userStats = new Map<number, { username: string; task_count: number }>();
    
    tasks.forEach((task: Task) => {
      if (task.user_id) {
        if (!userStats.has(task.user_id)) {
          userStats.set(task.user_id, { username: `User ${task.user_id}`, task_count: 0 });
        }
        const stats = userStats.get(task.user_id)!;
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
  private getRecentActivity(tasks: Task[]): Array<{ id: number; title: string; status: string; updated_at: Date }> {
    return tasks
      .filter((task: Task) => task.updated_at)
      .sort((a: Task, b: Task) => {
        const aTime = new Date(a.updated_at!).getTime();
        const bTime = new Date(b.updated_at!).getTime();
        return bTime - aTime;
      })
      .slice(0, 10)
      .map((task: Task) => ({
        id: task.id!,
        title: task.title,
        status: task.status,
        updated_at: new Date(task.updated_at!),
      }));
  }
}

// Create singleton instance
export const taskService = new TaskService();

// Legacy functions for backward compatibility
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const result = await taskService.getTasks(filters);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get tasks');
  }
  return result.data.tasks;
}

export async function getTask(taskId: number): Promise<Task | null> {
  const result = await taskService.getTask(taskId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to get task');
  }
  return result.data || null;
}

export async function createTask(taskData: TaskCreate): Promise<Task> {
  const result = await taskService.createTask(taskData);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create task');
  }
  return result.data;
}

export async function updateTask(taskId: number, taskData: TaskUpdate): Promise<Task> {
  const result = await taskService.updateTask(taskId, taskData);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update task');
  }
  return result.data;
}

export async function deleteTask(taskId: number): Promise<boolean> {
  const result = await taskService.deleteTask(taskId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete task');
  }
  return true;
}
