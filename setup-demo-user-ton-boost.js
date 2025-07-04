/**
 * Настройка демонстрационного пользователя с активным TON Boost
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wunnsvicbebssrjqedor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupDemoUserTonBoost() {
  try {
    console.log('🚀 Настройка демонстрационного пользователя с TON Boost...\n');
    
    // Проверяем пользователя 48
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();
      
    if (userError) {
      console.log('❌ Пользователь 48 не найден:', userError.message);
      return;
    }
    
    console.log('👤 Найден пользователь:', {
      id: user.id,
      username: user.username,
      balance_ton: user.balance_ton,
      ton_boost_package: user.ton_boost_package
    });
    
    // Если у пользователя есть TON баланс больше 10, активируем Boost
    const tonBalance = parseFloat(user.balance_ton || '0');
    
    if (tonBalance >= 10) {
      console.log(`✅ TON баланс достаточный: ${tonBalance} TON`);
      
      // Активируем Standard Boost (package_id = 2, 1.5% в день)
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ton_boost_package: 2,
          ton_farming_start_timestamp: new Date().toISOString()
        })
        .eq('id', 48)
        .select()
        .single();
        
      if (updateError) {
        console.log('❌ Ошибка активации Boost:', updateError.message);
        return;
      }
      
      console.log('🎯 TON Boost активирован:');
      console.log('- Пакет: Standard Boost (1.5% в день)');
      console.log('- Дата активации:', updatedUser.ton_farming_start_timestamp);
      console.log('- Пользователь готов для тестирования');
      
    } else {
      console.log(`⚠️ Недостаточно TON для активации Boost: ${tonBalance} TON (требуется >= 10)`);
      
      // Добавляем TON баланс
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          balance_ton: '100.0',
          ton_boost_package: 2,
          ton_farming_start_timestamp: new Date().toISOString()
        })
        .eq('id', 48)
        .select()
        .single();
        
      if (updateError) {
        console.log('❌ Ошибка обновления пользователя:', updateError.message);
        return;
      }
      
      console.log('💰 TON баланс пополнен и Boost активирован:');
      console.log('- Новый баланс: 100 TON');
      console.log('- Пакет: Standard Boost (1.5% в день)');
      console.log('- Дата активации:', updatedUser.ton_farming_start_timestamp);
    }
    
    console.log('\n✅ Демонстрационный пользователь готов для тестирования TON Boost!');
    
  } catch (error) {
    console.error('🚫 Ошибка настройки:', error.message);
  }
}

setupDemoUserTonBoost();