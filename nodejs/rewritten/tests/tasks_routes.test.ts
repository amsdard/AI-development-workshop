import request from 'supertest';
import express from 'express';
import tasksRouter from '../src/routes/tasks';

const app = express();
app.use(express.json());
app.use('/api', tasksRouter);

describe('Tasks Routes', () => {
  describe('GET /api/tasks', () => {
    it('should return all tasks successfully', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.page).toBe('number');
      expect(typeof response.body.data.limit).toBe('number');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter tasks by user ID', async () => {
      const response = await request(app)
        .get('/api/tasks?user_id=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter tasks by search term', async () => {
      const response = await request(app)
        .get('/api/tasks?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter overdue tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?overdue=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });

    it('should handle sorting', async () => {
      const response = await request(app)
        .get('/api/tasks?sortBy=title&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/tasks?page=invalid&limit=abc')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by ID successfully', async () => {
      // First get all tasks to find a valid ID
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .expect(200);

      if (tasksResponse.body.data.tasks.length > 0) {
        const taskId = tasksResponse.body.data.tasks[0].id;
        
        const response = await request(app)
          .get(`/api/tasks/${taskId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(taskId);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid task ID');
    });

    it('should return 400 for negative task ID', async () => {
      const response = await request(app)
        .get('/api/tasks/-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid task ID');
    });
  });

  describe('GET /api/tasks/user/:userId', () => {
    it('should return tasks by user ID successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/user/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/tasks/user/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });

    it('should return 400 for negative user ID', async () => {
      const response = await request(app)
        .get('/api/tasks/user/-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('GET /api/tasks/overdue', () => {
    it('should return overdue tasks successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/overdue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/tasks/due-today', () => {
    it('should return tasks due today successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/due-today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/tasks/due-this-week', () => {
    it('should return tasks due this week successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/due-this-week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        due_date: '2024-12-31T23:59:59Z',
        priority: 'high',
        status: 'pending',
        user_id: 1,
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.message).toBe('Task created successfully');

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/tasks/${response.body.data.id}`)
          .expect(200);
      }
    });

    it('should create task with minimal data', async () => {
      const taskData = {
        title: 'Minimal Task',
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(taskData.title);

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/tasks/${response.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 400 for invalid task data', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        priority: 'invalid', // Invalid: not in enum
        status: 'invalid', // Invalid: not in enum
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for invalid due date format', async () => {
      const invalidData = {
        title: 'Test Task',
        due_date: 'invalid-date',
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Update Task',
        description: 'Original description',
        priority: 'low',
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        // Update the task
        const updateData = {
          title: 'Updated Task',
          description: 'Updated description',
          priority: 'high',
        };

        const response = await request(app)
          .put(`/api/tasks/${createResponse.body.data.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Task');
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.priority).toBe('high');
        expect(response.body.message).toBe('Task updated successfully');

        // Clean up
        await request(app)
          .delete(`/api/tasks/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/99999')
        .send({ title: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app)
        .put('/api/tasks/invalid')
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid task ID');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/api/tasks/1')
        .send({ priority: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Delete Task',
        description: 'Task to be deleted',
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .delete(`/api/tasks/${createResponse.body.data.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Task deleted successfully');

        // Verify task is deleted
        await request(app)
          .get(`/api/tasks/${createResponse.body.data.id}`)
          .expect(404);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app)
        .delete('/api/tasks/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid task ID');
    });
  });

  describe('POST /api/tasks/:id/complete', () => {
    it('should complete task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Complete Task',
        status: 'pending',
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .post(`/api/tasks/${createResponse.body.data.id}/complete`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.message).toBe('Task completed successfully');

        // Clean up
        await request(app)
          .delete(`/api/tasks/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/complete')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('POST /api/tasks/:id/start', () => {
    it('should start task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Start Task',
        status: 'pending',
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .post(`/api/tasks/${createResponse.body.data.id}/start`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('in_progress');
        expect(response.body.message).toBe('Task started successfully');

        // Clean up
        await request(app)
          .delete(`/api/tasks/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/start')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('POST /api/tasks/:id/cancel', () => {
    it('should cancel task successfully', async () => {
      // First create a task
      const createData = {
        title: 'Cancel Task',
        status: 'pending',
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .post(`/api/tasks/${createResponse.body.data.id}/cancel`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('cancelled');
        expect(response.body.message).toBe('Task cancelled successfully');

        // Clean up
        await request(app)
          .delete(`/api/tasks/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/cancel')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.pending).toBe('number');
      expect(typeof response.body.data.inProgress).toBe('number');
      expect(typeof response.body.data.completed).toBe('number');
      expect(typeof response.body.data.cancelled).toBe('number');
      expect(typeof response.body.data.overdue).toBe('number');
    });
  });

  describe('GET /api/tasks/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/tasks/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tasks API is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle malformed JSON before our middleware
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'test', description: 'test description' })
        .expect(201);

      // Express should still parse JSON even without explicit Content-Type
      expect(response.body.success).toBe(true);

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/tasks/${response.body.data.id}`)
          .expect(200);
      }
    });
  });
});
