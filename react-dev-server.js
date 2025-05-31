import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// API routes
app.use(express.json());

app.get('/api/v2/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: "operational",
      version: "2.0-dev",
      database: "connected",
      react: "compiled"
    }
  });
});

app.get('/api/v2/missions', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/v2/wallet', (req, res) => {
  res.json({
    success: true,
    data: { 
      balance: 0,
      address: null 
    }
  });
});

// Serve static files from client/dist
app.use(express.static(path.join(__dirname, 'client/dist')));

// For all other routes, serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

console.log('🔨 Building React application...');

// Build the React app first
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: __dirname
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ React build completed successfully');
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log('📱 React application ready');
    });
  } else {
    console.error('❌ React build failed');
    process.exit(1);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error);
  process.exit(1);
});