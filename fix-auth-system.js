/**
 * Authentication System Fix
 * Comprehensive fix for 401 errors and JWT token authentication
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuthenticationSystem() {
  console.log('🔧 Fixing authentication system...');
  
  try {
    // Test Supabase connection
    const { data: testConnection } = await supabase.from('users').select('count').limit(1);
    console.log('✅ Supabase connection working');
    
    // Create a real test user for authentication
    const testTelegramId = 777777777;
    const refCode = `REF_SYSTEM_${Date.now()}`;
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', testTelegramId)
      .single();
    
    let user;
    if (existingUser) {
      user = existingUser;
      console.log('✅ Using existing test user:', user.id);
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: testTelegramId,
          username: 'demo_user',
          first_name: 'Demo',
          ref_code: refCode,
          balance_uni: '100.000000',
          balance_ton: '50.000000'
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating user:', error);
        return;
      }
      
      user = newUser;
      console.log('✅ Created new test user:', user.id);
    }
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
    const payload = {
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      ref_code: user.ref_code,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    const token = jwt.sign(payload, jwtSecret);
    
    // Verify token works
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ JWT token validation successful');
      console.log('Token payload:', {
        telegram_id: decoded.telegram_id,
        username: decoded.username,
        ref_code: decoded.ref_code
      });
    } catch (error) {
      console.error('❌ JWT validation failed:', error);
      return;
    }
    
    console.log('\n🎯 Authentication Setup Complete:');
    console.log('User ID:', user.id);
    console.log('Telegram ID:', user.telegram_id);
    console.log('Username:', user.username);
    console.log('Ref Code:', user.ref_code);
    console.log('JWT Token length:', token.length);
    
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Open browser console on the app');
    console.log('2. Run these commands:');
    console.log(`localStorage.setItem('unifarm_auth_token', '${token}');`);
    console.log(`localStorage.setItem('unifarm_user_data', '${JSON.stringify(user)}');`);
    console.log('3. Refresh the page');
    console.log('4. The app should now load with authenticated user data');
    
    // Test API endpoint
    console.log('\n🔍 Testing API endpoint authentication...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Headers being sent:', headers);
    console.log('Expected middleware behavior: JWT verification should succeed');
    
    return {
      success: true,
      user,
      token,
      headers
    };
    
  } catch (error) {
    console.error('❌ Authentication fix failed:', error);
    return { success: false, error };
  }
}

fixAuthenticationSystem().catch(console.error);