#!/usr/bin/env tsx
/**
 * Диагностика конфликта User ID при валидации вывода
 * Проверяем какие пользователи существуют и их балансы
 */

import { supabase } from './core/supabase';
import { SupabaseUserRepository } from './modules/user/service';
import jwt from 'jsonwebtoken';

const userRepository = new SupabaseUserRepository();

async function checkUserIdConflict() {
  console.log('\n🔍 ДИАГНОСТИКА КОНФЛИКТА USER ID');
  console.log('='.repeat(80));
  
  const userId = 184; // ID из логов
  const testUsername = 'test_user_1752129840905'; // Username из диагностики
  
  try {
    // 1. Проверяем пользователя по ID
    console.log('\n1️⃣ ПОЛЬЗОВАТЕЛЬ ПО ID 184:');
    const userById = await userRepository.getUserById(userId);
    if (userById) {
      console.log(`   ID: ${userById.id}`);
      console.log(`   telegram_id: ${userById.telegram_id}`);
      console.log(`   username: ${userById.username}`);
      console.log(`   balance_ton: ${userById.balance_ton} TON`);
    }
    
    // 2. Проверяем пользователя по username
    console.log('\n2️⃣ ПОИСК ПО USERNAME:');
    const { data: userByUsername } = await supabase
      .from('users')
      .select('*')
      .eq('username', testUsername)
      .single();
      
    if (userByUsername) {
      console.log(`   ID: ${userByUsername.id}`);
      console.log(`   telegram_id: ${userByUsername.telegram_id}`);
      console.log(`   username: ${userByUsername.username}`);
      console.log(`   balance_ton: ${userByUsername.balance_ton} TON`);
    }
    
    // 3. Проверяем есть ли пользователи с малым балансом
    console.log('\n3️⃣ ПОЛЬЗОВАТЕЛИ С БАЛАНСОМ ≤ 0.1 TON:');
    const { data: lowBalanceUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .lte('balance_ton', 0.1)
      .limit(10);
      
    if (lowBalanceUsers && lowBalanceUsers.length > 0) {
      console.log(`   Найдено ${lowBalanceUsers.length} пользователей:`);
      lowBalanceUsers.forEach(u => {
        console.log(`   - ID: ${u.id}, telegram_id: ${u.telegram_id}, username: ${u.username}, balance: ${u.balance_ton} TON`);
      });
    }
    
    // 4. Проверяем что вернет getOrCreateUserFromTelegram
    console.log('\n4️⃣ СИМУЛЯЦИЯ getOrCreateUserFromTelegram:');
    if (userById) {
      console.log(`   Поиск по telegram_id: ${userById.telegram_id}`);
      const simulatedUser = await userRepository.getUserByTelegramId(userById.telegram_id);
      if (simulatedUser) {
        console.log(`   Найден пользователь ID: ${simulatedUser.id}, balance: ${simulatedUser.balance_ton} TON`);
      } else {
        console.log(`   ❌ Пользователь НЕ НАЙДЕН по telegram_id!`);
      }
    }
    
    // 5. Генерируем тестовый JWT токен
    console.log('\n5️⃣ АНАЛИЗ JWT ТОКЕНА:');
    if (process.env.JWT_SECRET && userById) {
      const testToken = jwt.sign({
        userId: userById.id,
        telegram_id: userById.telegram_id,
        username: userById.username
      }, process.env.JWT_SECRET);
      
      console.log(`   Тестовый JWT создан для user ID ${userById.id}`);
      
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET) as any;
      console.log(`   Декодированный JWT содержит:`);
      console.log(`   - userId: ${decoded.userId}`);
      console.log(`   - telegram_id: ${decoded.telegram_id}`);
      console.log(`   - username: ${decoded.username}`);
    }
    
    // 6. Проверяем все пользователи с похожими telegram_id
    console.log('\n6️⃣ ПРОВЕРКА ДУБЛИКАТОВ:');
    if (userById && userById.telegram_id) {
      const { data: duplicates } = await supabase
        .from('users')
        .select('id, telegram_id, username, balance_ton')
        .eq('telegram_id', userById.telegram_id);
        
      if (duplicates && duplicates.length > 1) {
        console.log(`   ⚠️ НАЙДЕНО ${duplicates.length} пользователей с одинаковым telegram_id!`);
        duplicates.forEach(u => {
          console.log(`   - ID: ${u.id}, balance: ${u.balance_ton} TON${u.id === userId ? ' (ОСНОВНОЙ)' : ''}`);
        });
      } else {
        console.log('   ✅ Дубликатов не найдено');
      }
    }
    
    // 7. Итоговый анализ
    console.log('\n7️⃣ ИТОГОВЫЙ АНАЛИЗ:');
    console.log(`   Основной пользователь (ID ${userId}) имеет баланс: ${userById?.balance_ton || '?'} TON`);
    console.log(`   При валидации вывода система видит: 0.01 TON`);
    
    if (userById && parseFloat(userById.balance_ton || '0') > 1) {
      console.log('\n❌ ПРОБЛЕМА: Разные балансы для одного пользователя!');
      console.log('   Возможные причины:');
      console.log('   1. JWT токен указывает на другого пользователя');
      console.log('   2. getOrCreateUserFromTelegram создает нового пользователя');
      console.log('   3. Есть дубликаты пользователей с одинаковым telegram_id');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkUserIdConflict();