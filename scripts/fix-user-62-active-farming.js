import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function fixUserFarmingStatus() {
  console.log('[FixUserFarming] Исправляем статус фарминга для пользователя 62...\n');

  try {
    // Получаем текущие данные пользователя
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 62)
      .single();

    if (fetchError) {
      console.error('[ERROR] Ошибка получения пользователя:', fetchError);
      return;
    }

    console.log('📊 Текущие данные пользователя 62:');
    console.log(`  ID: ${userData.id}`);
    console.log(`  Username: ${userData.username}`);
    console.log(`  UNI Balance: ${userData.balance_uni}`);
    console.log(`  UNI Deposit: ${userData.uni_deposit_amount}`);
    console.log(`  UNI Farming Active: ${userData.uni_farming_active} ❌`);
    console.log(`  UNI Farming Rate: ${userData.uni_farming_rate}`);
    console.log(`  Last Update: ${userData.uni_farming_last_update}`);

    // Активируем фарминг
    console.log('\n✅ Активируем фарминг...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        uni_farming_active: true,
        uni_farming_last_update: new Date().toISOString()
      })
      .eq('id', 62)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Ошибка обновления:', updateError);
      return;
    }

    console.log('\n🎉 Фарминг успешно активирован!');
    console.log(`  UNI Farming Active: ${updateData.uni_farming_active} ✅`);
    console.log(`  Last Update: ${updateData.uni_farming_last_update}`);

    // Проверяем результат
    console.log('\n🔍 Проверяем API статус фарминга...');
    
    const farmingStatus = await fetch(`${process.env.APP_DOMAIN}/api/v2/uni-farming/status?user_id=62`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6MTIzNDU2NzgxMCwidXNlcm5hbWUiOiJ0ZXN0dXNlcjYyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDA0Nzk4MzMzNl9qc21hZiIsImlhdCI6MTcyMDUzODA0NywiZXhwIjoxNzUyMDk2MDQ3fQ.O51h7qr6UHHzQa9YEsrBvXqJZ9P5yb6FKGqQ_AKU0K4'}`
      }
    });

    if (farmingStatus.ok) {
      const data = await farmingStatus.json();
      console.log('  API Response:', JSON.stringify(data.data, null, 2));
    }

  } catch (error) {
    console.error('[ERROR] Общая ошибка:', error);
  }
}

// Запускаем исправление
fixUserFarmingStatus();