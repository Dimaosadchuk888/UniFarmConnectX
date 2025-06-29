#!/usr/bin/env node

/**
 * Proxy Server для перенаправления API запросов
 * Решает проблему с CORS и различными портами
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Проксируем API запросы на backend сервер
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true, // Поддержка WebSocket
  logLevel: 'debug'
});

// Проксируем все API endpoints
app.use('/api', apiProxy);
app.use('/webhook', apiProxy);
app.use('/health', apiProxy);
app.use('/manifest.json', apiProxy);
app.use('/tonconnect-manifest.json', apiProxy);
app.use('/ws', apiProxy);

// Все остальные запросы идут на Vite dev server
const viteProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: false
});

app.use('/', viteProxy);

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy server running at http://localhost:${PORT}`);
  console.log(`   - Frontend (Vite): http://localhost:3000`);
  console.log(`   - Backend API: http://localhost:3001`);
  console.log(`   - Access app at: http://localhost:${PORT}`);
});