#!/usr/bin/env node

/**
 * Debug JWT Validation Script
 * Детальная диагностика проблемы с validateToken в AuthService
 */

const jwt = require('jsonwebtoken');

// JWT токен пользователя 184 (действующий)
const REAL_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTg0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwiZmlyc3RfbmFtZSI6IlRlc3QiLCJyZWZfY29kZSI6IlJFRl8xNzUyNzU1ODM1MzU4X3lqcnVzdiIsImV4cCI6MTc1MzM4Nzc2M30.Ol2PzFM6K6pvhvDzqiZ4RK2ZnKzXKNhJnj6wkqTaR5g';

// Загружаем переменные окружения
require('dotenv').config();

function debugJWTValidation() {
  console.log('🔍 Debug JWT Validation');
  console.log('=======================');
  
  console.log('\n1️⃣ Environment Check:');
  const jwtSecret = process.env.JWT_SECRET;
  console.log(`JWT_SECRET exists: ${!!jwtSecret}`);
  console.log(`JWT_SECRET length: ${jwtSecret ? jwtSecret.length : 0}`);
  console.log(`JWT_SECRET first 10 chars: ${jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'N/A'}`);
  
  console.log('\n2️⃣ Token Structure:');
  const parts = REAL_JWT.split('.');
  console.log(`Token parts: ${parts.length}`);
  console.log(`Header length: ${parts[0] ? parts[0].length : 0}`);
  console.log(`Payload length: ${parts[1] ? parts[1].length : 0}`);
  console.log(`Signature length: ${parts[2] ? parts[2].length : 0}`);
  
  // Decode header
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    console.log(`Header: ${JSON.stringify(header)}`);
  } catch (error) {
    console.log(`Header decode error: ${error.message}`);
  }
  
  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Check expiry
    const expiry = new Date(payload.exp * 1000);
    const now = new Date();
    console.log(`Token expires: ${expiry.toISOString()}`);
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Is expired: ${now > expiry}`);
    console.log(`Time left: ${Math.floor((expiry - now) / (1000 * 60 * 60))} hours`);
  } catch (error) {
    console.log(`Payload decode error: ${error.message}`);
  }
  
  console.log('\n3️⃣ JWT Verification Test:');
  
  if (!jwtSecret) {
    console.log('❌ Cannot test verification - JWT_SECRET missing');
    return;
  }
  
  try {
    const verifiedPayload = jwt.verify(REAL_JWT, jwtSecret);
    console.log('✅ JWT Verification SUCCESS');
    console.log('Verified payload:', JSON.stringify(verifiedPayload, null, 2));
    
    // Check payload structure matches expected JWTPayload interface
    const expectedFields = ['id', 'telegram_id', 'username', 'ref_code', 'exp'];
    const missingFields = expectedFields.filter(field => !(field in verifiedPayload));
    
    if (missingFields.length > 0) {
      console.log(`⚠️ Missing expected fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ All expected fields present');
    }
    
  } catch (error) {
    console.log('❌ JWT Verification FAILED');
    console.log(`Error: ${error.message}`);
    console.log(`Error type: ${error.constructor.name}`);
    console.log(`Error code: ${error.code || 'N/A'}`);
    
    // Common JWT errors
    if (error.message.includes('expired')) {
      console.log('💡 Token is expired');
    } else if (error.message.includes('signature')) {
      console.log('💡 Invalid signature - wrong JWT_SECRET?');
    } else if (error.message.includes('malformed')) {
      console.log('💡 Token is malformed');
    }
  }
  
  console.log('\n4️⃣ Manual verifyJWTToken simulation:');
  
  function simulateVerifyJWTToken(token) {
    try {
      if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable not set');
      }
      
      const payload = jwt.verify(token, jwtSecret);
      console.log('✅ simulateVerifyJWTToken SUCCESS');
      console.log('Returned payload:', JSON.stringify(payload, null, 2));
      return payload;
    } catch (error) {
      console.log('❌ simulateVerifyJWTToken FAILED');
      console.log('Error:', error.message);
      return null;
    }
  }
  
  const result = simulateVerifyJWTToken(REAL_JWT);
  console.log(`\nFunction returns: ${result ? 'valid payload' : 'null'}`);
  
  if (result === null) {
    console.log('\n💥 This explains why AuthService.validateToken fails!');
    console.log('The verifyJWTToken function is returning null, causing 401 error');
  } else {
    console.log('\n🤔 verifyJWTToken works fine - issue must be elsewhere');
  }
}

debugJWTValidation();