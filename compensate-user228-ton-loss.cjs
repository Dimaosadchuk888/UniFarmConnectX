/**
 * КОМПЕНСАЦИЯ USER 228 - Возврат потерянного 1.0 TON
 * Транзакция d1077cd0 не была обработана из-за мошеннической схемы User 249
 */

const { createClient } = require('@supabase/supabase-js');

// Пытаемся получить переменные из разных источников
const supabaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

console.log('🔧 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'найден' : 'отсутствует'}`);
console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'найден' : 'отсутствует'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Переменные окружения не найдены');
  console.log('💡 Используйте: SUPABASE_URL="$DATABASE_URL" SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" node compensate-user228-ton-loss.cjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compensateUser228() {
  console.log('💰 КОМПЕНСАЦИЯ USER 228 - ПОТЕРЯННЫЙ TON ДЕПОЗИТ');
  console.log('=' + '='.repeat(50));
  console.log('📋 Основание: Транзакция d1077cd0 не обработана из-за мошенничества');
  console.log('💎 Сумма компенсации: 1.0 TON');
  console.log('👤 Получатель: User 228');
  console.log('');

  try {
    // Проверяем существование User 228
    const { data: user228, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .eq('id', 228)
      .single();

    if (userError || !user228) {
      console.log('❌ User 228 не найден:', userError?.message);
      return;
    }

    console.log('👤 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ:');
    console.log(`   ID: ${user228.id}`);
    console.log(`   Telegram ID: ${user228.telegram_id}`);
    console.log(`   Username: ${user228.username || 'N/A'}`);
    console.log(`   Текущий TON баланс: ${parseFloat(user228.balance_ton).toFixed(6)} TON`);

    // Проверяем не была ли компенсация уже выплачена
    const { data: existingCompensation } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 228)
      .eq('type', 'FARMING_REWARD')
      .ilike('description', '%компенсация%d1077cd0%')
      .limit(1);

    if (existingCompensation && existingCompensation.length > 0) {
      console.log('⚠️ КОМПЕНСАЦИЯ УЖЕ ВЫПЛАЧЕНА');
      console.log(`   Транзакция ID: ${existingCompensation[0].id}`);
      console.log(`   Дата: ${existingCompensation[0].created_at}`);
      console.log(`   Сумма: ${existingCompensation[0].amount} TON`);
      return;
    }

    console.log('\n✅ ПРОВЕРКИ ПРОЙДЕНЫ - НАЧИНАЕМ КОМПЕНСАЦИЮ');

    // Создаем компенсационную транзакцию
    const compensationAmount = 1.0;
    const description = 'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249';
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: 228,
        type: 'FARMING_REWARD',
        amount: compensationAmount.toString(),
        currency: 'TON',
        description: description,
        metadata: {
          compensation: true,
          original_transaction: 'd1077cd0',
          fraud_case: 'User_249_scheme',
          compensation_date: new Date().toISOString(),
          authorized_by: 'system_admin',
          reason: 'Lost TON deposit due to fraudulent referral scheme'
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.log('❌ Ошибка создания транзакции:', transactionError.message);
      return;
    }

    console.log('\n📝 ТРАНЗАКЦИЯ СОЗДАНА:');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Сумма: ${transaction.amount} ${transaction.currency}`);
    console.log(`   Дата: ${transaction.created_at}`);

    // Обновляем баланс пользователя
    const newBalance = parseFloat(user228.balance_ton) + compensationAmount;
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance.toString() })
      .eq('id', 228);

    if (balanceError) {
      console.log('❌ Ошибка обновления баланса:', balanceError.message);
      
      // Откатываем транзакцию
      await supabase.from('transactions').delete().eq('id', transaction.id);
      console.log('🔄 Транзакция удалена из-за ошибки баланса');
      return;
    }

    console.log('\n💰 БАЛАНС ОБНОВЛЕН:');
    console.log(`   Старый баланс: ${parseFloat(user228.balance_ton).toFixed(6)} TON`);
    console.log(`   Компенсация: +${compensationAmount.toFixed(6)} TON`);
    console.log(`   Новый баланс: ${newBalance.toFixed(6)} TON`);

    // Проверяем финальный баланс
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 228)
      .single();

    if (updatedUser) {
      console.log(`   Подтверждение: ${parseFloat(updatedUser.balance_ton).toFixed(6)} TON`);
    }

    console.log('\n🎉 КОМПЕНСАЦИЯ УСПЕШНО ВЫПЛАЧЕНА!');
    console.log('📋 ИТОГИ:');
    console.log(`   ✅ User 228 получил 1.0 TON компенсацию`);
    console.log(`   ✅ Транзакция зафиксирована в системе`);
    console.log(`   ✅ Баланс корректно обновлен`);
    console.log(`   ✅ Справедливость восстановлена`);

    console.log('\n📊 ДЕТАЛИ ДЛЯ ОТЧЕТА:');
    console.log(`   Транзакция ID: ${transaction.id}`);
    console.log(`   User ID: 228`);
    console.log(`   Сумма: 1.0 TON`);
    console.log(`   Основание: Потерянный депозит d1077cd0`);
    console.log(`   Дата компенсации: ${new Date().toISOString()}`);

  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('🛑 Компенсация НЕ выполнена');
  }
}

// Подтверждение безопасности
console.log('⚠️ ВНИМАНИЕ: Этот скрипт выполнит РЕАЛЬНУЮ компенсацию 1.0 TON');
console.log('📋 Основание: Документированная потеря из-за мошенничества User 249');
console.log('🔐 Безопасность: Проверки дублирования включены');
console.log('');

// Запуск через 3 секунды для возможности отмены
setTimeout(() => {
  console.log('🚀 ЗАПУСК КОМПЕНСАЦИИ...');
  compensateUser228();
}, 3000);

console.log('💡 Для отмены нажмите Ctrl+C в течение 3 секунд');