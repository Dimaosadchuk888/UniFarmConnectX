// Test Port Configuration for Railway
console.log('🔍 Testing Port Configuration...');

// Check environment variables
console.log('Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  HOST:', process.env.HOST);

// Test port parsing
const port = process.env.PORT || 3000;
const parsedPort = Number(port);

console.log('Port Parsing:');
console.log('  Original PORT:', port);
console.log('  Parsed PORT:', parsedPort);
console.log('  Is Number:', typeof parsedPort === 'number');
console.log('  Is Valid:', !isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536);

// Test host configuration
const host = process.env.HOST || '0.0.0.0';
console.log('Host Configuration:');
console.log('  HOST:', host);

// Railway specific checks
console.log('Railway Specific:');
console.log('  RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL);
console.log('  RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);

console.log('✅ Port configuration test completed'); 