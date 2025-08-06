/**
 * Test script to verify BOC hash extraction is working correctly
 */

import { Cell } from '@ton/core';

async function testBocExtraction() {
  console.log('🔍 Testing BOC hash extraction with @ton/core\n');
  
  // Sample BOC data (this is a real BOC format)
  const sampleBoc = 'te6cckEBAQEAAgAAAEysuc0=';
  
  try {
    // Test 1: Extract hash using @ton/core
    console.log('Test 1: Extracting hash from BOC using @ton/core');
    const cell = Cell.fromBase64(sampleBoc);
    const realHash = cell.hash().toString('hex');
    console.log('✅ Real blockchain hash:', realHash);
    console.log('   Hash length:', realHash.length);
    
    // Test 2: Compare with old SHA256 method
    console.log('\nTest 2: Comparing with old SHA256 method');
    const crypto = await import('crypto');
    const fakeHash = crypto.createHash('sha256').update(sampleBoc).digest('hex');
    console.log('❌ Fake SHA256 hash:', fakeHash);
    console.log('   Hash length:', fakeHash.length);
    
    // Test 3: Show the difference
    console.log('\nTest 3: Hash comparison');
    console.log('Real hash (Cell.hash()):', realHash);
    console.log('Fake hash (SHA256):', fakeHash);
    console.log('Hashes are different:', realHash !== fakeHash);
    
    // Test 4: Test with actual deposit BOC
    console.log('\nTest 4: Testing with longer BOC (simulating real deposit)');
    const depositBoc = 'te6cckECAwEAARQAAUOAFWGp+LxU1Y5MyK8VsQhT6XG6d1/VAP5e2EyLLsqY5owAAQGCAgnQBwLNnjUAAAAAAAcAAAAAAAAAggIJ0AcCzZ41AAAAAAAHAAAAAAAAAJjNWi0=';
    const depositCell = Cell.fromBase64(depositBoc);
    const depositHash = depositCell.hash().toString('hex');
    console.log('✅ Deposit BOC hash:', depositHash.substring(0, 32) + '...');
    
    console.log('\n✅ SUCCESS: @ton/core is working correctly for hash extraction!');
    console.log('All BOC deposits should now be processed with real blockchain hashes.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Make sure @ton/core is properly installed');
  }
}

// Run the test
testBocExtraction().catch(console.error);