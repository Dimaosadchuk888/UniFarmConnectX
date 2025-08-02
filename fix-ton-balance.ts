import { supabase } from './core/supabaseClient';

async function fixTonBalance() {
  console.log('=== ВОССТАНОВЛЕНИЕ БАЛАНСА TON ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем стоимость пакета 1
    const { data: package1 } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .eq('id', 1)
      .single();
      
    console.log('ИНФОРМАЦИЯ О ПАКЕТЕ 1:');
    console.log(`Название: ${package1.name}`);
    console.log(`Стоимость: ${package1.ton_amount} TON`);
    console.log(`Доход в день: ${package1.daily_income} UNI`);
    console.log(`TON в час: ${package1.ton_per_hour}\n`);
    
    // 2. Рассчитываем правильный баланс
    const depositAmount = 100; // Вы пополнили на 100 TON
    const packageCost = parseFloat(package1.ton_amount);
    const correctBalance = depositAmount - packageCost;
    
    console.log('РАСЧЁТ БАЛАНСА:');
    console.log(`Пополнение: +${depositAmount} TON`);
    console.log(`Покупка пакета: -${packageCost} TON`);
    console.log(`Должно остаться: ${correctBalance} TON`);
    console.log(`Сейчас в базе: 0 TON\n`);
    
    // 3. Восстанавливаем баланс
    console.log('ВОССТАНОВЛЕНИЕ БАЛАНСА...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: correctBalance })
      .eq('id', userId);
      
    if (updateError) {
      console.log('❌ Ошибка обновления:', updateError);
      return;
    }
    
    console.log('✅ Баланс восстановлен!\n');
    
    // 4. Создаем пропущенную транзакцию покупки
    console.log('СОЗДАНИЕ ЗАПИСИ О ПОКУПКЕ...');
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: parseInt(userId),
        amount: packageCost.toString(),
        currency: 'TON',
        type: 'TON_BOOST_PURCHASE',
        status: 'COMPLETED',
        description: `Покупка TON Boost "${package1.name}"`,
        created_at: '2025-08-02T10:26:00.000Z', // Примерное время покупки
        updated_at: '2025-08-02T10:26:00.000Z'
      });
      
    if (txError) {
      console.log('⚠️ Не удалось создать запись транзакции:', txError.message);
    } else {
      console.log('✅ Запись о покупке создана!');
    }
    
    // 5. Проверяем результат
    const { data: finalUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', userId)
      .single();
      
    console.log(`\n✅ ИТОГ: Баланс TON восстановлен до ${finalUser.balance_ton} TON`);
    console.log('\nОбновите страницу, чтобы увидеть изменения!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

fixTonBalance();