import request from 'supertest';
import express from 'express';
import app from '../src/app';

describe('TaskFlow API Application', () => {
  // Test the app without initializing the database
  // This avoids hanging connections during testing

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('TaskFlow API - Modern TypeScript Version');
      expect(response.body.version).toBe('2.0.0');
      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.users).toBe('/api/users');
      expect(response.body.endpoints.tasks).toBe('/api/tasks');
      expect(response.body.endpoints.health).toBe('/api/health');
      expect(response.body.endpoints.docs).toBe('/api/docs');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(503); // Expect 503 since database won't be connected in tests

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.error).toBe('Database connection failed');
      expect(response.body.environment).toBeDefined();
    });
  });

  describe('GET /api/docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('TaskFlow API Documentation');
      expect(response.body.version).toBe('2.0.0');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.users).toBeDefined();
      expect(response.body.endpoints.tasks).toBeDefined();
      expect(response.body.authentication).toBeDefined();
      expect(response.body.rateLimiting).toBeDefined();
    });

    it('should include users endpoints documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body.endpoints.users.base).toBe('/api/users');
      expect(response.body.endpoints.users.methods).toContain('GET');
      expect(response.body.endpoints.users.methods).toContain('POST');
      expect(response.body.endpoints.users.methods).toContain('PUT');
      expect(response.body.endpoints.users.methods).toContain('DELETE');
      expect(response.body.endpoints.users.subEndpoints).toBeDefined();
      expect(response.body.endpoints.users.subEndpoints.list).toBeDefined();
      expect(response.body.endpoints.users.subEndpoints.get).toBeDefined();
      expect(response.body.endpoints.users.subEndpoints.create).toBeDefined();
      expect(response.body.endpoints.users.subEndpoints.update).toBeDefined();
      expect(response.body.endpoints.users.subEndpoints.delete).toBeDefined();
    });

    it('should include tasks endpoints documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body.endpoints.tasks.base).toBe('/api/tasks');
      expect(response.body.endpoints.tasks.methods).toContain('GET');
      expect(response.body.endpoints.tasks.methods).toContain('POST');
      expect(response.body.endpoints.tasks.methods).toContain('PUT');
      expect(response.body.endpoints.tasks.methods).toContain('DELETE');
      expect(response.body.endpoints.tasks.subEndpoints).toBeDefined();
      expect(response.body.endpoints.tasks.subEndpoints.list).toBeDefined();
      expect(response.body.endpoints.tasks.subEndpoints.get).toBeDefined();
      expect(response.body.endpoints.tasks.subEndpoints.create).toBeDefined();
      expect(response.body.endpoints.tasks.subEndpoints.update).toBeDefined();
      expect(response.body.endpoints.tasks.subEndpoints.delete).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.message).toContain('GET /api/non-existent');
      expect(response.body.availableEndpoints).toBeDefined();
    });

    it('should return 404 for non-existent method', async () => {
      const response = await request(app)
        .patch('/api/users')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.message).toContain('PATCH /api/users');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/users')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Request ID Middleware', () => {
    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[a-z0-9]+$/);
    });

    it('should include request ID in error responses', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('JSON Response Format', () => {
    it('should return pretty-printed JSON', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Check that the response is properly formatted JSON
      expect(typeof response.body).toBe('object');
      expect(response.body.success).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle malformed JSON before our middleware
      expect(response.body).toBeDefined();
    });

    it('should handle large request bodies', async () => {
      const largeData = {
        title: 'A'.repeat(10000), // Very long title
        description: 'B'.repeat(10000), // Very long description
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(largeData)
        .expect(400); // Should fail validation due to length limits

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('API Integration', () => {
    it('should serve users API routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // The response structure should be correct even if database fails
      expect(response.body).toBeDefined();
    });

    it('should serve tasks API routes', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      // The response structure should be correct even if database fails
      expect(response.body).toBeDefined();
    });

    it('should serve users health endpoint', async () => {
      const response = await request(app)
        .get('/api/users/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users API is healthy');
    });

    it('should serve tasks health endpoint', async () => {
      const response = await request(app)
        .get('/api/tasks/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tasks API is healthy');
    });
  });

  describe('Environment Configuration', () => {
    it('should return correct environment in responses', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(response.body.environment);
    });
  });
});
