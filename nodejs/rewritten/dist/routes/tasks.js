"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const task_service_1 = require("../services/task_service");
const router = express_1.default.Router();
// Request validation schemas
const TaskParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'Task ID must be a positive integer').transform(Number),
});
const TaskCreateBodySchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    due_date: zod_1.z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
    user_id: zod_1.z.number().int().positive('User ID must be a positive integer').optional(),
    assigned_to: zod_1.z.number().int().positive('Assigned user ID must be a positive integer').optional(),
});
const TaskUpdateBodySchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    due_date: zod_1.z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    user_id: zod_1.z.number().int().positive('User ID must be a positive integer').optional(),
    assigned_to: zod_1.z.number().int().positive('Assigned user ID must be a positive integer').optional(),
});
const TaskQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    user_id: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    assigned_to: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    search: zod_1.z.string().optional(),
    overdue: zod_1.z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    due_today: zod_1.z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    due_this_week: zod_1.z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: zod_1.z.enum(['title', 'due_date', 'created_at', 'priority', 'status']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
});
// Schema for overdue tasks query parameters
const OverdueTasksQuerySchema = zod_1.z.object({
    days: zod_1.z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 0, {
        message: "Days must be non-negative"
    }).optional().default('0'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 1 && val <= 100, {
        message: "Limit must be between 1 and 100"
    }).optional().default('10'),
    offset: zod_1.z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 0, {
        message: "Offset must be non-negative"
    }).optional().default('0'),
});
// Middleware for request validation
const validateTaskParams = (req, res, next) => {
    try {
        const parsedParams = TaskParamsSchema.parse(req.params);
        req.validatedParams = parsedParams;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid task ID',
                details: error.errors.map(e => e.message).join(', '),
            });
            return;
        }
        next(error);
    }
};
const validateTaskCreate = (req, res, next) => {
    try {
        req.body = TaskCreateBodySchema.parse(req.body);
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
const validateTaskUpdate = (req, res, next) => {
    try {
        req.body = TaskUpdateBodySchema.parse(req.body);
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
const validateOverdueQuery = (req, res, next) => {
    try {
        const parsedQuery = OverdueTasksQuerySchema.parse(req.query);
        req.validatedQuery = parsedQuery;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            });
            return;
        }
        next(error);
    }
};
const validateTaskQuery = (req, res, next) => {
    try {
        const parsedQuery = TaskQuerySchema.parse(req.query);
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
    console.error('Task service error:', error);
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
            error: 'Task not found',
        });
        return;
    }
    if (error.message?.includes('already exists')) {
        res.status(409).json({
            success: false,
            error: 'Task already exists',
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
 * GET /tasks
 * Get all tasks with optional filtering and pagination
 */
router.get('/tasks', validateTaskQuery, async (req, res) => {
    try {
        const filters = req.validatedQuery || {};
        const result = await task_service_1.taskService.getTasks(filters);
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
 * GET /tasks/overdue
 * Get overdue tasks with query parameters
 */
router.get('/tasks/overdue', validateOverdueQuery, async (req, res) => {
    try {
        const query = req.validatedQuery;
        const result = await task_service_1.taskService.getOverdueTasks(query);
        if (!result.success) {
            res.status(500).json({
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
 * GET /tasks/:id
 * Get a single task by ID
 */
router.get('/tasks/:id', validateTaskParams, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.getTask(taskId);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
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
 * GET /tasks/user/:userId
 * Get tasks by user ID
 */
router.get('/tasks/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params['userId']);
        if (isNaN(userId) || userId <= 0) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
            });
            return;
        }
        const result = await task_service_1.taskService.getTasksByUser(userId);
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
 * GET /tasks/due-today
 * Get tasks due today
 */
router.get('/tasks/due-today', async (_req, res) => {
    try {
        const result = await task_service_1.taskService.getTasksDueToday();
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
 * GET /tasks/due-this-week
 * Get tasks due this week
 */
router.get('/tasks/due-this-week', async (_req, res) => {
    try {
        const result = await task_service_1.taskService.getTasksDueThisWeek();
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
 * POST /tasks
 * Create a new task
 */
router.post('/tasks', validateTaskCreate, async (req, res) => {
    try {
        const result = await task_service_1.taskService.createTask(req.body);
        if (!result.success) {
            if (result.error?.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: result.error,
                });
                return;
            }
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
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
 * PUT /tasks/:id
 * Update an existing task
 */
router.put('/tasks/:id', validateTaskParams, validateTaskUpdate, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.updateTask(taskId, req.body);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                });
                return;
            }
            if (result.error?.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: result.error,
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
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * DELETE /tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', validateTaskParams, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.deleteTask(taskId);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
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
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /tasks/:id/complete
 * Mark a task as completed
 */
router.post('/tasks/:id/complete', validateTaskParams, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.completeTask(taskId);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
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
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /tasks/:id/start
 * Mark a task as in progress
 */
router.post('/tasks/:id/start', validateTaskParams, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.startTask(taskId);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
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
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * POST /tasks/:id/cancel
 * Cancel a task
 */
router.post('/tasks/:id/cancel', validateTaskParams, async (req, res) => {
    try {
        const taskId = req.validatedParams.id;
        const result = await task_service_1.taskService.cancelTask(taskId);
        if (!result.success) {
            if (result.error === 'Task not found') {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
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
            message: result.message,
        });
    }
    catch (error) {
        handleServiceError(error, res);
    }
});
/**
 * GET /tasks/stats
 * Get task statistics
 */
router.get('/tasks/stats', async (_req, res) => {
    try {
        const result = await task_service_1.taskService.getTaskStats();
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
// Health check endpoint
router.get('/tasks/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Tasks API is healthy',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=tasks.js.map