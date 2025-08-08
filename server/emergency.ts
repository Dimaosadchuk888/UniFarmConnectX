import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.0.36-EMERGENCY';

console.log(`🚨 EMERGENCY SERVER ${VERSION} STARTING...`);
console.log(`📁 Current directory: ${process.cwd()}`);
console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Emergency test endpoint
app.get('/emergency', (req, res) => {
  res.json({
    success: true,
    message: 'EMERGENCY SERVER IS WORKING!',
    version: VERSION,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    emergencyMode: process.env.EMERGENCY_MODE || 'false',
    forceRestart: process.env.FORCE_RESTART || 'none'
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({
    version: VERSION,
    timestamp: new Date().toISOString(),
    emergencyMode: process.env.EMERGENCY_MODE || 'false',
    message: 'EMERGENCY SERVER - Railway deployment test'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test-app', (req, res) => {
  res.json({
    success: true,
    message: 'Emergency server is working',
    version: VERSION,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    emergencyMode: process.env.EMERGENCY_MODE || 'false'
  });
});

// Static files
app.use('/assets', express.static(path.resolve(process.cwd(), 'dist/public/assets')));

// Serve index.html for all routes
app.get('*', (req, res) => {
  console.log(`[EMERGENCY-SERVER-${VERSION}] Serving index.html for: ${req.path}`);
  
  const indexPath = path.resolve(process.cwd(), 'dist/public/index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`[EMERGENCY-SERVER-${VERSION}] File exists: ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    console.log(`[EMERGENCY-SERVER-${VERSION}] File not found: ${indexPath}`);
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UniFarm Connect - Emergency Server ${VERSION}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0f0f23; color: white; }
          .success { color: #4CAF50; }
          .info { color: #2196F3; }
          .warning { color: #FF9800; }
          .emergency { color: #f44336; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>UniFarm Connect</h1>
        <p class="emergency">🚨 EMERGENCY SERVER IS WORKING!</p>
        <p class="success">✅ Version: ${VERSION}</p>
        <p class="info">Path: ${req.path}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p class="warning">Index file not found at: ${indexPath}</p>
        <p class="emergency">Emergency Mode: ${process.env.EMERGENCY_MODE || 'false'}</p>
        <p class="emergency">Force Restart: ${process.env.FORCE_RESTART || 'none'}</p>
        <p><strong>Railway должен обновиться!</strong></p>
      </body>
      </html>
    `);
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚨 EMERGENCY SERVER ${VERSION} running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Current directory: ${process.cwd()}`);
  console.log(`🔍 Looking for index.html at: ${path.resolve(process.cwd(), 'dist/public/index.html')}`);
  console.log(`📄 File exists: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public/index.html'))}`);
  console.log(`🚨 Emergency Mode: ${process.env.EMERGENCY_MODE || 'false'}`);
  console.log(`🔄 Force Restart: ${process.env.FORCE_RESTART || 'none'}`);
}); 