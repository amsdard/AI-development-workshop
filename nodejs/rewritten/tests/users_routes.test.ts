import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';

const app = express();
app.use(express.json());
app.use('/api', usersRouter);

describe('Users Routes', () => {
  describe('GET /api/users', () => {
    it('should return all users successfully', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.page).toBe('number');
      expect(typeof response.body.data.limit).toBe('number');
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/users?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/users?search=john')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });

    it('should handle sorting', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=username&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=invalid&limit=abc')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by ID successfully', async () => {
      // First get all users to find a valid ID
      const usersResponse = await request(app)
        .get('/api/users')
        .expect(200);

      if (usersResponse.body.data.users.length > 0) {
        const userId = usersResponse.body.data.users[0].id;
        
        const response = await request(app)
          .get(`/api/users/${userId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(userId);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });

    it('should return 400 for negative user ID', async () => {
      const response = await request(app)
        .get('/api/users/-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('GET /api/users/username/:username', () => {
    it('should return user by username successfully', async () => {
      // First get all users to find a valid username
      const usersResponse = await request(app)
        .get('/api/users')
        .expect(200);

      if (usersResponse.body.data.users.length > 0) {
        const username = usersResponse.body.data.users[0].username;
        
        const response = await request(app)
          .get(`/api/users/username/${username}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.username).toBe(username);
      }
    });

    it('should return 404 for non-existent username', async () => {
      const response = await request(app)
        .get('/api/users/username/nonexistentuser')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for empty username', async () => {
      await request(app)
        .get('/api/users/username/')
        .expect(404); // Express treats this as a different route

      // Test with empty string in path
      const response2 = await request(app)
        .get('/api/users/username/%20')
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toBe('Username is required');
    });
  });

  describe('GET /api/users/email/:email', () => {
    it('should return user by email successfully', async () => {
      // First get all users to find a valid email
      const usersResponse = await request(app)
        .get('/api/users')
        .expect(200);

      if (usersResponse.body.data.users.length > 0) {
        const email = usersResponse.body.data.users[0].email;
        
        const response = await request(app)
          .get(`/api/users/email/${email}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.email).toBe(email);
      }
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get('/api/users/email/nonexistent@example.com')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for empty email', async () => {
      await request(app)
        .get('/api/users/email/')
        .expect(404); // Express treats this as a different route

      // Test with empty string in path
      const response2 = await request(app)
        .get('/api/users/email/%20')
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toBe('Email is required');
    });
  });

  describe('POST /api/users', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        first_name: 'Test',
        last_name: 'User',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.message).toBe('User created successfully');

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/users/${response.body.data.id}`)
          .expect(200);
      }
    });

    it('should create user with minimal data', async () => {
      const userData = {
        username: 'minimaluser',
        email: 'minimal@example.com',
        password: 'testpassword123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/users/${response.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 400 for invalid user data', async () => {
      const invalidData = {
        username: '', // Invalid: empty username
        email: 'invalid-email', // Invalid: malformed email
        password: '123', // Invalid: too short password
      };

      const response = await request(app)
        .post('/api/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 409 for duplicate username', async () => {
      // First create a user
      const userData = {
        username: 'duplicateuser',
        email: 'duplicate@example.com',
        password: 'testpassword123',
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Try to create another user with same username
      const duplicateData = {
        username: 'duplicateuser',
        email: 'different@example.com',
        password: 'testpassword123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username already exists');

      // Clean up
      if (createResponse.body.data.id) {
        await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 409 for duplicate email', async () => {
      // First create a user
      const userData = {
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'testpassword123',
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Try to create another user with same email
      const duplicateData = {
        username: 'differentuser',
        email: 'unique@example.com',
        password: 'testpassword123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email already exists');

      // Clean up
      if (createResponse.body.data.id) {
        await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);
      }
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user successfully', async () => {
      // First create a user
      const createData = {
        username: 'updateuser',
        email: 'update@example.com',
        password: 'testpassword123',
        first_name: 'Update',
        last_name: 'User',
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        // Update the user
        const updateData = {
          first_name: 'Updated',
          last_name: 'Name',
        };

        const response = await request(app)
          .put(`/api/users/${createResponse.body.data.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.first_name).toBe('Updated');
        expect(response.body.data.last_name).toBe('Name');
        expect(response.body.message).toBe('User updated successfully');

        // Clean up
        await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/99999')
        .send({ first_name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .put('/api/users/invalid')
        .send({ first_name: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/api/users/1')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user successfully', async () => {
      // First create a user
      const createData = {
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'testpassword123',
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User deleted successfully');

        // Verify user is deleted
        await request(app)
          .get(`/api/users/${createResponse.body.data.id}`)
          .expect(404);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .delete('/api/users/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('POST /api/users/:id/activate', () => {
    it('should activate user successfully', async () => {
      // First create an inactive user
      const createData = {
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'testpassword123',
        is_active: false,
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .post(`/api/users/${createResponse.body.data.id}/activate`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.is_active).toBe(true);
        expect(response.body.message).toBe('User activated successfully');

        // Clean up
        await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/99999/activate')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('POST /api/users/:id/deactivate', () => {
    it('should deactivate user successfully', async () => {
      // First create an active user
      const createData = {
        username: 'activeuser',
        email: 'active@example.com',
        password: 'testpassword123',
        is_active: true,
      };

      const createResponse = await request(app)
        .post('/api/users')
        .send(createData)
        .expect(201);

      if (createResponse.body.data.id) {
        const response = await request(app)
          .post(`/api/users/${createResponse.body.data.id}/deactivate`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.is_active).toBe(false);
        expect(response.body.message).toBe('User deactivated successfully');

        // Clean up
        await request(app)
          .delete(`/api/users/${createResponse.body.data.id}`)
          .expect(200);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/99999/deactivate')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.active).toBe('number');
      expect(typeof response.body.data.inactive).toBe('number');
      expect(typeof response.body.data.recentlyCreated).toBe('number');
    });
  });

  describe('GET /api/users/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/users/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users API is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle malformed JSON before our middleware
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'test', email: 'test@example.com', password: 'password123' })
        .expect(201);

      // Express should still parse JSON even without explicit Content-Type
      expect(response.body.success).toBe(true);

      // Clean up
      if (response.body.data.id) {
        await request(app)
          .delete(`/api/users/${response.body.data.id}`)
          .expect(200);
      }
    });
  });
});
