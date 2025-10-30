import { Application } from 'express';
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
declare const appConfig: {
    dbPath: string;
    port: number;
    nodeEnv: "development" | "production" | "test";
    logLevel: "error" | "warn" | "info" | "debug";
    corsOrigin?: string | undefined;
};
declare const app: Application;
declare const initializeApp: () => Promise<void>;
export default app;
export { initializeApp, appConfig };
//# sourceMappingURL=app.d.ts.map