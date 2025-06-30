const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('[SimpleServer] Starting UniFarm test server...');

// Basic middleware
app.use(express.json());
app.use(express.static('dist'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'simple' });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  console.log(`[SimpleServer] Request: ${req.path}`);
  res.sendFile(path.resolve('dist/public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SimpleServer] Server running on port ${PORT}`);
});