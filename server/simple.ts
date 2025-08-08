import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Test endpoint
app.get('/test-app', (req, res) => {
  res.json({
    success: true,
    message: 'Simple server is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Static files
app.use('/assets', express.static(path.resolve(process.cwd(), 'dist/public/assets')));

// Serve index.html for all routes
app.get('*', (req, res) => {
  console.log(`[SIMPLE-SERVER] Serving index.html for: ${req.path}`);
  
  const indexPath = path.resolve(process.cwd(), 'dist/public/index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`[SIMPLE-SERVER] File exists: ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    console.log(`[SIMPLE-SERVER] File not found: ${indexPath}`);
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UniFarm Connect - Simple Server</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0f0f23; color: white; }
          .success { color: #4CAF50; }
          .info { color: #2196F3; }
        </style>
      </head>
      <body>
        <h1>UniFarm Connect</h1>
        <p class="success">✅ Simple server is working!</p>
        <p class="info">Path: ${req.path}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Index file not found at: ${indexPath}</p>
      </body>
      </html>
    `);
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Simple server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Current directory: ${process.cwd()}`);
  console.log(`🔍 Looking for index.html at: ${path.resolve(process.cwd(), 'dist/public/index.html')}`);
  console.log(`📄 File exists: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public/index.html'))}`);
}); 