#!/usr/bin/env node
/**
 * Working preview server for UniFarm with integrated API
 */

import { spawn } from 'child_process';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure clean startup
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

const port = process.env.PORT || 3000;
const apiPort = 3001;

// Create API server
const api = express();
api.use(cors({ origin: true, credentials: true }));
api.use(express.json());

// API endpoints
api.get('/api/v2/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

api.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      username: 'demo_user',
      balance: 12450,
      farming_active: true,
      farming_rate: 0.5,
      level: 3,
      energy: 85,
      max_energy: 100
    }
  });
});

api.get('/api/v2/daily-bonus/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: true,
      day: 1,
      reward: 100,
      next_bonus_in: 3600000
    }
  });
});

api.post('/api/v2/farming/start', (req, res) => {
  res.json({
    success: true,
    data: {
      farming_active: true,
      started_at: Date.now(),
      rate: 0.5
    }
  });
});

api.post('/api/v2/farming/claim', (req, res) => {
  res.json({
    success: true,
    data: {
      claimed_amount: 250,
      new_balance: 12700
    }
  });
});

// Start API server
api.listen(apiPort, '0.0.0.0', () => {
  console.log(`API server running on port ${apiPort}`);
});

// Start Vite with explicit port binding and allowed hosts
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', port, '--force'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  env: { 
    ...process.env, 
    FORCE_COLOR: '1',
    VITE_ALLOWED_HOSTS: 'all'
  }
});

viteProcess.on('error', (err) => {
  console.error('Vite startup failed:', err.message);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`Preview server stopped with code ${code}`);
  }
  process.exit(code);
});

console.log(`Starting UniFarm preview on port ${port}...`);