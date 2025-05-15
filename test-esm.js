/**
 * Test ESM module
 */
import { createRequire } from 'module';

console.log('ESM module test running');
const require = createRequire(import.meta.url);
console.log('require created successfully');

// Test require functionality on a built-in module
const fs = require('fs');
console.log('fs module loaded via require');

console.log('ESM test completed successfully');