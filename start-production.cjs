#!/usr/bin/env node

/**
 * Production Server for UniFarm
 * Serves only static files from dist/ without any development middleware
 */

const express = require('express');
const path = require('path');
const { createServer } = require('http');

console.log('🚀 Starting UniFarm Production Server...\n');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist/public
const publicPath = path.join(__dirname, 'dist/public');
console.log(`📁 Serving static files from: ${publicPath}`);

app.use(express.static(publicPath, {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// API proxy to backend (if backend is running separately)
app.use('/api', (req, res) => {
  res.status(503).json({ 
    error: 'Backend service not available',
    message: 'Please start the backend server separately'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'production' });
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ UniFarm Production Server Started\n');
  console.log(`🌐 Application: http://localhost:${PORT}`);
  console.log(`📁 Static files: ${publicPath}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
  console.log('Note: This serves only the frontend. Start the backend separately if needed.');
});