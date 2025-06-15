/**
 * Test User Creation Script
 * Creates a test user and generates valid JWT token for immediate app access
 */

const { supabase } = require('./core/supabase');
const { generateJWTToken } = require('./utils/telegram');

async function createTestUser() {
  try {
    console.log('🔄 Creating test user...');
    
    // Generate unique test data
    const timestamp = Date.now();
    const testTelegramId = 999999999;
    const refCode = `TEST_REF_${timestamp}`;
    
    // Create test user directly in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', testTelegramId)
      .single();
    
    let user;
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.id);
      user = existingUser;
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: testTelegramId,
          username: 'test_user',
          first_name: 'Test',
          ref_code: refCode,
          balance_uni: '100',
          balance_ton: '50',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating test user:', error);
        return;
      }
      
      user = newUser;
      console.log('✅ Test user created:', user.id);
    }
    
    // Generate valid JWT token
    const telegramUser = {
      id: testTelegramId,
      username: 'test_user',
      first_name: 'Test'
    };
    
    const token = generateJWTToken(telegramUser, user.ref_code);
    
    console.log('\n🎯 Test User Data:');
    console.log('User ID:', user.id);
    console.log('Telegram ID:', user.telegram_id);
    console.log('Username:', user.username);
    console.log('Ref Code:', user.ref_code);
    console.log('JWT Token:', token);
    
    console.log('\n📋 To test the app:');
    console.log('1. Open browser console');
    console.log('2. Run: localStorage.setItem("unifarm_auth_token", "' + token + '")');
    console.log('3. Run: localStorage.setItem("unifarm_user_data", \'' + JSON.stringify(user) + '\')');
    console.log('4. Refresh the page');
    
    // Test token validation
    console.log('\n🔍 Testing token validation...');
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token validation successful:', {
        telegram_id: decoded.telegram_id,
        username: decoded.username,
        ref_code: decoded.ref_code
      });
    } catch (error) {
      console.error('❌ Token validation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };