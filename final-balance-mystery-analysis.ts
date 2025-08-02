import { supabase } from './core/supabaseClient';

async function finalBalanceMysteryAnalysis() {
  console.log('=== ФИНАЛЬНЫЙ АНАЛИЗ ЗАГАДКИ ИСЧЕЗНОВЕНИЯ БАЛАНСА ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем историю операций с балансом
    console.log('1. АНАЛИЗ ОПЕРАЦИЙ С БАЛАНСОМ:');
    console.log('=' * 60);
    
    // Ищем все операции вычитания из balance_ton
    const { data: withdrawals } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('currency', 'TON')
      .lt('amount', 0) // отрицательные суммы
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log(`\nОперации вычитания TON (${withdrawals?.length || 0} шт):`);
    withdrawals?.forEach(tx => {
      console.log(`- ${new Date(tx.created_at).toLocaleString()}: ${tx.amount} TON`);
      console.log(`  Тип: ${tx.type}, Описание: ${tx.description}\n`);
    });
    
    // 2. Проверяем логи или аудит
    console.log('\n\n2. ПРОВЕРКА СИСТЕМНЫХ ОПЕРАЦИЙ:');
    console.log('=' * 60);
    
    // Проверяем есть ли записи о массовых обновлениях
    const { data: systemOps } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .like('description', '%миграц%')
      .or('description.like.%sync%')
      .or('description.like.%transfer%')
      .or('description.like.%баланс%');
      
    console.log(`\nСистемные операции (${systemOps?.length || 0} шт):`);
    systemOps?.forEach(tx => {
      console.log(`- ${tx.type}: ${tx.description}`);
    });
    
    // 3. Анализ временной последовательности
    console.log('\n\n3. ВРЕМЕННАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ:');
    console.log('=' * 60);
    
    console.log('\n10:25 - Депозит 100 TON → balance_ton = 100.36');
    console.log('10:26 - Покупка boost 1 TON → balance_ton должен быть 99.36');
    console.log('10:26 - balance_ton = 0, ton_farming_balance = 115');
    console.log('\nЧто произошло: 99.36 TON переместились в farming без транзакции');
    
    // 4. Возможные сценарии
    console.log('\n\n4. ВОЗМОЖНЫЕ СЦЕНАРИИ:');
    console.log('=' * 60);
    
    console.log('\n📌 СЦЕНАРИЙ 1: Ошибка в старой версии кода');
    console.log('При активации boost вместо depositAmount передавался весь баланс');
    console.log('Например: activateBoost(userId, balance_ton) вместо activateBoost(userId, 1)');
    
    console.log('\n📌 СЦЕНАРИЙ 2: Триггер или процедура в БД');
    console.log('При создании записи в ton_farming_data срабатывал триггер,');
    console.log('который переносил весь balance_ton в ton_farming_balance');
    
    console.log('\n📌 СЦЕНАРИЙ 3: Race condition');
    console.log('Несколько процессов одновременно обновляли баланс:');
    console.log('- Процесс 1: списание 1 TON');
    console.log('- Процесс 2: перенос всего баланса в farming');
    
    console.log('\n📌 СЦЕНАРИЙ 4: Ручное вмешательство');
    console.log('Администратор или разработчик выполнил SQL запрос');
    console.log('для переноса средств напрямую в БД');
    
    // 5. Рекомендации
    console.log('\n\n5. РЕКОМЕНДАЦИИ:');
    console.log('=' * 60);
    
    console.log('\n✅ Ваши 100 TON в безопасности:');
    console.log('- Они находятся в ton_farming_balance (115 TON)');
    console.log('- Генерируют доход каждые 5 минут');
    console.log('- НО недоступны для трат (balance_ton = 0)');
    
    console.log('\n⚠️ Для восстановления доступа к средствам:');
    console.log('1. Можно перенести часть обратно в balance_ton');
    console.log('2. Или дождаться вывода через withdraw');
    console.log('3. Связаться с администрацией для выяснения');
    
    console.log('\n🔍 Для предотвращения в будущем:');
    console.log('1. Добавить логирование всех операций с балансом');
    console.log('2. Проверить наличие триггеров в БД');
    console.log('3. Добавить защиту от двойного списания');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

finalBalanceMysteryAnalysis();