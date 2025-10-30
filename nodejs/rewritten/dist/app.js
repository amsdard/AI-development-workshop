"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = exports.initializeApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
const db_1 = require("./db");
// import { DatabaseManager as SQLDatabaseManager } from './database';
const users_1 = __importDefault(require("./routes/users"));
const tasks_1 = __importDefault(require("./routes/tasks"));
// Load environment variables
(0, dotenv_1.config)();
// Configuration schema
const AppConfigSchema = zod_1.z.object({
    port: zod_1.z.string().regex(/^\d+$/).transform(Number).default('3000'),
    nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    dbPath: zod_1.z.string().default('./data/taskflow.db'),
    corsOrigin: zod_1.z.string().optional(),
    logLevel: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
// Parse and validate configuration
const appConfig = AppConfigSchema.parse({
    port: process.env['PORT'] || '3000',
    nodeEnv: process.env['NODE_ENV'] || 'development',
    dbPath: process.env['DB_PATH'] || './data/taskflow.db',
    corsOrigin: process.env['CORS_ORIGIN'],
    logLevel: process.env['LOG_LEVEL'] || 'info',
});
exports.appConfig = appConfig;
// Create Express application
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)(corsOptions));
// Logging middleware
if (appConfig.nodeEnv !== 'test') {
    const logFormat = appConfig.nodeEnv === 'production'
        ? 'combined'
        : 'dev';
    app.use((0, morgan_1.default)(logFormat));
}
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request ID middleware
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});
// API routes
app.use('/api/users', users_1.default);
app.use('/api/tasks', tasks_1.default);
// Root endpoint
app.get('/', (_req, res) => {
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
app.get('/api/health', async (_req, res) => {
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
    }
    catch (error) {
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
app.get('/api/docs', (_req, res) => {
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
app.use('*', (req, res) => {
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
app.use((error, req, res, _next) => {
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
let databaseManager;
// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    try {
        // Close database connections
        if (databaseManager) {
            await databaseManager.disconnect();
            console.log('Database connection closed');
        }
        console.log('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
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
        databaseManager = new db_1.DatabaseManager({
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
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${appConfig.port} is already in use`);
                process.exit(1);
            }
            throw error;
        });
    }
    catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
};
exports.initializeApp = initializeApp;
// Start the application
if (require.main === module) {
    initializeApp();
}
exports.default = app;
//# sourceMappingURL=app.js.map