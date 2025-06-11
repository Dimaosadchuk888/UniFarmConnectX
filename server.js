// DEPRECATED: Alternative server entry point
// Use server/index.ts as the main server entry point
// This file is kept for reference but should not be used

/*
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'attached_assets')));

// For all routes, serve the HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm запущен на http://localhost:${PORT}`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Остановка сервера...');
  process.exit(0);
});
*/

process.on('SIGTERM', () => {
  console.log('Остановка сервера...');
  process.exit(0);
});