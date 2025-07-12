#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function analyzeJWTFlow() {
  console.log('=== АНАЛИЗ JWT И ТРАНЗАКЦИЙ ===\n');
  
  console.log('1. JWT PAYLOAD (из client/src/main.tsx):');
  console.log('   {');
  console.log('     id: 74,               // user_id из БД');
  console.log('     userId: 74,           // дублирует id');
  console.log('     telegram_id: 999489,  // настоящий telegram_id');
  console.log('     username: "test_user_1752129840905"');
  console.log('   }\n');
  
  console.log('2. ПРОБЛЕМА В telegramAuth.ts:');
  console.log('   Строка 66: const decoded = jwt.verify(token, jwtSecret)');
  console.log('   Строка 69: const userId = decoded.userId || decoded.user_id');
  console.log('   Строка 70: const telegramId = decoded.telegram_id || decoded.telegramId\n');
  
  console.log('3. КРИТИЧЕСКАЯ ОШИБКА В transactions/controller.ts:');
  console.log('   const telegram = this.validateTelegramAuth(req, res);');
  console.log('   // telegram.user.id = 74 (это userId, НЕ telegram_id!)');
  console.log('   const user = await userRepository.getUserByTelegramId(telegram.user.id);');
  console.log('   // ❌ Ищет пользователя с telegram_id = 74\n');
  
  console.log('4. ЦЕПОЧКА ОШИБКИ:');
  console.log('   JWT: userId=74, telegram_id=999489');
  console.log('   ↓');
  console.log('   telegramAuth: req.telegram.user.id = 74 (берет userId)');
  console.log('   ↓');
  console.log('   controller: getUserByTelegramId(74)');
  console.log('   ↓');
  console.log('   БД: находит User 77 (у которого telegram_id=74)');
  console.log('   ↓');
  console.log('   Возвращает транзакции User 77\n');
  
  console.log('5. КОРРЕКТНАЯ ЛОГИКА ДОЛЖНА БЫТЬ:');
  console.log('   const telegram = this.validateTelegramAuth(req, res);');
  console.log('   const userId = telegram.user.id; // 74');
  console.log('   const user = await userRepository.getUserById(userId);');
  console.log('   // ✅ Ищет пользователя с id = 74');
}

analyzeJWTFlow().catch(console.error);
