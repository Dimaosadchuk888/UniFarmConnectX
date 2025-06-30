import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

console.log('[DebugServer] Starting minimal server...');

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('[DebugServer] Health check requested');
  res.json({ 
    status: 'ok', 
    server: 'debug',
    timestamp: new Date().toISOString() 
  });
});

// Static file serving
const staticPath = path.resolve(__dirname, 'client');
console.log(`[DebugServer] Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// Main route
app.get('/', (req, res) => {
  console.log('[DebugServer] Main route requested');
  const indexPath = path.resolve(__dirname, 'client/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[DebugServer] Error serving index.html:', err);
      res.status(404).send('Index file not found');
    }
  });
});

// Catch all other routes
app.get('*', (req, res) => {
  console.log(`[DebugServer] Catch-all route: ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('[DebugServer] Failed to start:', err);
    process.exit(1);
  }
  console.log(`[DebugServer] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[DebugServer] Health check: http://localhost:${PORT}/health`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('[DebugServer] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[DebugServer] Unhandled rejection at:', promise, 'reason:', reason);
});