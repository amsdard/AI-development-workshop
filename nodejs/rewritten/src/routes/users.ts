import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService, UserFilters } from '../services/user_service';

const router = express.Router();

// Request validation schemas
const UserParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'User ID must be a positive integer').transform(Number),
});

const UserCreateBodySchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().max(50, 'First name too long').optional(),
  last_name: z.string().max(50, 'Last name too long').optional(),
  is_active: z.boolean().optional().default(true),
});

const UserUpdateBodySchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  first_name: z.string().max(50, 'First name too long').optional(),
  last_name: z.string().max(50, 'Last name too long').optional(),
  is_active: z.boolean().optional(),
});

const UserQuerySchema = z.object({
  isActive: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['username', 'email', 'created_at', 'last_login']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Middleware for request validation
const validateUserParams = (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedParams = UserParamsSchema.parse(req.params);
    (req as any).validatedParams = parsedParams;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
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

const validateUserCreate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = UserCreateBodySchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
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

const validateUserUpdate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = UserUpdateBodySchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
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

const validateUserQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = UserQuerySchema.parse(req.query);
    (req as any).validatedQuery = parsedQuery;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
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
const handleServiceError = (error: any, res: Response) => {
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
router.get('/users', validateUserQuery, async (req: Request, res: Response) => {
  try {
    const filters: UserFilters = (req as any).validatedQuery || {};

    const result = await userService.getUsers(filters);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * GET /users/:id
 * Get a single user by ID
 */
router.get('/users/:id', validateUserParams, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).validatedParams.id;
    const result = await userService.getUser(userId);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * GET /users/username/:username
 * Get a user by username
 */
router.get('/users/username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    const result = await userService.getUserByUsername(username.trim());
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * GET /users/email/:email
 * Get a user by email
 */
router.get('/users/email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email || email.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const result = await userService.getUserByEmail(email!.trim());
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * POST /users
 * Create a new user
 */
router.post('/users', validateUserCreate, async (req: Request, res: Response) => {
  try {
    const result = await userService.createUser(req.body);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * PUT /users/:id
 * Update an existing user
 */
router.put('/users/:id', validateUserParams, validateUserUpdate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).validatedParams.id;
    const result = await userService.updateUser(userId, req.body);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * DELETE /users/:id
 * Delete a user
 */
router.delete('/users/:id', validateUserParams, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).validatedParams.id;
    const result = await userService.deleteUser(userId);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * POST /users/:id/activate
 * Activate a user
 */
router.post('/users/:id/activate', validateUserParams, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).validatedParams.id;
    const result = await userService.activateUser(userId);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * POST /users/:id/deactivate
 * Deactivate a user
 */
router.post('/users/:id/deactivate', validateUserParams, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).validatedParams.id;
    const result = await userService.deactivateUser(userId);
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

/**
 * GET /users/stats
 * Get user statistics
 */
router.get('/users/stats', async (_req: Request, res: Response) => {
  try {
    const result = await userService.getUserStats();
    
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
  } catch (error) {
    handleServiceError(error, res);
  }
});

// Health check endpoint
router.get('/users/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Users API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
