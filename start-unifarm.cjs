#!/usr/bin/env node

/**
 * UniFarm Complete Development Environment Starter
 * Запускает frontend (Vite) и backend серверы с правильной конфигурацией
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Запуск UniFarm Development Environment...\n');

// Проверяем наличие необходимых файлов
if (!fs.existsSync('dist/public/index.html')) {
  console.log('📦 Создание базовых файлов...');
  const { execSync } = require('child_process');
  execSync('node quick-build.cjs', { stdio: 'inherit' });
}

// Функция для запуска процесса с логированием
function startProcess(name, command, args, env = {}) {
  console.log(`🔧 Запуск ${name}...`);
  
  const proc = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: 'pipe',
    shell: true
  });

  // Логирование вывода
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.includes('ready in') || line.includes('running at') || line.includes('запущен')) {
        console.log(`✅ [${name}] ${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error && !error.includes('ExperimentalWarning')) {
      console.error(`❌ [${name}] ${error}`);
    }
  });

  proc.on('error', (error) => {
    console.error(`❌ [${name}] Ошибка запуска:`, error.message);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️  [${name}] Завершился с кодом ${code}`);
    }
  });

  return proc;
}

// Запускаем backend на порту 3001
const backend = startProcess(
  'Backend API',
  'npx',
  ['tsx', 'server/index.ts'],
  {
    PORT: '3001',
    NODE_ENV: 'development',
    HOST: '0.0.0.0',
    BYPASS_AUTH: 'true'
  }
);

// Даем backend время на запуск
setTimeout(() => {
  // Запускаем Vite dev server с прокси на backend
  console.log('\n📱 Запуск Frontend (Vite)...');
  
  // Создаем временный конфиг для Vite с прокси
  const viteConfigContent = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(process.cwd(), 'client'),
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/webhook': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true
      },
      '/manifest.json': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/tonconnect-manifest.json': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
  }
});
`;

  // Сохраняем временный конфиг
  fs.writeFileSync('vite.config.temp.mjs', viteConfigContent);
  
  const vite = startProcess(
    'Vite Frontend',
    'npx',
    ['vite', '--config', 'vite.config.temp.mjs', '--host', '0.0.0.0', '--port', '3000']
  );

  // Ждем запуска Vite
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ UniFarm Development Environment запущен!\n');
    console.log('🌐 Приложение доступно по адресу: http://localhost:3000');
    console.log('📡 API endpoints: http://localhost:3001/api/v2/');
    console.log('🔍 Health check: http://localhost:3001/health\n');
    console.log('💡 Подсказки:');
    console.log('   - Frontend автоматически перезагружается при изменении файлов');
    console.log('   - API запросы проксируются с :3000 на :3001');
    console.log('   - WebSocket соединения работают через /ws');
    console.log('   - Для остановки нажмите Ctrl+C\n');
    console.log('='.repeat(60) + '\n');
  }, 3000);

  // Обработка завершения
  const cleanup = () => {
    console.log('\n🛑 Остановка серверов...');
    
    // Удаляем временный конфиг
    if (fs.existsSync('vite.config.temp.mjs')) {
      fs.unlinkSync('vite.config.temp.mjs');
    }
    
    backend.kill();
    vite.kill();
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  
}, 2000);