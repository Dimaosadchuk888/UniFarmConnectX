// Экспорт основных компонентов core модуля
export { config } from './config';
export { initDatabase, getDatabase } from './db';
export { corsMiddleware, loggerMiddleware, errorHandler } from './middleware';
export { createServer, startServer } from './server';