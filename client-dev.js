/**
 * Frontend development server for UniFarm client
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Запуск frontend dev сервера...');

const clientDir = path.join(__dirname, 'client');

// Start frontend dev server
const devServer = spawn('npm', ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    VITE_API_URL: 'http://localhost:3000'
  }
});

devServer.on('error', (error) => {
  console.error('Frontend dev server error:', error);
  process.exit(1);
});

devServer.on('exit', (code) => {
  console.log(`Frontend dev server exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nОстанавливаю frontend dev server...');
  devServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nОстанавливаю frontend dev server...');
  devServer.kill('SIGTERM');
});