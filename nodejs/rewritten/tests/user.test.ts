import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserModel, createUser, UserCreateSchema } from '../src/models/user';
import { UserCreate } from '../src/models/user';
import fs from 'fs';

describe('UserModel', () => {
  let userModel: UserModel;
  const testDbPath = 'test_taskflow.db';

  beforeEach(() => {
    // Create a fresh database for each test
    userModel = new UserModel(testDbPath);
  });

  afterEach(() => {
    // Clean up test database
    userModel.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('User Creation and Validation', () => {
    it('should create a user with valid data', () => {
      const userData: UserCreate = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      };

      const user = createUser(userData);
      
      expect(user.id).toBeNull();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toContain(':');
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
    });

    it('should validate user creation data with Zod', () => {
      const validData = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'password123'
      };

      expect(() => UserCreateSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email in user creation', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      expect(() => UserCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject short username in user creation', () => {
      const invalidData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123'
      };

      expect(() => UserCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password in user creation', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      expect(() => UserCreateSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should save a new user to database', async () => {
      const user = createUser({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      });

      const savedUser = await userModel.save(user);

      expect(savedUser.id).not.toBeNull();
      expect(savedUser.id).toBeGreaterThan(0);
      expect(savedUser.username).toBe('newuser');
      expect(savedUser.email).toBe('new@example.com');
    });

    it('should find user by ID', async () => {
      const user = createUser({
        username: 'finduser',
        email: 'find@example.com',
        password: 'password123'
      });

      const savedUser = await userModel.save(user);
      const foundUser = await userModel.findById(savedUser.id!);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(savedUser.id);
      expect(foundUser!.username).toBe('finduser');
    });

    it('should find user by username', async () => {
      const user = createUser({
        username: 'usernameuser',
        email: 'username@example.com',
        password: 'password123'
      });

      await userModel.save(user);
      const foundUser = await userModel.findByUsername('usernameuser');

      expect(foundUser).not.toBeNull();
      expect(foundUser!.username).toBe('usernameuser');
    });

    it('should find user by email', async () => {
      const user = createUser({
        username: 'emailuser',
        email: 'email@example.com',
        password: 'password123'
      });

      await userModel.save(user);
      const foundUser = await userModel.findByEmail('email@example.com');

      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe('email@example.com');
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userModel.findById(99999);
      expect(foundUser).toBeNull();
    });

    it('should find all users', async () => {
      const user1 = createUser({
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123'
      });

      const user2 = createUser({
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123'
      });

      await userModel.save(user1);
      await userModel.save(user2);

      const allUsers = await userModel.findAll();
      expect(allUsers).toHaveLength(2);
    });

    it('should update existing user', async () => {
      const user = createUser({
        username: 'updateuser',
        email: 'update@example.com',
        password: 'password123'
      });

      const savedUser = await userModel.save(user);
      savedUser.first_name = 'Updated';
      savedUser.last_name = 'Name';

      const updatedUser = await userModel.save(savedUser);

      expect(updatedUser.first_name).toBe('Updated');
      expect(updatedUser.last_name).toBe('Name');
      expect(updatedUser.id).toBe(savedUser.id);
    });

    it('should delete user', async () => {
      const user = createUser({
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'password123'
      });

      const savedUser = await userModel.save(user);
      const deleted = await userModel.delete(savedUser.id!);

      expect(deleted).toBe(true);

      const foundUser = await userModel.findById(savedUser.id!);
      expect(foundUser).toBeNull();
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', () => {
      const password = 'testpassword123';
      const hash1 = UserModel.setPassword(password);
      const hash2 = UserModel.setPassword(password);

      // Same password should produce different hashes (due to salt)
      expect(hash1).not.toBe(hash2);
      expect(hash1).toContain(':');
      expect(hash2).toContain(':');
    });

    it('should verify correct password', () => {
      const password = 'testpassword123';
      const hash = UserModel.setPassword(password);

      expect(UserModel.checkPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = UserModel.setPassword(password);

      expect(UserModel.checkPassword(wrongPassword, hash)).toBe(false);
    });

    it('should generate unique API keys', () => {
      const key1 = UserModel.generateApiKey();
      const key2 = UserModel.generateApiKey();

      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(20);
      expect(key2.length).toBeGreaterThan(20);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in findById', async () => {
      // This should not cause SQL injection
      const maliciousId = "1; DROP TABLE users; --";
      
      // Should throw an error or return null, not execute malicious SQL
      await expect(userModel.findById(parseInt(maliciousId) || 0)).resolves.toBeNull();
      
      // Verify table still exists
      const users = await userModel.findAll();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should prevent SQL injection in findByUsername', async () => {
      const maliciousUsername = "'; DROP TABLE users; --";
      
      // Should not execute malicious SQL
      await expect(userModel.findByUsername(maliciousUsername)).resolves.toBeNull();
      
      // Verify table still exists
      const users = await userModel.findAll();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should prevent SQL injection in findByEmail', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      
      // Should not execute malicious SQL
      await expect(userModel.findByEmail(maliciousEmail)).resolves.toBeNull();
      
      // Verify table still exists
      const users = await userModel.findAll();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to simulate an error
      userModel.close();
      
      const user = createUser({
        username: 'erroruser',
        email: 'error@example.com',
        password: 'password123'
      });

      await expect(userModel.save(user)).rejects.toThrow();
    });

    it('should handle duplicate username constraint', async () => {
      const user1 = createUser({
        username: 'duplicate',
        email: 'user1@example.com',
        password: 'password123'
      });

      const user2 = createUser({
        username: 'duplicate',
        email: 'user2@example.com',
        password: 'password123'
      });

      await userModel.save(user1);
      
      // Second user with same username should fail
      await expect(userModel.save(user2)).rejects.toThrow();
    });

    it('should handle duplicate email constraint', async () => {
      const user1 = createUser({
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      });

      const user2 = createUser({
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password123'
      });

      await userModel.save(user1);
      
      // Second user with same email should fail
      await expect(userModel.save(user2)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity across operations', async () => {
      const user = createUser({
        username: 'integrityuser',
        email: 'integrity@example.com',
        password: 'password123',
        first_name: 'Integrity',
        last_name: 'Test'
      });

      const savedUser = await userModel.save(user);
      
      // Verify all fields are preserved
      expect(savedUser.username).toBe('integrityuser');
      expect(savedUser.email).toBe('integrity@example.com');
      expect(savedUser.first_name).toBe('Integrity');
      expect(savedUser.last_name).toBe('Test');
      expect(savedUser.is_active).toBe(true);
      expect(savedUser.created_at).toBeInstanceOf(Date);
      expect(savedUser.updated_at).toBeInstanceOf(Date);
    });

    it('should convert boolean values correctly', async () => {
      const user = createUser({
        username: 'booluser',
        email: 'bool@example.com',
        password: 'password123'
      });

      user.is_active = false;
      const savedUser = await userModel.save(user);
      
      const foundUser = await userModel.findById(savedUser.id!);
      expect(foundUser!.is_active).toBe(false);
    });
  });
});
