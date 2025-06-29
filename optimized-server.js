#!/usr/bin/env node

/**
 * Optimized Production Server for UniFarm
 * Reduced memory footprint and improved performance
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate critical environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v2-optimized',
    environment: process.env.NODE_ENV || 'production'
  });
});

// API health check
app.get('/api/v2/health', (req, res) => {
  res.json({
    status: 'ok',
    api_version: 'v2',
    timestamp: new Date().toISOString()
  });
});

// Simple database check endpoint
app.get('/api/v2/database/check', async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Telegram webhook
app.post('/webhook', (req, res) => {
  console.log('📨 Telegram webhook received:', req.body);
  res.sendStatus(200);
});

// Static files - serve from dist/public
const publicPath = path.join(__dirname, 'dist', 'public');
app.use(express.static(publicPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  etag: true
}));

// Serve manifest.json
app.get('/manifest.json', (req, res) => {
  res.json({
    name: "UniFarm",
    short_name: "UniFarm",
    description: "Advanced crypto farming platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f23",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  });
});

// TON Connect manifest
app.get('/tonconnect-manifest.json', (req, res) => {
  res.json({
    url: process.env.VITE_APP_URL || "https://unifarm.app",
    name: "UniFarm",
    iconUrl: `${process.env.VITE_APP_URL || "https://unifarm.app"}/logo.png`,
    termsOfUseUrl: `${process.env.VITE_APP_URL || "https://unifarm.app"}/terms`,
    privacyPolicyUrl: `${process.env.VITE_APP_URL || "https://unifarm.app"}/privacy`
  });
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 UniFarm Optimized Server Started
===================================
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'production'}
API: http://localhost:${PORT}/api/v2/health
Health: http://localhost:${PORT}/health
Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

✅ Ready for production deployment
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});