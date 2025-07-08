#!/usr/bin/env node
/**
 * UniFarm Workflow Starter
 * CommonJS entry point for Replit workflows
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting UniFarm with Anti-DDoS Protection...');

// Kill any existing processes on port 3000
const killExisting = spawn('pkill', ['-f', 'node.*server'], { stdio: 'inherit' });

killExisting.on('close', () => {
  // Wait a moment for processes to cleanup
  setTimeout(() => {
    // Start the server
    const serverProcess = spawn('npm', ['start'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000'
      }
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Server startup error:', error.message);
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      console.log(`📋 Server exited with code: ${code}`);
      if (code !== 0) {
        process.exit(code);
      }
    });
  }, 2000);
});