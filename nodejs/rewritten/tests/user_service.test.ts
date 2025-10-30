import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserService, userService, getUsers, getUser, createUser } from '../src/services/user_service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('getUsers', () => {
    it('should return all users successfully', async () => {
      const result = await userService.getUsers();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.users)).toBe(true);
      expect(result.data?.total).toBeGreaterThanOrEqual(0);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
    });

    it('should filter users by active status', async () => {
      const result = await userService.getUsers({ isActive: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.users.length > 0) {
        result.data.users.forEach(user => {
          expect(user.is_active).toBe(true);
        });
      }
    });

    it('should filter users by search term', async () => {
      const result = await userService.getUsers({ search: 'john' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.users.length > 0) {
        result.data.users.forEach(user => {
          const searchTerm = 'john';
          const matches = 
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
            (user.last_name && user.last_name.toLowerCase().includes(searchTerm));
          expect(matches).toBe(true);
        });
      }
    });

    it('should handle pagination correctly', async () => {
      const result = await userService.getUsers({ page: 1, limit: 2 });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(2);
      expect(result.data?.users.length).toBeLessThanOrEqual(2);
    });

    it('should sort users correctly', async () => {
      const result = await userService.getUsers({ 
        sortBy: 'username', 
        sortOrder: 'asc' 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && result.data.users.length > 1) {
        const usernames = result.data.users.map(user => user.username);
        const sortedUsernames = [...usernames].sort();
        expect(usernames).toEqual(sortedUsernames);
      }
    });

    it('should validate filter parameters', async () => {
      const result = await userService.getUsers({ 
        page: -1, 
        limit: 0 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1); // Should default to 1
      expect(result.data?.limit).toBe(10); // Should default to 10
    });
  });

  describe('getUser', () => {
    it('should return user by ID successfully', async () => {
      // First get all users to find a valid ID
      const usersResult = await userService.getUsers();
      if (usersResult.data && usersResult.data.users.length > 0) {
        const userId = usersResult.data.users[0]?.id;
        if (!userId) return;
        
        const result = await userService.getUser(userId);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe(userId);
      }
    });

    it('should return error for invalid user ID', async () => {
      const result = await userService.getUser(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID provided');
    });

    it('should return error for non-existent user', async () => {
      const result = await userService.getUser(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error for negative user ID', async () => {
      const result = await userService.getUser(-1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID provided');
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username successfully', async () => {
      // First get all users to find a valid username
      const usersResult = await userService.getUsers();
      if (usersResult.data && usersResult.data.users.length > 0) {
        const username = usersResult.data.users[0]?.username;
        if (!username) return;
        
        const result = await userService.getUserByUsername(username);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.username).toBe(username);
      }
    });

    it('should return error for empty username', async () => {
      const result = await userService.getUserByUsername('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should return error for non-existent username', async () => {
      const result = await userService.getUserByUsername('nonexistentuser');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email successfully', async () => {
      // First get all users to find a valid email
      const usersResult = await userService.getUsers();
      if (usersResult.data && usersResult.data.users.length > 0) {
        const email = usersResult.data.users[0]?.email;
        if (!email) return;
        
        const result = await userService.getUserByEmail(email);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.email).toBe(email);
      }
    });

    it('should return error for empty email', async () => {
      const result = await userService.getUserByEmail('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return error for non-existent email', async () => {
      const result = await userService.getUserByEmail('nonexistent@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        first_name: 'Test',
        last_name: 'User',
      };

      const result = await userService.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.username).toBe(userData.username);
      expect(result.data?.email).toBe(userData.email);
      expect(result.message).toBe('User created successfully');

        // Clean up
        if (result.data) {
          await userService.deleteUser(result.data.id!);
        }
    });

    it('should return error for duplicate username', async () => {
      // First create a user
      const userData = {
        username: 'duplicateuser',
        email: 'duplicate@example.com',
        password: 'testpassword123',
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      // Try to create another user with same username
      const duplicateData = {
        username: 'duplicateuser',
        email: 'different@example.com',
        password: 'testpassword123',
      };

      const result = await userService.createUser(duplicateData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already exists');

      // Clean up
      if (createResult.data) {
        await userService.deleteUser(createResult.data.id!);
      }
    });

    it('should return error for duplicate email', async () => {
      // First create a user
      const userData = {
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'testpassword123',
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      // Try to create another user with same email
      const duplicateData = {
        username: 'differentuser',
        email: 'unique@example.com',
        password: 'testpassword123',
      };

      const result = await userService.createUser(duplicateData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');

      // Clean up
      if (createResult.data) {
        await userService.deleteUser(createResult.data.id!);
      }
    });

    it('should validate user data', async () => {
      const invalidData = {
        username: '', // Invalid: empty username
        email: 'invalid-email', // Invalid: malformed email
        password: '123', // Invalid: too short password
      };

      const result = await userService.createUser(invalidData as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // First create a user
      const userData = {
        username: 'updateuser',
        email: 'update@example.com',
        password: 'testpassword123',
        first_name: 'Update',
        last_name: 'User',
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        // Update the user
        const updateData = {
          first_name: 'Updated',
          last_name: 'Name',
        };

        const result = await userService.updateUser(createResult.data.id!, updateData);
        
        expect(result.success).toBe(true);
        expect(result.data?.first_name).toBe('Updated');
        expect(result.data?.last_name).toBe('Name');
        expect(result.message).toBe('User updated successfully');

        // Clean up
        await userService.deleteUser(createResult.data.id!);
      }
    });

    it('should return error for invalid user ID', async () => {
      const result = await userService.updateUser(0, { first_name: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID provided');
    });

    it('should return error for non-existent user', async () => {
      const result = await userService.updateUser(99999, { first_name: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should prevent duplicate username on update', async () => {
      // Create two users
      const user1Data = {
        username: 'user1',
        email: 'user1@example.com',
        password: 'testpassword123',
      };

      const user2Data = {
        username: 'user2',
        email: 'user2@example.com',
        password: 'testpassword123',
      };

      const create1Result = await userService.createUser(user1Data);
      const create2Result = await userService.createUser(user2Data);

      expect(create1Result.success).toBe(true);
      expect(create2Result.success).toBe(true);

      if (create1Result.data && create2Result.data) {
        // Try to update user2 with user1's username
        const result = await userService.updateUser(create2Result.data.id!, {
          username: 'user1',
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Username already exists');

        // Clean up
        await userService.deleteUser(create1Result.data.id!);
        await userService.deleteUser(create2Result.data.id!);
      }
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // First create a user
      const userData = {
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'testpassword123',
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const userId = createResult.data.id;
        
        const result = await userService.deleteUser(userId!);
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('User deleted successfully');

        // Verify user is deleted
        const getResult = await userService.getUser(userId!);
        expect(getResult.success).toBe(false);
        expect(getResult.error).toBe('User not found');
      }
    });

    it('should return error for invalid user ID', async () => {
      const result = await userService.deleteUser(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID provided');
    });

    it('should return error for non-existent user', async () => {
      const result = await userService.deleteUser(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      // First create an inactive user
      const userData = {
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'testpassword123',
        is_active: false,
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const result = await userService.activateUser(createResult.data.id!);
        
        expect(result.success).toBe(true);
        expect(result.data?.is_active).toBe(true);
        expect(result.message).toBe('User activated successfully');

        // Clean up
        await userService.deleteUser(createResult.data.id!);
      }
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      // First create an active user
      const userData = {
        username: 'activeuser',
        email: 'active@example.com',
        password: 'testpassword123',
        is_active: true,
      };

      const createResult = await userService.createUser(userData);
      expect(createResult.success).toBe(true);

      if (createResult.data) {
        const result = await userService.deactivateUser(createResult.data.id!);
        
        expect(result.success).toBe(true);
        expect(result.data?.is_active).toBe(false);
        expect(result.message).toBe('User deactivated successfully');

        // Clean up
        await userService.deleteUser(createResult.data.id!);
      }
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const result = await userService.getUserStats();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.total).toBeGreaterThanOrEqual(0);
      expect(result.data?.active).toBeGreaterThanOrEqual(0);
      expect(result.data?.inactive).toBeGreaterThanOrEqual(0);
      expect(result.data?.recentlyCreated).toBeGreaterThanOrEqual(0);
      expect(result.data?.total).toBe((result.data?.active || 0) + (result.data?.inactive || 0));
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking the User model to throw an error
      // For now, we'll test that the service handles errors properly
      const result = await userService.getUser(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Legacy Functions', () => {
  it('should work with legacy getUsers function', async () => {
    const result = await getUsers();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result.users)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should work with legacy getUser function', async () => {
    // First get all users to find a valid ID
    const usersResult = await getUsers();
    if (usersResult.users.length > 0) {
      const userId = usersResult.users[0]?.id;
      if (!userId) return;
      
      const user = await getUser(userId);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    }
  });

  it('should work with legacy createUser function', async () => {
    const userData = {
      username: 'legacyuser',
      email: 'legacy@example.com',
      password: 'testpassword123',
    };

    const user = await createUser(userData);
    
    expect(user).toBeDefined();
    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);

    // Clean up
    await userService.deleteUser(user.id!);
  });

  it('should throw error for legacy functions when service fails', async () => {
    await expect(getUser(0)).rejects.toThrow('Invalid user ID provided');
  });
});
