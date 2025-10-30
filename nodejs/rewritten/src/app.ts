import express, { Application, Request, Response, NextFunction } from 'express';

// Extend Request interface to include id property
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { config } from 'dotenv';
import { DatabaseManager } from './db';
// import { DatabaseManager as SQLDatabaseManager } from './database';
import usersRouter from './routes/users';
import tasksRouter from './routes/tasks';

// Load environment variables
config();

// Configuration schema
const AppConfigSchema = z.object({
  port: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  dbPath: z.string().default('./data/taskflow.db'),
  corsOrigin: z.string().optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate configuration
const appConfig = AppConfigSchema.parse({
  port: process.env['PORT'] || '3000',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  dbPath: process.env['DB_PATH'] || './data/taskflow.db',
  corsOrigin: process.env['CORS_ORIGIN'],
  logLevel: process.env['LOG_LEVEL'] || 'info',
});

// Create Express application
const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: appConfig.corsOrigin || (appConfig.nodeEnv === 'development' ? true : false),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

app.use(cors(corsOptions));

// Logging middleware
if (appConfig.nodeEnv !== 'test') {
  const logFormat = appConfig.nodeEnv === 'production' 
    ? 'combined' 
    : 'dev';
  app.use(morgan(logFormat));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'TaskFlow API - Modern TypeScript Version',
    version: '2.0.0',
    environment: appConfig.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      users: '/api/users',
      tasks: '/api/tasks',
      health: '/api/health',
      docs: '/api/docs',
    },
  });
});

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    const dbStats = await databaseManager.getStats();
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: true,
        stats: dbStats,
      },
      environment: appConfig.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      environment: appConfig.nodeEnv,
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'TaskFlow API Documentation',
    version: '2.0.0',
    endpoints: {
      users: {
        base: '/api/users',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'User management endpoints',
        subEndpoints: {
          list: 'GET /api/users - List all users with filtering',
          get: 'GET /api/users/:id - Get user by ID',
          create: 'POST /api/users - Create new user',
          update: 'PUT /api/users/:id - Update user',
          delete: 'DELETE /api/users/:id - Delete user',
          activate: 'POST /api/users/:id/activate - Activate user',
          deactivate: 'POST /api/users/:id/deactivate - Deactivate user',
          stats: 'GET /api/users/stats - Get user statistics',
          health: 'GET /api/users/health - Users API health check',
        },
      },
      tasks: {
        base: '/api/tasks',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Task management endpoints',
        subEndpoints: {
          list: 'GET /api/tasks - List all tasks with filtering',
          get: 'GET /api/tasks/:id - Get task by ID',
          create: 'POST /api/tasks - Create new task',
          update: 'PUT /api/tasks/:id - Update task',
          delete: 'DELETE /api/tasks/:id - Delete task',
          complete: 'POST /api/tasks/:id/complete - Mark task as completed',
          start: 'POST /api/tasks/:id/start - Mark task as in progress',
          cancel: 'POST /api/tasks/:id/cancel - Cancel task',
          overdue: 'GET /api/tasks/overdue - Get overdue tasks',
          dueToday: 'GET /api/tasks/due-today - Get tasks due today',
          dueThisWeek: 'GET /api/tasks/due-this-week - Get tasks due this week',
          byUser: 'GET /api/tasks/user/:userId - Get tasks by user',
          stats: 'GET /api/tasks/stats - Get task statistics',
          health: 'GET /api/tasks/health - Tasks API health check',
        },
      },
    },
    authentication: {
      type: 'None (Public API)',
      note: 'This is a demo API without authentication',
    },
    rateLimiting: {
      enabled: false,
      note: 'Rate limiting not implemented in this demo',
    },
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /api/health',
      docs: 'GET /api/docs',
      users: 'GET /api/users',
      tasks: 'GET /api/tasks',
    },
  });
});

// Global error handler
app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error handler:', error);
  
  // Don't send error details in production
  const isDevelopment = appConfig.nodeEnv === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack }),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// Database manager instance
let databaseManager: DatabaseManager;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    if (databaseManager) {
      await databaseManager.disconnect();
      console.log('Database connection closed');
    }
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Initialize database and start server
const initializeApp = async () => {
  try {
    console.log('Initializing TaskFlow API...');
    console.log(`Environment: ${appConfig.nodeEnv}`);
    console.log(`Port: ${appConfig.port}`);
    console.log(`Database: ${appConfig.dbPath}`);
    
    // Initialize database
    databaseManager = new DatabaseManager({
      dbPath: appConfig.dbPath,
    });
    
    await databaseManager.connect();
    console.log('Database connected successfully');
    
    // Start server
    const server = app.listen(appConfig.port, () => {
      console.log(`🚀 TaskFlow API server running on http://localhost:${appConfig.port}`);
      console.log(`📚 API Documentation: http://localhost:${appConfig.port}/api/docs`);
      console.log(`❤️  Health Check: http://localhost:${appConfig.port}/api/health`);
      console.log(`👥 Users API: http://localhost:${appConfig.port}/api/users`);
      console.log(`📋 Tasks API: http://localhost:${appConfig.port}/api/tasks`);
    });
    
    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${appConfig.port} is already in use`);
        process.exit(1);
      }
      throw error;
    });
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
if (require.main === module) {
  initializeApp();
}

export default app;
export { initializeApp, appConfig };
