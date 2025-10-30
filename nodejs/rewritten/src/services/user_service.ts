import { z } from 'zod';
import { UserModel, User, UserCreate, UserUpdate, UserCreateSchema, UserUpdateSchema, userModel } from '../models/user';

// Service interfaces
export interface UserServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'username' | 'email' | 'created_at' | 'last_login';
  sortOrder?: 'asc' | 'desc';
}

// Validation schemas for service operations
export const UserFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().min(1).optional(),
  page: z.number().int().optional().default(1).transform(val => val < 1 ? 1 : val),
  limit: z.number().int().optional().default(10).transform(val => val < 1 ? 10 : val > 100 ? 100 : val),
  sortBy: z.enum(['username', 'email', 'created_at', 'last_login']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class UserService {
  /**
   * Get all users with optional filtering and pagination
   */
  async getUsers(filters?: UserFilters): Promise<UserServiceResponse<UserListResponse>> {
    try {
      // Validate filters
      const validatedFilters = UserFiltersSchema.parse(filters || {});
      
      // Get all users from the model
      const users = await userModel.findAll();
      
      // Apply filters
      let filteredUsers = users;
      
      // Filter by active status
      if (validatedFilters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter((user: User) => user.is_active === validatedFilters.isActive);
      }
      
      // Filter by search term
      if (validatedFilters.search) {
        const searchTerm = validatedFilters.search.toLowerCase();
        filteredUsers = filteredUsers.filter((user: User) => 
          user.username.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchTerm))
        );
      }
      
      // Sort users
      filteredUsers.sort((a: User, b: User) => {
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
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: {
          users: paginatedUsers,
          total: filteredUsers.length,
          page: validatedFilters.page,
          limit: validatedFilters.limit,
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
   * Get a single user by ID
   */
  async getUser(userId: number): Promise<UserServiceResponse<User>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      const user = await userModel.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<UserServiceResponse<User>> {
    try {
      if (!username || username.trim().length === 0) {
        return {
          success: false,
          error: 'Username is required',
        };
      }

      const user = await userModel.findByUsername(username.trim());
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserServiceResponse<User>> {
    try {
      if (!email || email.trim().length === 0) {
        return {
          success: false,
          error: 'Email is required',
        };
      }

      const user = await userModel.findByEmail(email.trim());
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create a new user
   */
  async createUser(userCreateData: UserCreate): Promise<UserServiceResponse<User>> {
    try {
      // Validate input data
      const validatedData = UserCreateSchema.parse(userCreateData);
      
      // Check if username already exists
      const existingUserByUsername = await userModel.findByUsername(validatedData.username);
      if (existingUserByUsername) {
        return {
          success: false,
          error: 'Username already exists',
        };
      }
      
      // Check if email already exists
      const existingUserByEmail = await userModel.findByEmail(validatedData.email);
      if (existingUserByEmail) {
        return {
          success: false,
          error: 'Email already exists',
        };
      }
      
      // Create new user
      const user = new UserModel();
      const userData = {
        id: null,
        username: validatedData.username,
        email: validatedData.email,
        password_hash: UserModel.setPassword(validatedData.password),
        first_name: validatedData.first_name || '',
        last_name: validatedData.last_name || '',
        is_active: validatedData.is_active ?? true,
        created_at: new Date(),
        updated_at: null,
        last_login: null,
        api_key: null,
      };
      const savedUser = await user.save(userData);
      
      return {
        success: true,
        data: savedUser,
        message: 'User created successfully',
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
   * Update an existing user
   */
  async updateUser(userId: number, userData: UserUpdate): Promise<UserServiceResponse<User>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      // Validate input data
      const validatedData = UserUpdateSchema.parse(userData);
      
      // Check if user exists
      const existingUser = await userModel.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }
      
      // Check for username conflicts if username is being updated
      if (validatedData.username && validatedData.username !== existingUser.username) {
        const userWithUsername = await userModel.findByUsername(validatedData.username);
        if (userWithUsername && userWithUsername.id !== userId) {
          return {
            success: false,
            error: 'Username already exists',
          };
        }
      }
      
      // Check for email conflicts if email is being updated
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const userWithEmail = await userModel.findByEmail(validatedData.email);
        if (userWithEmail && userWithEmail.id !== userId) {
          return {
            success: false,
            error: 'Email already exists',
          };
        }
      }
      
      // Update user
      const user = new UserModel();
      const updatedUser = await user.save({
        ...existingUser,
        username: validatedData.username || existingUser.username,
        email: validatedData.email || existingUser.email,
        first_name: validatedData.first_name || existingUser.first_name,
        last_name: validatedData.last_name || existingUser.last_name,
        is_active: validatedData.is_active !== undefined ? validatedData.is_active : existingUser.is_active,
        updated_at: new Date(),
      });
      
      return {
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
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
   * Delete a user
   */
  async deleteUser(userId: number): Promise<UserServiceResponse<void>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      // Check if user exists
      const existingUser = await userModel.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }
      
      // Delete user
      await userModel.delete(userId);
      
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Activate a user
   */
  async activateUser(userId: number): Promise<UserServiceResponse<User>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const userModelInstance = new UserModel();
      const updatedUser = await userModelInstance.save({ ...user, is_active: true, updated_at: new Date() });
      
      return {
        success: true,
        data: updatedUser,
        message: 'User activated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: number): Promise<UserServiceResponse<User>> {
    try {
      if (!userId || userId <= 0) {
        return {
          success: false,
          error: 'Invalid user ID provided',
        };
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const userModelInstance = new UserModel();
      const updatedUser = await userModelInstance.save({ ...user, is_active: false, updated_at: new Date() });
      
      return {
        success: true,
        data: updatedUser,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserServiceResponse<{
    total: number;
    active: number;
    inactive: number;
    recentlyCreated: number;
  }>> {
    try {
      const users = await userModel.findAll();
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: users.length,
        active: users.filter((user: User) => user.is_active).length,
        inactive: users.filter((user: User) => !user.is_active).length,
        recentlyCreated: users.filter((user: User) => 
          user.created_at && new Date(user.created_at) > thirtyDaysAgo
        ).length,
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
   * Helper method to get sort value for a user
   */
  private getSortValue(user: User, sortBy: string): any {
    switch (sortBy) {
      case 'username':
        return user.username;
      case 'email':
        return user.email;
      case 'created_at':
        return user.created_at ? new Date(user.created_at).getTime() : 0;
      case 'last_login':
        return user.last_login ? new Date(user.last_login).getTime() : 0;
      default:
        return user.created_at ? new Date(user.created_at).getTime() : 0;
    }
  }
}

// Create singleton instance
export const userService = new UserService();

// Legacy functions for backward compatibility
export async function getUsers(filters?: UserFilters): Promise<UserListResponse> {
  const result = await userService.getUsers(filters);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get users');
  }
  return result.data;
}

export async function getUser(userId: number): Promise<User | null> {
  const result = await userService.getUser(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to get user');
  }
  return result.data || null;
}

export async function createUser(userData: UserCreate): Promise<User> {
  const result = await userService.createUser(userData);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create user');
  }
  return result.data;
}
