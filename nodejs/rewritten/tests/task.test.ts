import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TaskModel, createTask, TaskCreateSchema, TaskUpdateSchema, TaskFiltersSchema } from '../src/models/task';
import { TaskCreate, TaskStatus, TaskPriority } from '../src/models/task';
import fs from 'fs';

describe('TaskModel', () => {
  let taskModel: TaskModel;
  const testDbPath = 'test_taskflow_tasks.db';

  beforeEach(() => {
    // Create a fresh database for each test
    taskModel = new TaskModel(testDbPath);
  });

  afterEach(() => {
    // Clean up test database
    taskModel.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Task Creation and Validation', () => {
    it('should create a task with valid data', () => {
      const taskData: TaskCreate = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        user_id: 1
      };

      const task = createTask(taskData);
      
      expect(task.id).toBeNull();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('medium');
      expect(task.user_id).toBe(1);
      expect(task.created_at).toBeInstanceOf(Date);
    });

    it('should validate task creation data with Zod', () => {
      const validData = {
        title: 'Valid Task',
        description: 'Valid Description',
        status: 'in_progress' as TaskStatus,
        priority: 'high' as TaskPriority
      };

      expect(() => TaskCreateSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty title in task creation', () => {
      const invalidData = {
        title: '',
        description: 'Test Description'
      };

      expect(() => TaskCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject title longer than 200 characters', () => {
      const invalidData = {
        title: 'a'.repeat(201),
        description: 'Test Description'
      };

      expect(() => TaskCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid status in task creation', () => {
      const invalidData = {
        title: 'Test Task',
        status: 'invalid_status'
      };

      expect(() => TaskCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid priority in task creation', () => {
      const invalidData = {
        title: 'Test Task',
        priority: 'invalid_priority'
      };

      expect(() => TaskCreateSchema.parse(invalidData)).toThrow();
    });

    it('should validate task update data with Zod', () => {
      const validUpdate = {
        title: 'Updated Task',
        status: 'completed' as TaskStatus
      };

      expect(() => TaskUpdateSchema.parse(validUpdate)).not.toThrow();
    });

    it('should validate task filters with Zod', () => {
      const validFilters = {
        user_id: 1,
        status: 'pending' as TaskStatus,
        priority: 'high' as TaskPriority,
        limit: 10,
        offset: 0
      };

      expect(() => TaskFiltersSchema.parse(validFilters)).not.toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should save a new task to database', async () => {
      const task = createTask({
        title: 'New Task',
        description: 'New Description',
        user_id: 1
      });

      const savedTask = await taskModel.save(task);

      expect(savedTask.id).not.toBeNull();
      expect(savedTask.id).toBeGreaterThan(0);
      expect(savedTask.title).toBe('New Task');
      expect(savedTask.description).toBe('New Description');
    });

    it('should find task by ID', async () => {
      const task = createTask({
        title: 'Find Task',
        description: 'Find Description',
        user_id: 1
      });

      const savedTask = await taskModel.save(task);
      const foundTask = await taskModel.findById(savedTask.id!);

      expect(foundTask).not.toBeNull();
      expect(foundTask!.id).toBe(savedTask.id);
      expect(foundTask!.title).toBe('Find Task');
    });

    it('should find all tasks', async () => {
      const task1 = createTask({
        title: 'Task 1',
        description: 'Description 1',
        user_id: 1
      });

      const task2 = createTask({
        title: 'Task 2',
        description: 'Description 2',
        user_id: 2
      });

      await taskModel.save(task1);
      await taskModel.save(task2);

      const allTasks = await taskModel.findAll();
      expect(allTasks).toHaveLength(2);
    });

    it('should find tasks by user ID', async () => {
      const task1 = createTask({
        title: 'User 1 Task',
        user_id: 1
      });

      const task2 = createTask({
        title: 'User 2 Task',
        user_id: 2
      });

      await taskModel.save(task1);
      await taskModel.save(task2);

      const user1Tasks = await taskModel.findByUserId(1);
      expect(user1Tasks).toHaveLength(1);
      expect(user1Tasks[0]?.title).toBe('User 1 Task');
    });

    it('should find tasks by status', async () => {
      const task1 = createTask({
        title: 'Pending Task',
        status: 'pending',
        user_id: 1
      });

      const task2 = createTask({
        title: 'Completed Task',
        status: 'completed',
        user_id: 1
      });

      await taskModel.save(task1);
      await taskModel.save(task2);

      const pendingTasks = await taskModel.findByStatus('pending');
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0]?.title).toBe('Pending Task');
    });

    it('should find tasks by priority', async () => {
      const task1 = createTask({
        title: 'High Priority Task',
        priority: 'high',
        user_id: 1
      });

      const task2 = createTask({
        title: 'Low Priority Task',
        priority: 'low',
        user_id: 1
      });

      await taskModel.save(task1);
      await taskModel.save(task2);

      const highPriorityTasks = await taskModel.findByPriority('high');
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0]?.title).toBe('High Priority Task');
    });

    it('should update existing task', async () => {
      const task = createTask({
        title: 'Original Task',
        description: 'Original Description',
        user_id: 1
      });

      const savedTask = await taskModel.save(task);
      savedTask.title = 'Updated Task';
      savedTask.description = 'Updated Description';
      savedTask.status = 'completed';

      const updatedTask = await taskModel.save(savedTask);

      expect(updatedTask.title).toBe('Updated Task');
      expect(updatedTask.description).toBe('Updated Description');
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.id).toBe(savedTask.id);
    });

    it('should soft delete task', async () => {
      const task = createTask({
        title: 'Delete Task',
        user_id: 1
      });

      const savedTask = await taskModel.save(task);
      const deleted = await taskModel.delete(savedTask.id!);

      expect(deleted).toBe(true);

      const foundTask = await taskModel.findById(savedTask.id!);
      expect(foundTask).toBeNull();
    });

    it('should return null for non-existent task', async () => {
      const foundTask = await taskModel.findById(99999);
      expect(foundTask).toBeNull();
    });
  });

  describe('Overdue Tasks', () => {
    it('should find overdue tasks', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      const task = createTask({
        title: 'Overdue Task',
        due_date: pastDate,
        status: 'pending',
        user_id: 1
      });

      await taskModel.save(task);

      const overdueTasks = await taskModel.findOverdue();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0]?.title).toBe('Overdue Task');
    });

    it('should find tasks overdue by specific days', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const task = createTask({
        title: 'Very Overdue Task',
        due_date: pastDate,
        status: 'pending',
        user_id: 1
      });

      await taskModel.save(task);

      const overdueTasks = await taskModel.findOverdue(5); // 5+ days overdue
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0]?.title).toBe('Very Overdue Task');
    });

    it('should not include completed tasks in overdue results', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const task = createTask({
        title: 'Completed Overdue Task',
        due_date: pastDate,
        status: 'completed',
        user_id: 1
      });

      await taskModel.save(task);

      const overdueTasks = await taskModel.findOverdue();
      expect(overdueTasks).toHaveLength(0);
    });

    it('should calculate days overdue correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const task = createTask({
        title: 'Overdue Task',
        due_date: pastDate,
        status: 'pending',
        user_id: 1
      });

      await taskModel.save(task);

      const overdueTasks = await taskModel.findOverdue();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0]).toHaveProperty('days_overdue');
      expect((overdueTasks[0] as any).days_overdue).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        createTask({ title: 'Task 1', status: 'pending', priority: 'high', user_id: 1 }),
        createTask({ title: 'Task 2', status: 'completed', priority: 'medium', user_id: 1 }),
        createTask({ title: 'Task 3', status: 'pending', priority: 'low', user_id: 2 }),
        createTask({ title: 'Task 4', status: 'in_progress', priority: 'high', user_id: 2 }),
      ];

      for (const task of tasks) {
        await taskModel.save(task);
      }
    });

    it('should filter tasks by multiple criteria', async () => {
      const tasks = await taskModel.findAll({
        user_id: 1,
        status: 'pending',
        priority: 'high'
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.title).toBe('Task 1');
    });

    it('should paginate results', async () => {
      const tasks = await taskModel.findAll({
        limit: 2,
        offset: 1
      });

      expect(tasks).toHaveLength(2);
    });

    it('should count tasks with filters', async () => {
      const count = await taskModel.count({
        user_id: 1,
        status: 'pending'
      });

      expect(count).toBe(1);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in findById', async () => {
      const maliciousId = "1; DROP TABLE tasks; --";
      
      // Should not execute malicious SQL
      await expect(taskModel.findById(parseInt(maliciousId) || 0)).resolves.toBeNull();
      
      // Verify table still exists
      const tasks = await taskModel.findAll();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should prevent SQL injection in findAll filters', async () => {
      const maliciousFilters = {
        user_id: 1,
        status: "'; DROP TABLE tasks; --" as any
      };
      
      // Should not execute malicious SQL
      await expect(taskModel.findAll(maliciousFilters)).rejects.toThrow();
      
      // Verify table still exists
      const tasks = await taskModel.findAll();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should prevent SQL injection in findByUserId', async () => {
      const maliciousUserId = "1; DROP TABLE tasks; --";
      
      // Should not execute malicious SQL
      await expect(taskModel.findByUserId(parseInt(maliciousUserId) || 0)).resolves.toEqual([]);
      
      // Verify table still exists
      const tasks = await taskModel.findAll();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to simulate an error
      taskModel.close();
      
      const task = createTask({
        title: 'Error Task',
        user_id: 1
      });

      await expect(taskModel.save(task)).rejects.toThrow();
    });

    it('should handle invalid task data', async () => {
      const invalidTask = {
        id: null,
        title: '', // Invalid: empty title
        description: '',
        status: 'invalid_status' as any,
        priority: 'medium' as TaskPriority,
        due_date: null,
        user_id: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      };

      await expect(taskModel.save(invalidTask as any)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity across operations', async () => {
      const task = createTask({
        title: 'Integrity Task',
        description: 'Integrity Description',
        status: 'pending',
        priority: 'high',
        user_id: 1
      });

      const savedTask = await taskModel.save(task);
      
      // Verify all fields are preserved
      expect(savedTask.title).toBe('Integrity Task');
      expect(savedTask.description).toBe('Integrity Description');
      expect(savedTask.status).toBe('pending');
      expect(savedTask.priority).toBe('high');
      expect(savedTask.user_id).toBe(1);
      expect(savedTask.created_at).toBeInstanceOf(Date);
      expect(savedTask.updated_at).toBeInstanceOf(Date);
    });

    it('should handle null values correctly', async () => {
      const task = createTask({
        title: 'Null Test Task',
        due_date: null,
        user_id: null
      });

      const savedTask = await taskModel.save(task);
      
      expect(savedTask.description).toBe('');
      expect(savedTask.due_date).toBeNull();
      expect(savedTask.user_id).toBeNull();
    });

    it('should convert dates correctly', async () => {
      const dueDate = new Date('2024-12-31T23:59:59Z');
      const task = createTask({
        title: 'Date Test Task',
        due_date: dueDate,
        user_id: 1
      });

      const savedTask = await taskModel.save(task);
      
      expect(savedTask.due_date).toBeInstanceOf(Date);
      expect(savedTask.due_date!.getTime()).toBe(dueDate.getTime());
    });
  });

  describe('Utility Functions', () => {
    it('should create safe object without deleted_at', () => {
      const task = createTask({
        title: 'Safe Object Test',
        user_id: 1
      });

      task.deleted_at = new Date();
      const safeTask = TaskModel.toSafeObject(task);

      expect(safeTask).not.toHaveProperty('deleted_at');
      expect(safeTask.title).toBe('Safe Object Test');
    });
  });
});
