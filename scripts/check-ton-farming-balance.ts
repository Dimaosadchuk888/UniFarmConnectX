import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

/**
 * Скрипт для проверки текущего состояния farming_balance пользователей TON Boost
 */
async function checkTonFarmingBalance() {
  logger.info('🔍 Проверка текущего состояния TON Boost пользователей');
  
  try {
    // 1. Получаем всех пользователей из ton_farming_data
    const { data: allUsers, error: allError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .order('user_id');
      
    if (allError) {
      logger.error('❌ Ошибка получения данных:', allError);
      return;
    }
    
    logger.info(`\n📊 Всего записей в ton_farming_data: ${allUsers?.length || 0}`);
    
    // 2. Фильтруем активных пользователей
    const activeUsers = allUsers?.filter(u => u.is_active) || [];
    const inactiveUsers = allUsers?.filter(u => !u.is_active) || [];
    const usersWithPackage = allUsers?.filter(u => u.boost_package_id > 0) || [];
    
    logger.info(`✅ Активных пользователей (is_active=true): ${activeUsers.length}`);
    logger.info(`❌ Неактивных пользователей (is_active=false): ${inactiveUsers.length}`);
    logger.info(`📦 Пользователей с boost пакетами: ${usersWithPackage.length}`);
    
    // 3. Анализируем пользователей с пакетами (независимо от is_active)
    const packageUsersWithZeroBalance = usersWithPackage.filter(u => u.farming_balance === 0 || u.farming_balance === null);
    const packageUsersWithBalance = usersWithPackage.filter(u => u.farming_balance > 0);
    
    logger.info(`\n📊 Анализ пользователей с boost пакетами:`);
    logger.info(`  - С нулевым farming_balance: ${packageUsersWithZeroBalance.length}`);
    logger.info(`  - С положительным farming_balance: ${packageUsersWithBalance.length}`);
    
    // 4. Детальная информация о пользователях с нулевым балансом
    if (packageUsersWithZeroBalance.length > 0) {
      logger.info(`\n⚠️  Пользователи с нулевым farming_balance (требуют исправления):`);
      for (const user of packageUsersWithZeroBalance) {
        // Проверяем наличие покупки
        const { data: purchase } = await supabase
          .from('boost_purchases')
          .select('required_amount, created_at')
          .eq('user_id', user.user_id)
          .eq('boost_type', 'TON_BOOST')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        logger.info(`  User ${user.user_id}:`);
        logger.info(`    - Package ID: ${user.boost_package_id}`);
        logger.info(`    - Farming balance: ${user.farming_balance || 0} TON`);
        logger.info(`    - Last purchase: ${purchase ? `${purchase.required_amount} TON (${purchase.created_at})` : 'Нет записи'}`);
      }
    }
    
    // 5. Информация о пользователях с балансом
    if (packageUsersWithBalance.length > 0) {
      logger.info(`\n✅ Пользователи с корректным farming_balance:`);
      for (const user of packageUsersWithBalance) {
        logger.info(`  User ${user.user_id}: ${user.farming_balance} TON (пакет ${user.boost_package_id})`);
      }
    }
    
    // 6. Проверяем общую статистику
    const totalFarmingBalance = usersWithPackage.reduce((sum, u) => sum + (u.farming_balance || 0), 0);
    const avgFarmingBalance = usersWithPackage.length > 0 ? totalFarmingBalance / usersWithPackage.length : 0;
    
    logger.info(`\n📊 Общая статистика:`);
    logger.info(`  - Общий farming_balance: ${totalFarmingBalance.toFixed(2)} TON`);
    logger.info(`  - Средний farming_balance: ${avgFarmingBalance.toFixed(2)} TON`);
    
    // 7. Рекомендации
    if (packageUsersWithZeroBalance.length > 0) {
      logger.info(`\n⚠️  РЕКОМЕНДАЦИЯ: Запустите скрипт миграции для исправления ${packageUsersWithZeroBalance.length} пользователей`);
      logger.info(`   tsx scripts/fix-ton-farming-balance.ts --confirm`);
    } else {
      logger.info(`\n✅ Все пользователи с boost пакетами имеют корректный farming_balance`);
    }
    
  } catch (error) {
    logger.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkTonFarmingBalance()
  .then(() => {
    logger.info('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    logger.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  });