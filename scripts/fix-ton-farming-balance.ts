import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

/**
 * Скрипт для исправления farming_balance у пользователей TON Boost
 * Безопасно устанавливает правильные значения депозитов
 */
async function fixTonFarmingBalance() {
  logger.info('🔧 Начинаем миграцию farming_balance для TON Boost пользователей');
  
  try {
    // 1. Получаем пользователей с boost пакетами и нулевым farming_balance
    const { data: activeUsers, error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('boost_package_id', 0)
      .eq('farming_balance', 0);
      
    if (error) {
      logger.error('❌ Ошибка получения пользователей:', error);
      return;
    }
    
    logger.info(`📊 Найдено ${activeUsers?.length || 0} пользователей для миграции`);
    
    if (!activeUsers || activeUsers.length === 0) {
      logger.info('✅ Нет пользователей для миграции');
      return;
    }
    
    // Выводим список пользователей
    logger.info('📋 Список пользователей для миграции:');
    activeUsers.forEach(user => {
      logger.info(`  - User ID: ${user.user_id}, Package: ${user.boost_package_id}`);
    });
    
    // 2. Для каждого пользователя устанавливаем farming_balance
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of activeUsers) {
      try {
        // Получаем сумму из последней покупки boost пакета
        const { data: lastPurchase } = await supabase
          .from('boost_purchases')
          .select('required_amount')
          .eq('user_id', user.user_id)
          .eq('boost_type', 'TON_BOOST')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Определяем сумму депозита
        let depositAmount = 5; // По умолчанию 5 TON (минимальный пакет)
        
        if (lastPurchase?.required_amount) {
          depositAmount = parseFloat(lastPurchase.required_amount);
        } else {
          // Если нет записи о покупке, используем стандартные суммы по типу пакета
          switch (user.boost_package_id) {
            case 1: depositAmount = 5; break;     // Basic
            case 2: depositAmount = 25; break;    // Standard
            case 3: depositAmount = 50; break;    // Advanced
            case 4: depositAmount = 100; break;   // Premium
            case 5: depositAmount = 500; break;   // Elite
            default: depositAmount = 5;
          }
        }
        
        // Обновляем farming_balance
        const { error: updateError } = await supabase
          .from('ton_farming_data')
          .update({ 
            farming_balance: depositAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);
          
        if (updateError) {
          logger.error(`❌ Ошибка обновления user ${user.user_id}:`, updateError);
          errorCount++;
        } else {
          logger.info(`✅ Обновлен user ${user.user_id}: farming_balance = ${depositAmount} TON`);
          successCount++;
        }
        
      } catch (error) {
        logger.error(`❌ Ошибка обработки user ${user.user_id}:`, error);
        errorCount++;
      }
    }
    
    // 3. Итоговая статистика
    logger.info('📊 Миграция завершена:');
    logger.info(`  ✅ Успешно обновлено: ${successCount}`);
    logger.info(`  ❌ Ошибок: ${errorCount}`);
    logger.info(`  📋 Всего обработано: ${activeUsers.length}`);
    
    // 4. Проверяем результат
    const { data: checkResult } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_package_id')
      .gt('boost_package_id', 0)
      .order('user_id');
      
    logger.info('\n📋 Текущее состояние пользователей с boost пакетами:');
    checkResult?.forEach(user => {
      logger.info(`  User ${user.user_id}: ${user.farming_balance} TON (пакет ${user.boost_package_id})`);
    });
    
  } catch (error) {
    logger.error('❌ Критическая ошибка миграции:', error);
  }
}

// Запуск с подтверждением
if (process.argv.includes('--confirm')) {
  logger.info('⚠️  Запуск миграции с подтверждением...');
  fixTonFarmingBalance()
    .then(() => {
      logger.info('✅ Скрипт завершен');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Скрипт завершен с ошибкой:', error);
      process.exit(1);
    });
} else {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           МИГРАЦИЯ TON BOOST FARMING BALANCE                   ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║ Этот скрипт исправит farming_balance для пользователей         ║');
  console.log('║ с активным TON Boost, у которых farming_balance = 0            ║');
  console.log('║                                                                ║');
  console.log('║ Для запуска используйте:                                       ║');
  console.log('║   npm run fix-ton-balance -- --confirm                        ║');
  console.log('║                                                                ║');
  console.log('║ Или напрямую:                                                  ║');
  console.log('║   tsx scripts/fix-ton-farming-balance.ts --confirm            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
}