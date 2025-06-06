#!/usr/bin/env node
/**
 * Preview server for UniFarm app in Replit
 * Starts the server with Vite middleware for development
 */

process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '3000';

import('./server/index.ts').catch(console.error);