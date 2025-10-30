"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const user_service_1 = require("../services/user_service");
const router = express_1.default.Router();
// Request validation schemas
const UserParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'User ID must be a positive integer').transform(Number),
});
const UserCreateBodySchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required').max(50, 'Username too long'),
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    first_name: zod_1.z.string().max(50, 'First name too long').optional(),
    last_name: zod_1.z.string().max(50, 'Last name too long').optional(),
    is_active: zod_1.z.boolean().optional().default(true),
});
const UserUpdateBodySchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required').max(50, 'Username too long').optional(),
    email: zod_1.z.string().email('Invalid email format').optional(),
    first_name: zod_1.z.string().max(50, 'First name too long').optional(),
    last_name: zod_1.z.string().max(50, 'Last name too long').optional(),
    is_active: zod_1.z.boolean().optional(),
});
const UserQuerySchema = zod_1.z.object({
    isActive: zod_1.z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    search: zod_1.z.string().optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: zod_1.z.enum(['username', 'email', 'created_at', 'last_login']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
});
// Middleware for request validation
const validateUserParams = (req, res, next) => {
    try {
        const parsedParams = UserParamsSchema.parse(req.params);
        req.validatedParams = parsedParams;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                details: error.errors.map(e => e.message).join(', '),
            });
            return;
        }
        next(error);
    }
};
const validateUserCreate = (req, res, next) => {
    try {
        req.body = UserCreateBodySchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors.map(e => e.message).join(', '),
            });
            return;
        }
        next(error);
    }
};
const validateUserUpdate = (req, res, next) => {
    try {
        req.body = UserUpdateBodySchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors.map(e => e.message).join(', '),
            });
            return;
        }
        next(error);
    }
};
const validateUserQuery = (req, res, next) => {
    try {
        const parsedQuery = UserQuerySchema.parse(req.query);
        req.validatedQuery = parsedQuery;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: error.errors.map(e => e.message).join(', '),
            });
            return;
        }
        next(error);
    }
};
// Error handling middleware
const handleServiceError = (error, res) => {
    console.error('User service error:', error);
    // Check if headers have already been sent
    if (res.headersSent) {
        return;
    }
    if (error.message?.includes('Validation error')) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.message,
        });
        return;
    }
    if (error.message?.includes('not found')) {
        res.status(404).json({
            success: false,
            error: 'User not found',
        });
        return;
    }
    if (error.message?.includes('already exists')) {
        res.status(409).json({
            success: false,
            error: 'User already exists',
            details: error.message,
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
};
/**
 * GET /users
 * Get all users with optional filtering and pagination
 */
router.get('/users', validateUserQuery, async (req, res) => {
    try {
        const filters = req.validatedQuery || {};
        const result = await user_service_1.userService.getUsers(filters);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * GET /users/:id
 * Get a single user by ID
 */
router.get('/users/:id', validateUserParams, async (req, res) => {
    try {
        const userId = req.validatedParams.id;
        const result = await user_service_1.userService.getUser(userId);
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
                return;
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * GET /users/username/:username
 * Get a user by username
 */
router.get('/users/username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username || username.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Username is required',
            });
            return;
        }
        const result = await user_service_1.userService.getUserByUsername(username.trim());
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * GET /users/email/:email
 * Get a user by email
 */
router.get('/users/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email || email.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Email is required',
            });
        }
        const result = await user_service_1.userService.getUserByEmail(email.trim());
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /users
 * Create a new user
 */
router.post('/users', validateUserCreate, async (req, res) => {
    try {
        const result = await user_service_1.userService.createUser(req.body);
        if (!result.success) {
            if (result.error?.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: result.error,
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(201).json({
            success: true,
            data: result.data,
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * PUT /users/:id
 * Update an existing user
 */
router.put('/users/:id', validateUserParams, validateUserUpdate, async (req, res) => {
    try {
        const userId = req.validatedParams.id;
        const result = await user_service_1.userService.updateUser(userId, req.body);
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            if (result.error?.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: result.error,
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * DELETE /users/:id
 * Delete a user
 */
router.delete('/users/:id', validateUserParams, async (req, res) => {
    try {
        const userId = req.validatedParams.id;
        const result = await user_service_1.userService.deleteUser(userId);
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /users/:id/activate
 * Activate a user
 */
router.post('/users/:id/activate', validateUserParams, async (req, res) => {
    try {
        const userId = req.validatedParams.id;
        const result = await user_service_1.userService.activateUser(userId);
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /users/:id/deactivate
 * Deactivate a user
 */
router.post('/users/:id/deactivate', validateUserParams, async (req, res) => {
    try {
        const userId = req.validatedParams.id;
        const result = await user_service_1.userService.deactivateUser(userId);
        if (!result.success) {
            if (result.error === 'User not found') {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * GET /users/stats
 * Get user statistics
 */
router.get('/users/stats', async (_req, res) => {
    try {
        const result = await user_service_1.userService.getUserStats();
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
// Health check endpoint
router.get('/users/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Users API is healthy',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=users.js.map