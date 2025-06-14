/**
 * UniFarm Deployment Configuration
 * Ensures proper environment setup for production deployment
 */

export const deploymentConfig = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0', // Required for deployment platforms
    nodeEnv: 'production'
  },
  
  // Database configuration
  database: {
    provider: 'neon',
    forceNeon: true,
    disableReplit: true
  },
  
  // Build configuration
  build: {
    command: 'npm install && npm run build',
    outputDir: 'dist',
    staticDir: 'dist/public'
  },
  
  // Runtime configuration
  runtime: {
    startCommand: 'node stable-server.js',
    healthCheckPath: '/health',
    gracefulShutdown: true
  },
  
  // Required environment variables for production
  requiredEnvVars: [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'TELEGRAM_BOT_TOKEN'
  ],
  
  // Optional environment variables with defaults
  optionalEnvVars: {
    'CORS_ORIGINS': '*',
    'API_BASE_URL': '/api/v2',
    'TELEGRAM_BOT_USERNAME': 'UniFarming_Bot'
  }
};

// Validate deployment environment
export function validateDeploymentEnvironment() {
  const missing = deploymentConfig.requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
}

// Setup deployment environment
export function setupDeploymentEnvironment() {
  // Set required production values
  process.env.NODE_ENV = deploymentConfig.server.nodeEnv;
  process.env.HOST = deploymentConfig.server.host;
  process.env.DATABASE_PROVIDER = deploymentConfig.database.provider;
  process.env.FORCE_NEON_DB = deploymentConfig.database.forceNeon.toString();
  process.env.DISABLE_REPLIT_DB = deploymentConfig.database.disableReplit.toString();
  
  // Set optional values with defaults
  Object.entries(deploymentConfig.optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });
  
  console.log('Deployment environment configured');
  return true;
}

export default deploymentConfig;