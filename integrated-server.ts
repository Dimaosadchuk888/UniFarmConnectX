#!/usr/bin/env tsx
/**
 * Integrated UniFarm Server
 * Combines frontend and backend in a single process
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { setupVite, serveStatic } from './server/vite';
import { config, logger } from './core';

async function startIntegratedServer() {
  try {
    const app = express();

    // CORS configuration
    app.use(cors({
      origin: true,
      credentials: true
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check endpoints
    app.get('/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // API v2 routes
    const apiPrefix = '/api/v2';
    
    app.get(`${apiPrefix}/health`, (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // Mock user data endpoint for development
    app.get(`${apiPrefix}/user/profile`, (req: any, res: any) => {
      const userData = {
        user_id: 'user_' + Date.now(),
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        guest_id: 'guest_' + Date.now(),
        balance_uni: '1000',
        balance_ton: '5',
        uni_farming_balance: '250',
        uni_farming_rate: '0.5',
        uni_deposit_amount: '500'
      };

      res.json({
        success: true,
        data: userData
      });
    });

    // TON Connect manifest
    app.get('/tonconnect-manifest.json', (req: any, res: any) => {
      res.json({
        url: 'https://unifarm.example.com',
        name: "UniFarm",
        iconUrl: "https://unifarm.example.com/logo.png",
        termsOfUseUrl: "https://unifarm.example.com/terms",
        privacyPolicyUrl: "https://unifarm.example.com/privacy"
      });
    });

    // Error handling middleware
    app.use((req: any, res: any, next: any) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    app.use((error: any, req: any, res: any, next: any) => {
      logger.error('Server error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Create HTTP server
    const server = createServer(app);

    // Setup Vite middleware for development or static files for production
    if (config.app.nodeEnv === 'development') {
      console.log('🔧 Setting up Vite development middleware...');
      await setupVite(app, server);
    } else {
      console.log('📦 Serving static files...');
      serveStatic(app);
    }

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    server.listen(port, '0.0.0.0', () => {
      console.log('🚀 UniFarm интегрированный сервер запущен на порту', port);
      console.log('🌐 API:', `http://localhost:${port}/api`);
      console.log('🎯 Приложение:', `http://localhost:${port}`);
      console.log('🔧 Environment:', config.app.nodeEnv);
      console.log('📦 API Version:', config.app.apiVersion);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 Получен SIGTERM, выполняем graceful shutdown...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 Получен SIGINT, выполняем graceful shutdown...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });

  } catch (error: any) {
    logger.error('❌ Ошибка запуска интегрированного сервера:', error);
    process.exit(1);
  }
}

// Start the integrated server
startIntegratedServer();