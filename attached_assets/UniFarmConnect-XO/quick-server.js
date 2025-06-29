#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Статические файлы
app.use(express.static(path.join(__dirname, 'client/dist')));

// API routes - базовые для демонстрации
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server running with scroll fixes' });
});

// Все остальные запросы - отправляем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server with scroll fixes running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Frontend: http://0.0.0.0:${PORT}/`);
});

module.exports = app;