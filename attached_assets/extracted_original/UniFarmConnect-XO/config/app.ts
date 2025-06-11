export const appConfig = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: 'v2',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  sessionSecret: process.env.SESSION_SECRET || 'unifarm-secret-key',
  jwtSecret: process.env.JWT_SECRET || 'unifarm-jwt-secret'
};