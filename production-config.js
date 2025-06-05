/**
 * Production Configuration for UniFarm
 * Настройки для продакшен деплоя
 */

const productionConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    environment: 'production',
    maxConnections: 1000,
    keepAliveTimeout: 65000,
    headersTimeout: 66000
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 900000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    ssl: {
      rejectUnauthorized: false
    }
  },

  // Security Settings
  security: {
    cors: {
      origin: [
        'https://unifarm.app',
        'https://www.unifarm.app',
        'https://t.me'
      ],
      credentials: true,
      optionsSuccessStatus: 200
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "https://telegram.org"],
          connectSrc: ["'self'", "wss:", "https:"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Слишком много запросов с этого IP'
    },
    session: {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }
  },

  // Logging Configuration
  logging: {
    level: 'info',
    format: 'json',
    transports: [
      {
        type: 'file',
        filename: 'logs/app.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        rotationFormat: false
      },
      {
        type: 'file',
        level: 'error',
        filename: 'logs/error.log',
        maxsize: 10485760,
        maxFiles: 5
      }
    ]
  },

  // Telegram Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    allowedUpdates: ['message', 'callback_query', 'inline_query'],
    polling: false // Use webhooks in production
  },

  // TON Configuration
  ton: {
    network: 'mainnet',
    apiEndpoint: 'https://toncenter.com/api/v2/',
    apiKey: process.env.TON_API_KEY,
    walletVersion: 'v4R2'
  },

  // Cache Configuration
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    },
    ttl: {
      userBalance: 60, // 1 minute
      farmingStats: 300, // 5 minutes
      referralTree: 600, // 10 minutes
      missions: 3600 // 1 hour
    }
  },

  // Performance Monitoring
  monitoring: {
    healthCheck: {
      endpoint: '/health',
      timeout: 5000
    },
    metrics: {
      enabled: true,
      interval: 60000, // 1 minute
      retention: 86400000 // 24 hours
    }
  },

  // Static Files
  static: {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  },

  // Build Configuration
  build: {
    target: 'es2020',
    minify: true,
    sourcemap: false,
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000
  }
};

export default productionConfig;