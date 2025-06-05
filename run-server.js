const { spawn } = require('child_process');

const server = spawn('tsx', ['server/index.ts'], {
  env: { ...process.env, PORT: '3000' },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('UniFarm server starting on port 3000...');