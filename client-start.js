/**
 * Frontend development server for UniFarm client
 */

const { spawn } = require('child_process');
const path = require('path');

async function startClientDev() {
  try {
    console.log('Starting UniFarm client development server...');
    
    const clientPath = path.join(__dirname, 'client');
    
    const devProcess = spawn('npm', ['run', 'dev'], {
      cwd: clientPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    devProcess.on('error', (error) => {
      console.error('Failed to start client dev server:', error);
      process.exit(1);
    });

    devProcess.on('close', (code) => {
      console.log(`Client dev server exited with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    console.error('Error starting client dev server:', error);
    process.exit(1);
  }
}

startClientDev();