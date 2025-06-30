#!/usr/bin/env node

/**
 * Simple server launcher for UniFarm
 * Bypasses TypeScript compilation issues
 */

import { register } from 'tsx/esm';

// Register TypeScript support
register();

// Import and start the server
import('./server/index.ts')
  .then(() => {
    console.log('[UniFarm] Server started successfully');
  })
  .catch((error) => {
    console.error('[UniFarm] Server failed to start:', error);
    process.exit(1);
  });