import http from 'http';

function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${path}: ${res.statusCode} - ${data.substring(0, 100)}`);
        resolve();
      });
    });
    req.on('error', (err) => {
      console.log(`${path}: ERROR - ${err.message}`);
      resolve();
    });
    req.setTimeout(3000, () => {
      console.log(`${path}: TIMEOUT`);
      req.destroy();
      resolve();
    });
  });
}

async function runTests() {
  console.log('Testing API endpoints...');
  await testEndpoint('/health');
  await testEndpoint('/api/v2/health');
  await testEndpoint('/api/v2/users/profile');
  await testEndpoint('/tonconnect-manifest.json');
  console.log('Tests completed');
}

runTests();