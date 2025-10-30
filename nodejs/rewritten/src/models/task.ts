import Database from 'better-sqlite3';
import { z } from 'zod';

// TypeScript interfaces
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

// Union types for better type safety
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Zod validation schemas
export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  due_date: z.date().nullable().optional(),
  user_id: z.number().int().positive().nullable().optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.date().nullable().optional(),
  user_id: z.number().int().positive().nullable().optional(),
});

export const TaskFiltersSchema = z.object({
  user_id: z.number().int().positive().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

export class TaskModel {
  private db: Database.Database;

  constructor(dbPath: string = 'taskflow.db') {
    this.db = new Database(dbPath);
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        user_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT
      )
    `);
  }

  async save(task: Task): Promise<Task> {
    try {
      // Validate task data before saving
      if (task.id === null) {
        // For new tasks, validate using TaskCreateSchema
        const taskCreateData: TaskCreate = {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          user_id: task.user_id,
        };
        TaskCreateSchema.parse(taskCreateData);
      } else {
        // For existing tasks, validate using TaskUpdateSchema
        const taskUpdateData: TaskUpdate = {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          user_id: task.user_id,
        };
        TaskUpdateSchema.parse(taskUpdateData);
      }

      const now = new Date().toISOString();
      
      if (task.id) {
        // Update existing task
        const stmt = this.db.prepare(`
          UPDATE tasks SET 
            title = ?, description = ?, status = ?, priority = ?, 
            due_date = ?, user_id = ?, updated_at = ?
          WHERE id = ?
        `);
        
        stmt.run(
          task.title,
          task.description,
          task.status,
          task.priority,
          task.due_date?.toISOString() || null,
          task.user_id,
          now,
          task.id
        );
      } else {
        // Insert new task
        const stmt = this.db.prepare(`
          INSERT INTO tasks (title, description, status, priority, due_date, user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          task.title,
          task.description,
          task.status,
          task.priority,
          task.due_date?.toISOString() || null,
          task.user_id,
          now,
          now
        );
        
        task.id = Number(result.lastInsertRowid);
      }

      task.updated_at = new Date(now);
      return task;
    } catch (error) {
      throw new Error(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(taskId: number): Promise<Task | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL');
      const row = stmt.get(taskId) as any;

      if (!row) return null;

      return this.mapRowToTask(row);
    } catch (error) {
      throw new Error(`Failed to find task by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    try {
      const validatedFilters = TaskFiltersSchema.parse(filters);
      
      let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
      const params: (string | number)[] = [];

      if (validatedFilters.user_id) {
        query += ' AND user_id = ?';
        params.push(validatedFilters.user_id);
      }
      
      if (validatedFilters.status) {
        query += ' AND status = ?';
        params.push(validatedFilters.status);
      }
      
      if (validatedFilters.priority) {
        query += ' AND priority = ?';
        params.push(validatedFilters.priority);
      }

      query += ' ORDER BY created_at DESC';
      
      if (validatedFilters.limit) {
        query += ' LIMIT ?';
        params.push(validatedFilters.limit);
      }
      
      if (validatedFilters.offset) {
        query += ' OFFSET ?';
        params.push(validatedFilters.offset);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: number, filters: Omit<TaskFilters, 'user_id'> = {}): Promise<Task[]> {
    return this.findAll({ ...filters, user_id: userId });
  }

  async findByStatus(status: TaskStatus, filters: Omit<TaskFilters, 'status'> = {}): Promise<Task[]> {
    return this.findAll({ ...filters, status });
  }

  async findByPriority(priority: TaskPriority, filters: Omit<TaskFilters, 'priority'> = {}): Promise<Task[]> {
    return this.findAll({ ...filters, priority });
  }


  async delete(taskId: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?');
      const result = stmt.run(new Date().toISOString(), taskId);
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hardDelete(taskId: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = stmt.run(taskId);
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to hard delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async count(filters: TaskFilters = {}): Promise<number> {
    try {
      const validatedFilters = TaskFiltersSchema.parse(filters);
      
      let query = 'SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL';
      const params: (string | number)[] = [];

      if (validatedFilters.user_id) {
        query += ' AND user_id = ?';
        params.push(validatedFilters.user_id);
      }
      
      if (validatedFilters.status) {
        query += ' AND status = ?';
        params.push(validatedFilters.status);
      }
      
      if (validatedFilters.priority) {
        query += ' AND priority = ?';
        params.push(validatedFilters.priority);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      
      return result.count;
    } catch (error) {
      throw new Error(`Failed to count tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      due_date: row.due_date ? new Date(row.due_date) : null,
      user_id: row.user_id,
      created_at: row.created_at ? new Date(row.created_at) : null,
      updated_at: row.updated_at ? new Date(row.updated_at) : null,
      deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  // Convert task to safe object for API responses
  static toSafeObject(task: Task): Omit<Task, 'deleted_at'> {
    const { deleted_at, ...safeTask } = task;
    return safeTask;
  }

  /**
   * Find overdue tasks with pagination and days filtering
   */
  async findOverdue(days: number = 0, limit: number = 10, offset: number = 0): Promise<Task[]> {
    try {
      const now = new Date();
      let cutoffDate: Date;

      if (days > 0) {
        // If days specified: due_date < now() - days
        cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      } else {
        // If days = 0: due_date < now()
        cutoffDate = now;
      }

      const query = `
        SELECT * FROM tasks 
        WHERE deleted_at IS NULL 
          AND status != 'completed'
          AND due_date IS NOT NULL
          AND due_date < ?
        ORDER BY due_date ASC
        LIMIT ? OFFSET ?
      `;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(cutoffDate.toISOString(), limit, offset) as any[];

      return rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      throw new Error(`Failed to find overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total overdue tasks for pagination
   */
  async countOverdue(days: number = 0): Promise<number> {
    try {
      const now = new Date();
      let cutoffDate: Date;

      if (days > 0) {
        // If days specified: due_date < now() - days
        cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      } else {
        // If days = 0: due_date < now()
        cutoffDate = now;
      }

      const query = `
        SELECT COUNT(*) as total FROM tasks 
        WHERE deleted_at IS NULL 
          AND status != 'completed'
          AND due_date IS NOT NULL
          AND due_date < ?
      `;

      const stmt = this.db.prepare(query);
      const result = stmt.get(cutoffDate.toISOString()) as { total: number };
      
      return result.total;
    } catch (error) {
      throw new Error(`Failed to count overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate days overdue for a task
   */
  static calculateDaysOverdue(dueDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - new Date(dueDate).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Ensure non-negative
  }

  close(): void {
    this.db.close();
  }
}

// Factory function for creating tasks
export function createTask(taskData: TaskCreate): Task {
  const validatedData = TaskCreateSchema.parse(taskData);
  
  return {
    id: null,
    title: validatedData.title,
    description: validatedData.description || '',
    status: validatedData.status,
    priority: validatedData.priority,
    due_date: validatedData.due_date || null,
    user_id: validatedData.user_id || null,
    created_at: new Date(),
    updated_at: null,
    deleted_at: null,
  };
}

// Default instance for backward compatibility
export const taskModel = new TaskModel();
