"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskModel = exports.TaskModel = exports.TaskFiltersSchema = exports.TaskUpdateSchema = exports.TaskCreateSchema = void 0;
exports.createTask = createTask;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const zod_1 = require("zod");
// Zod validation schemas
exports.TaskCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    due_date: zod_1.z.date().nullable().optional(),
    user_id: zod_1.z.number().int().positive().nullable().optional(),
});
exports.TaskUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: zod_1.z.date().nullable().optional(),
    user_id: zod_1.z.number().int().positive().nullable().optional(),
});
exports.TaskFiltersSchema = zod_1.z.object({
    user_id: zod_1.z.number().int().positive().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    offset: zod_1.z.number().int().min(0).optional().default(0),
});
class TaskModel {
    constructor(dbPath = 'taskflow.db') {
        this.db = new better_sqlite3_1.default(dbPath);
        this.initializeTable();
    }
    initializeTable() {
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
    async save(task) {
        try {
            // Validate task data before saving
            if (task.id === null) {
                // For new tasks, validate using TaskCreateSchema
                const taskCreateData = {
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    due_date: task.due_date,
                    user_id: task.user_id,
                };
                exports.TaskCreateSchema.parse(taskCreateData);
            }
            else {
                // For existing tasks, validate using TaskUpdateSchema
                const taskUpdateData = {
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    due_date: task.due_date,
                    user_id: task.user_id,
                };
                exports.TaskUpdateSchema.parse(taskUpdateData);
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
                stmt.run(task.title, task.description, task.status, task.priority, task.due_date?.toISOString() || null, task.user_id, now, task.id);
            }
            else {
                // Insert new task
                const stmt = this.db.prepare(`
          INSERT INTO tasks (title, description, status, priority, due_date, user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
                const result = stmt.run(task.title, task.description, task.status, task.priority, task.due_date?.toISOString() || null, task.user_id, now, now);
                task.id = Number(result.lastInsertRowid);
            }
            task.updated_at = new Date(now);
            return task;
        }
        catch (error) {
            throw new Error(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findById(taskId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL');
            const row = stmt.get(taskId);
            if (!row)
                return null;
            return this.mapRowToTask(row);
        }
        catch (error) {
            throw new Error(`Failed to find task by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findAll(filters = {}) {
        try {
            const validatedFilters = exports.TaskFiltersSchema.parse(filters);
            let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
            const params = [];
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
            const rows = stmt.all(...params);
            return rows.map(row => this.mapRowToTask(row));
        }
        catch (error) {
            throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async findByUserId(userId, filters = {}) {
        return this.findAll({ ...filters, user_id: userId });
    }
    async findByStatus(status, filters = {}) {
        return this.findAll({ ...filters, status });
    }
    async findByPriority(priority, filters = {}) {
        return this.findAll({ ...filters, priority });
    }
    async delete(taskId) {
        try {
            const stmt = this.db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?');
            const result = stmt.run(new Date().toISOString(), taskId);
            return result.changes > 0;
        }
        catch (error) {
            throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async hardDelete(taskId) {
        try {
            const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
            const result = stmt.run(taskId);
            return result.changes > 0;
        }
        catch (error) {
            throw new Error(`Failed to hard delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async count(filters = {}) {
        try {
            const validatedFilters = exports.TaskFiltersSchema.parse(filters);
            let query = 'SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL';
            const params = [];
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
            const result = stmt.get(...params);
            return result.count;
        }
        catch (error) {
            throw new Error(`Failed to count tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    mapRowToTask(row) {
        return {
            id: row.id,
            title: row.title,
            description: row.description || '',
            status: row.status,
            priority: row.priority,
            due_date: row.due_date ? new Date(row.due_date) : null,
            user_id: row.user_id,
            created_at: row.created_at ? new Date(row.created_at) : null,
            updated_at: row.updated_at ? new Date(row.updated_at) : null,
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
        };
    }
    // Convert task to safe object for API responses
    static toSafeObject(task) {
        const { deleted_at, ...safeTask } = task;
        return safeTask;
    }
    /**
     * Find overdue tasks with pagination and days filtering
     */
    async findOverdue(days = 0, limit = 10, offset = 0) {
        try {
            const now = new Date();
            let cutoffDate;
            if (days > 0) {
                // If days specified: due_date < now() - days
                cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
            }
            else {
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
            const rows = stmt.all(cutoffDate.toISOString(), limit, offset);
            return rows.map(row => this.mapRowToTask(row));
        }
        catch (error) {
            throw new Error(`Failed to find overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Count total overdue tasks for pagination
     */
    async countOverdue(days = 0) {
        try {
            const now = new Date();
            let cutoffDate;
            if (days > 0) {
                // If days specified: due_date < now() - days
                cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
            }
            else {
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
            const result = stmt.get(cutoffDate.toISOString());
            return result.total;
        }
        catch (error) {
            throw new Error(`Failed to count overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Calculate days overdue for a task
     */
    static calculateDaysOverdue(dueDate) {
        const now = new Date();
        const diffTime = now.getTime() - new Date(dueDate).getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays); // Ensure non-negative
    }
    close() {
        this.db.close();
    }
}
exports.TaskModel = TaskModel;
// Factory function for creating tasks
function createTask(taskData) {
    const validatedData = exports.TaskCreateSchema.parse(taskData);
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
exports.taskModel = new TaskModel();
//# sourceMappingURL=task.js.map