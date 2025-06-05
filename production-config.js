/**
 * Production configuration for UniFarm server
 */

export default {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Environment
  nodeEnv: 'production',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
    maxConnections: 20,
    idleTimeout: 30000
  },
  
  // API configuration
  api: {
    prefix: '/api/v2',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // CORS settings
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
    credentials: true
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'unifarm-default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  // WebSocket configuration
  websocket: {
    enabled: true,
    pingTimeout: 60000,
    pingInterval: 25000
  },
  
  // Logging
  logging: {
    level: 'info',
    format: 'combined'
  }
};