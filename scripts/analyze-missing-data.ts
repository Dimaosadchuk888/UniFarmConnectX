import { supabase } from '../core/supabase.js';

async function analyzeMissingData() {
  console.log('🔍 АНАЛИЗ НЕДОСТАЮЩИХ ДАННЫХ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Анализ uni_farming_data
    console.log('📊 UNI_FARMING_DATA - данные которых нет в USERS:\n');

    const { data: uniFarmingOnly } = await supabase.rpc('get_uni_farming_only_data', {});
    
    // Альтернативный способ через JavaScript
    const { data: allUniFarming } = await supabase
      .from('uni_farming_data')
      .select('*')
      .order('user_id');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_balance')
      .order('id');

    if (allUniFarming && allUsers) {
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      let missingCount = 0;
      let valuableData = [];

      allUniFarming.forEach(farming => {
        const user = userMap.get(farming.user_id);
        
        // Проверяем есть ли важные данные которых нет в users
        if (!user || 
            (farming.deposit_amount > 0 && user.uni_deposit_amount === 0) ||
            (farming.farming_balance > 0 && user.uni_farming_balance === 0)) {
          
          missingCount++;
          if (farming.deposit_amount > 0 || farming.farming_balance > 0) {
            valuableData.push({
              user_id: farming.user_id,
              deposit_amount: farming.deposit_amount,
              farming_balance: farming.farming_balance,
              is_active: farming.is_active
            });
          }
        }
      });

      console.log(`Всего записей только в uni_farming_data: ${missingCount}`);
      console.log(`Из них с ценными данными (deposit > 0 или balance > 0): ${valuableData.length}`);
      
      if (valuableData.length > 0) {
        console.log('\nЦенные данные для переноса:');
        valuableData.slice(0, 10).forEach(d => {
          console.log(`- User ${d.user_id}: deposit=${d.deposit_amount}, balance=${d.farming_balance}`);
        });
        if (valuableData.length > 10) {
          console.log(`... и еще ${valuableData.length - 10} записей`);
        }
      }
    }

    // 2. Анализ ton_farming_data
    console.log('\n\n📊 TON_FARMING_DATA - данные которых нет в USERS:\n');

    const { data: allTonFarming } = await supabase
      .from('ton_farming_data')
      .select('*')
      .order('user_id');

    const { data: tonUsers } = await supabase
      .from('users')
      .select('id, ton_wallet_address, ton_farming_balance, ton_boost_package')
      .order('id');

    if (allTonFarming && tonUsers) {
      const tonUserMap = new Map(tonUsers.map(u => [u.id, u]));
      let tonMissingCount = 0;
      let tonValuableData = [];

      allTonFarming.forEach(farming => {
        const user = tonUserMap.get(farming.user_id);
        
        if (!user || 
            (farming.wallet_address && !user.ton_wallet_address) ||
            (farming.balance > 0 && user.ton_farming_balance === 0) ||
            (farming.boost_package_id > 0 && !user.ton_boost_package)) {
          
          tonMissingCount++;
          tonValuableData.push({
            user_id: farming.user_id,
            wallet_address: farming.wallet_address,
            balance: farming.balance,
            farming_balance: farming.farming_balance,
            boost_package_id: farming.boost_package_id
          });
        }
      });

      console.log(`Всего записей с данными в ton_farming_data: ${allTonFarming.length}`);
      console.log(`Из них с уникальными/недостающими данными: ${tonValuableData.length}`);
      
      if (tonValuableData.length > 0) {
        console.log('\nДанные для проверки:');
        tonValuableData.slice(0, 10).forEach(d => {
          console.log(`- User ${d.user_id}: wallet=${d.wallet_address ? 'есть' : 'нет'}, balance=${d.balance}, boost=${d.boost_package_id}`);
        });
      }
    }

    // 3. Итоговые рекомендации
    console.log('\n\n✅ РЕКОМЕНДАЦИИ:\n');
    console.log('1. Перенести недостающие данные из старых таблиц в users');
    console.log('2. Создать SQL Views для обратной совместимости');
    console.log('3. Обновить код boost/service.ts для работы с users');
    console.log('4. После проверки архивировать старые таблицы');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Анализирую недостающие данные...\n');
analyzeMissingData();