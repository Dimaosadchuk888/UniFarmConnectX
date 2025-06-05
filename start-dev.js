#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Starting UniFarm development server...');

const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

devServer.on('error', (error) => {
  console.error('Failed to start server:', error);
});

devServer.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});