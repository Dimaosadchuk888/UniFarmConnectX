#!/usr/bin/env tsx
/**
 * Проверка наличия полей TON кошелька в таблице users
 */

import { supabase } from '../core/supabase';

async function checkTonWalletFields() {
  console.log('=== ПРОВЕРКА ПОЛЕЙ TON КОШЕЛЬКА В БД ===\n');
  
  try {
    // 1. Получаем любого пользователя для проверки структуры
    const { data: sampleUser, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
      
    if (error) {
      console.error('❌ Ошибка при получении пользователя:', error.message);
      return;
    }
    
    console.log('📋 Проверка полей в таблице users:\n');
    
    // Проверяем наличие полей TON кошелька
    const tonWalletFields = [
      'ton_wallet_address',
      'ton_wallet_verified', 
      'ton_wallet_linked_at'
    ];
    
    const existingFields: string[] = [];
    const missingFields: string[] = [];
    
    tonWalletFields.forEach(field => {
      if (field in sampleUser) {
        existingFields.push(field);
        console.log(`✅ ${field} - СУЩЕСТВУЕТ`);
      } else {
        missingFields.push(field);
        console.log(`❌ ${field} - ОТСУТСТВУЕТ`);
      }
    });
    
    console.log('\n📊 ИТОГО:');
    console.log(`- Существующих полей: ${existingFields.length}`);
    console.log(`- Отсутствующих полей: ${missingFields.length}`);
    
    // 2. Проверяем пользователей с заполненными TON адресами
    if (existingFields.includes('ton_wallet_address')) {
      const { data: tonUsers, error: tonError } = await supabase
        .from('users')
        .select('id, username, ton_wallet_address, ton_wallet_verified')
        .not('ton_wallet_address', 'is', null)
        .limit(10);
        
      if (!tonError && tonUsers) {
        console.log(`\n👥 Пользователей с TON адресами: ${tonUsers.length}`);
        tonUsers.forEach(user => {
          console.log(`- User ${user.id}: ${user.ton_wallet_address} (verified: ${user.ton_wallet_verified || false})`);
        });
      }
    }
    
    // 3. SQL команда для добавления отсутствующих полей
    if (missingFields.length > 0) {
      console.log('\n⚠️ SQL ДЛЯ ДОБАВЛЕНИЯ ОТСУТСТВУЮЩИХ ПОЛЕЙ:');
      console.log('```sql');
      missingFields.forEach(field => {
        if (field === 'ton_wallet_address') {
          console.log(`ALTER TABLE users ADD COLUMN ${field} TEXT;`);
        } else if (field === 'ton_wallet_verified') {
          console.log(`ALTER TABLE users ADD COLUMN ${field} BOOLEAN DEFAULT FALSE;`);
        } else if (field === 'ton_wallet_linked_at') {
          console.log(`ALTER TABLE users ADD COLUMN ${field} TIMESTAMP;`);
        }
      });
      console.log('```');
    }
    
    // 4. Проверка API endpoint для сохранения адреса
    console.log('\n🔗 Проверка API endpoints:');
    console.log('- POST /api/v2/wallet/connect-ton - для сохранения адреса кошелька');
    console.log('- POST /api/v2/wallet/save-ton-address - альтернативный endpoint');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkTonWalletFields()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Ошибка выполнения:', error);
    process.exit(1);
  });