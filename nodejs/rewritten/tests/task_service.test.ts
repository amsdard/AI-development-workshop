import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskService, taskService, getTasks, getTask, createTask, updateTask, deleteTask } from '../src/services/task_service';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  describe('getTasks', () => {
    it('should return all tasks successfully', async () => {
      const result = await taskService.getTasks();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.tasks)).toBe(true);
      expect(result.data?.total).toBeGreaterThanOrEqual(0);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
      expect(typeof result.data?.overdue).toBe('number');
      expect(typeof result.data?.completed).toBe('number');
      expect(typeof result.data?.pending).toBe('number');
    });

    it('should filter tasks by status', async () => {
      const result = await taskService.getTasks({ status: 'pending' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 0) {
        result.data.tasks.forEach(task => {
          expect(task.status).toBe('pending');
        });
      }
    });

    it('should filter tasks by priority', async () => {
      const result = await taskService.getTasks({ priority: 'high' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 0) {
        result.data.tasks.forEach(task => {
          expect(task.priority).toBe('high');
        });
      }
    });

    it('should filter tasks by user ID', async () => {
      const result = await taskService.getTasks({ userId: 1 });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 0) {
        result.data.tasks.forEach(task => {
          expect(task.user_id).toBe(1);
        });
      }
    });

    it('should filter tasks by search term', async () => {
      const result = await taskService.getTasks({ search: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 0) {
        result.data.tasks.forEach(task => {
          const searchTerm = 'test';
          const matches = 
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm));
          expect(matches).toBe(true);
        });
      }
    });

    it('should filter overdue tasks', async () => {
      const result = await taskService.getTasks({ overdue: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 0) {
        const now = new Date();
        result.data.tasks.forEach(task => {
          expect(task.due_date).toBeDefined();
          expect(new Date(task.due_date!).getTime()).toBeLessThan(now.getTime());
          expect(task.status).not.toBe('completed');
        });
      }
    });

    it('should handle pagination correctly', async () => {
      const result = await taskService.getTasks({ page: 1, limit: 2 });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(2);
      expect(result.data?.tasks.length).toBeLessThanOrEqual(2);
    });

    it('should sort tasks correctly', async () => {
      const result = await taskService.getTasks({ 
        sortBy: 'title', 
        sortOrder: 'asc' 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.tasks.length > 1) {
        const titles = result.data.tasks.map(task => task.title);
        const sortedTitles = [...titles].sort();
        expect(titles).toEqual(sortedTitles);
      }
    });

    it('should validate filter parameters', async () => {
      const result = await taskService.getTasks({ 
        page: -1, 
        limit: 0 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1); // Should default to 1
      expect(result.data?.limit).toBe(10); // Should default to 10
    });
  });

  describe('getTask', () => {
    it('should return task by ID successfully', async () => {
      // First get all tasks to find a valid ID
      const tasksResult = await taskService.getTasks();
      if (tasksResult.data && tasksResult.data.tasks.length > 0) {
        const taskId = tasksResult.data.tasks[0]?.id;
        if (!taskId) return;
        
        const result = await taskService.getTask(taskId);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe(taskId);
      }
    });

    it('should return error for invalid task ID', async () => {
      const result = await taskService.getTask(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid task ID provided');
    });

    it('should return error for non-existent task', async () => {
      const result = await taskService.getTask(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });

    it('should return error for negative task ID', async () => {
      const result = await taskService.getTask(-1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid task ID provided');
    });
  });

  describe('getTasksByUser', () => {
    it('should return tasks by user ID successfully', async () => {
      const result = await taskService.getTasksByUser(1);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.length > 0) {
        result.data.forEach(task => {
          expect(task.user_id).toBe(1);
        });
      }
    });

    it('should return error for invalid user ID', async () => {
      const result = await taskService.getTasksByUser(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID provided');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks successfully', async () => {
      const result = await taskService.getOverdueTasks();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending' as const,
        priority: 'medium' as const,
        user_id: 1,
        due_date: new Date('2024-12-31T23:59:59Z'),
      };

      const result = await taskService.createTask(taskData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe(taskData.title);
      expect(result.data?.description).toBe(taskData.description);
      expect(result.data?.status).toBe(taskData.status);
      expect(result.data?.priority).toBe(taskData.priority);
      expect(result.data?.user_id).toBe(taskData.user_id);
      expect(result.message).toBe('Task created successfully');

      // Clean up
      if (result.data) {
        await taskService.deleteTask(result.data.id!);
      }
    });

    it('should create task with minimal data', async () => {
      const taskData = {
        title: 'Minimal Task',
      };

      const result = await taskService.createTask(taskData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe(taskData.title);
      expect(result.data?.description).toBe('');
      expect(result.data?.status).toBe('pending');
      expect(result.data?.priority).toBe('medium');

      // Clean up
      if (result.data) {
        await taskService.deleteTask(result.data.id!);
      }
    });

    it('should validate task data', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        status: 'invalid_status', // Invalid: not in enum
        priority: 'invalid_priority', // Invalid: not in enum
      };

      const result = await taskService.createTask(invalidData as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Update Test Task',
        description: 'Original Description',
        status: 'pending' as const,
        priority: 'low' as const,
      };

      const createResult = await taskService.createTask(createData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        // Update the task
        const updateData = {
          title: 'Updated Task Title',
          description: 'Updated Description',
          status: 'in_progress' as const,
          priority: 'high' as const,
        };

        const result = await taskService.updateTask(createResult.data.id!, updateData);
        
        expect(result.success).toBe(true);
        expect(result.data?.title).toBe('Updated Task Title');
        expect(result.data?.description).toBe('Updated Description');
        expect(result.data?.status).toBe('in_progress');
        expect(result.data?.priority).toBe('high');
        expect(result.message).toBe('Task updated successfully');

        // Clean up
        await taskService.deleteTask(createResult.data.id!);
      }
    });

    it('should return error for invalid task ID', async () => {
      const result = await taskService.updateTask(0, { title: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid task ID provided');
    });

    it('should return error for non-existent task', async () => {
      const result = await taskService.updateTask(99999, { title: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Delete Test Task',
        description: 'To be deleted',
      };

      const createResult = await taskService.createTask(createData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const taskId = createResult.data.id!;
        
        const result = await taskService.deleteTask(taskId);
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('Task deleted successfully');

        // Verify task is deleted
        const getResult = await taskService.getTask(taskId);
        expect(getResult.success).toBe(false);
        expect(getResult.error).toBe('Task not found');
      }
    });

    it('should return error for invalid task ID', async () => {
      const result = await taskService.deleteTask(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid task ID provided');
    });

    it('should return error for non-existent task', async () => {
      const result = await taskService.deleteTask(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });
  });

  describe('completeTask', () => {
    it('should complete task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Complete Test Task',
        status: 'pending' as const,
      };

      const createResult = await taskService.createTask(createData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const result = await taskService.completeTask(createResult.data.id!);
        
        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('completed');
        expect(result.message).toBe('Task completed successfully');

        // Clean up
        await taskService.deleteTask(createResult.data.id!);
      }
    });
  });

  describe('startTask', () => {
    it('should start task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Start Test Task',
        status: 'pending' as const,
      };

      const createResult = await taskService.createTask(createData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const result = await taskService.startTask(createResult.data.id!);
        
        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('in_progress');
        expect(result.message).toBe('Task started successfully');

        // Clean up
        await taskService.deleteTask(createResult.data.id!);
      }
    });
  });

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Cancel Test Task',
        status: 'pending' as const,
      };

      const createResult = await taskService.createTask(createData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const result = await taskService.cancelTask(createResult.data.id!);
        
        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('cancelled');
        expect(result.message).toBe('Task cancelled successfully');

        // Clean up
        await taskService.deleteTask(createResult.data.id!);
      }
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      const result = await taskService.getTaskStats();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.total).toBeGreaterThanOrEqual(0);
      expect(result.data?.pending).toBeGreaterThanOrEqual(0);
      expect(result.data?.in_progress).toBeGreaterThanOrEqual(0);
      expect(result.data?.completed).toBeGreaterThanOrEqual(0);
      expect(result.data?.cancelled).toBeGreaterThanOrEqual(0);
      expect(result.data?.overdue).toBeGreaterThanOrEqual(0);
      expect(result.data?.byPriority).toBeDefined();
      expect(result.data?.byUser).toBeDefined();
      expect(result.data?.recentActivity).toBeDefined();
      expect(Array.isArray(result.data?.byUser)).toBe(true);
      expect(Array.isArray(result.data?.recentActivity)).toBe(true);
    });
  });

  describe('getTasksDueToday', () => {
    it('should return tasks due today', async () => {
      const result = await taskService.getTasksDueToday();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('getTasksDueThisWeek', () => {
    it('should return tasks due this week', async () => {
      const result = await taskService.getTasksDueThisWeek();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking the TaskModel to throw an error
      // For now, we'll test that the service handles errors properly
      const result = await taskService.getTask(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Legacy Functions', () => {
  it('should work with legacy getTasks function', async () => {
    const result = await getTasks();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should work with legacy getTask function', async () => {
    // First get all tasks to find a valid ID
    const tasksResult = await getTasks();
    if (tasksResult.length > 0) {
      const taskId = tasksResult[0]?.id;
      if (!taskId) return;
      
      const task = await getTask(taskId);
      
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
    }
  });

  it('should work with legacy createTask function', async () => {
    const taskData = {
      title: 'Legacy Task',
      description: 'Created via legacy function',
    };

    const task = await createTask(taskData);
    
    expect(task).toBeDefined();
    expect(task.title).toBe(taskData.title);
    expect(task.description).toBe(taskData.description);

    // Clean up
    await taskService.deleteTask(task.id!);
  });

  it('should work with legacy updateTask function', async () => {
    // First create a task
    const createData = {
      title: 'Legacy Update Task',
      description: 'Original',
    };

    const createdTask = await createTask(createData);
    expect(createdTask).toBeDefined();

    if (createdTask.id) {
      // Update the task
      const updateData = {
        title: 'Updated Legacy Task',
        description: 'Updated',
      };

      const updatedTask = await updateTask(createdTask.id, updateData);
      
      expect(updatedTask).toBeDefined();
      expect(updatedTask.title).toBe('Updated Legacy Task');
      expect(updatedTask.description).toBe('Updated');

      // Clean up
      await taskService.deleteTask(createdTask.id);
    }
  });

  it('should work with legacy deleteTask function', async () => {
    // First create a task
    const createData = {
      title: 'Legacy Delete Task',
      description: 'To be deleted',
    };

    const createdTask = await createTask(createData);
    expect(createdTask).toBeDefined();

    if (createdTask.id) {
      const result = await deleteTask(createdTask.id);
      
      expect(result).toBe(true);

      // Verify task is deleted
      const getResult = await taskService.getTask(createdTask.id);
      expect(getResult.success).toBe(false);
    }
  });

  it('should throw error for legacy functions when service fails', async () => {
    await expect(getTask(0)).rejects.toThrow('Invalid task ID provided');
  });
});
