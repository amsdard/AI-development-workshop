"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = exports.UserFiltersSchema = void 0;
exports.getUsers = getUsers;
exports.getUser = getUser;
exports.createUser = createUser;
const zod_1 = require("zod");
const user_1 = require("../models/user");
// Validation schemas for service operations
exports.UserFiltersSchema = zod_1.z.object({
    isActive: zod_1.z.boolean().optional(),
    search: zod_1.z.string().min(1).optional(),
    page: zod_1.z.number().int().optional().default(1).transform(val => val < 1 ? 1 : val),
    limit: zod_1.z.number().int().optional().default(10).transform(val => val < 1 ? 10 : val > 100 ? 100 : val),
    sortBy: zod_1.z.enum(['username', 'email', 'created_at', 'last_login']).optional().default('created_at'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
class UserService {
    /**
     * Get all users with optional filtering and pagination
     */
    async getUsers(filters) {
        try {
            // Validate filters
            const validatedFilters = exports.UserFiltersSchema.parse(filters || {});
            // Get all users from the model
            const users = await user_1.userModel.findAll();
            // Apply filters
            let filteredUsers = users;
            // Filter by active status
            if (validatedFilters.isActive !== undefined) {
                filteredUsers = filteredUsers.filter((user) => user.is_active === validatedFilters.isActive);
            }
            // Filter by search term
            if (validatedFilters.search) {
                const searchTerm = validatedFilters.search.toLowerCase();
                filteredUsers = filteredUsers.filter((user) => user.username.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
                    (user.last_name && user.last_name.toLowerCase().includes(searchTerm)));
            }
            // Sort users
            filteredUsers.sort((a, b) => {
                const aValue = this.getSortValue(a, validatedFilters.sortBy);
                const bValue = this.getSortValue(b, validatedFilters.sortBy);
                if (validatedFilters.sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                }
                else {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get a single user by ID
     */
    async getUser(userId) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            const user = await user_1.userModel.findById(userId);
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get a user by username
     */
    async getUserByUsername(username) {
        try {
            if (!username || username.trim().length === 0) {
                return {
                    success: false,
                    error: 'Username is required',
                };
            }
            const user = await user_1.userModel.findByUsername(username.trim());
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get a user by email
     */
    async getUserByEmail(email) {
        try {
            if (!email || email.trim().length === 0) {
                return {
                    success: false,
                    error: 'Email is required',
                };
            }
            const user = await user_1.userModel.findByEmail(email.trim());
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Create a new user
     */
    async createUser(userCreateData) {
        try {
            // Validate input data
            const validatedData = user_1.UserCreateSchema.parse(userCreateData);
            // Check if username already exists
            const existingUserByUsername = await user_1.userModel.findByUsername(validatedData.username);
            if (existingUserByUsername) {
                return {
                    success: false,
                    error: 'Username already exists',
                };
            }
            // Check if email already exists
            const existingUserByEmail = await user_1.userModel.findByEmail(validatedData.email);
            if (existingUserByEmail) {
                return {
                    success: false,
                    error: 'Email already exists',
                };
            }
            // Create new user
            const user = new user_1.UserModel();
            const userData = {
                id: null,
                username: validatedData.username,
                email: validatedData.email,
                password_hash: user_1.UserModel.setPassword(validatedData.password),
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async updateUser(userId, userData) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            // Validate input data
            const validatedData = user_1.UserUpdateSchema.parse(userData);
            // Check if user exists
            const existingUser = await user_1.userModel.findById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }
            // Check for username conflicts if username is being updated
            if (validatedData.username && validatedData.username !== existingUser.username) {
                const userWithUsername = await user_1.userModel.findByUsername(validatedData.username);
                if (userWithUsername && userWithUsername.id !== userId) {
                    return {
                        success: false,
                        error: 'Username already exists',
                    };
                }
            }
            // Check for email conflicts if email is being updated
            if (validatedData.email && validatedData.email !== existingUser.email) {
                const userWithEmail = await user_1.userModel.findByEmail(validatedData.email);
                if (userWithEmail && userWithEmail.id !== userId) {
                    return {
                        success: false,
                        error: 'Email already exists',
                    };
                }
            }
            // Update user
            const user = new user_1.UserModel();
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async deleteUser(userId) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            // Check if user exists
            const existingUser = await user_1.userModel.findById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }
            // Delete user
            await user_1.userModel.delete(userId);
            return {
                success: true,
                message: 'User deleted successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Activate a user
     */
    async activateUser(userId) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            const user = await user_1.userModel.findById(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }
            const userModelInstance = new user_1.UserModel();
            const updatedUser = await userModelInstance.save({ ...user, is_active: true, updated_at: new Date() });
            return {
                success: true,
                data: updatedUser,
                message: 'User activated successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Deactivate a user
     */
    async deactivateUser(userId) {
        try {
            if (!userId || userId <= 0) {
                return {
                    success: false,
                    error: 'Invalid user ID provided',
                };
            }
            const user = await user_1.userModel.findById(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }
            const userModelInstance = new user_1.UserModel();
            const updatedUser = await userModelInstance.save({ ...user, is_active: false, updated_at: new Date() });
            return {
                success: true,
                data: updatedUser,
                message: 'User deactivated successfully',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Get user statistics
     */
    async getUserStats() {
        try {
            const users = await user_1.userModel.findAll();
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const stats = {
                total: users.length,
                active: users.filter((user) => user.is_active).length,
                inactive: users.filter((user) => !user.is_active).length,
                recentlyCreated: users.filter((user) => user.created_at && new Date(user.created_at) > thirtyDaysAgo).length,
            };
            return {
                success: true,
                data: stats,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Helper method to get sort value for a user
     */
    getSortValue(user, sortBy) {
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
exports.UserService = UserService;
// Create singleton instance
exports.userService = new UserService();
// Legacy functions for backward compatibility
async function getUsers(filters) {
    const result = await exports.userService.getUsers(filters);
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get users');
    }
    return result.data;
}
async function getUser(userId) {
    const result = await exports.userService.getUser(userId);
    if (!result.success) {
        throw new Error(result.error || 'Failed to get user');
    }
    return result.data || null;
}
async function createUser(userData) {
    const result = await exports.userService.createUser(userData);
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create user');
    }
    return result.data;
}
//# sourceMappingURL=user_service.js.map