// Финальный тест автоматического обновления баланса при награде за миссию
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissionBalanceUpdate() {
  console.log('=== ФИНАЛЬНЫЙ ТЕСТ ОБНОВЛЕНИЯ БАЛАНСА ===\n');
  
  try {
    // 1. Проверяем текущий баланс пользователя
    const { data: userBefore, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (userError || !userBefore) {
      console.error('Ошибка получения пользователя:', userError);
      return;
    }

    console.log('Баланс ДО транзакции:');
    console.log(`- UNI: ${userBefore.balance_uni}`);
    console.log(`- TON: ${userBefore.balance_ton}`);
    console.log('');

    // 2. Создаём транзакцию миссии через API
    console.log('Создание транзакции миссии (500 UNI)...');
    const { data: newTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: 48,
        type: 'MISSION_REWARD',
        amount_uni: '500',
        amount_ton: '0',
        currency: 'UNI',
        description: 'Mission reward: Complete profile',
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (txError) {
      console.error('Ошибка создания транзакции:', txError);
      return;
    }

    console.log(`✓ Транзакция создана: ID ${newTx.id}`);

    // 3. Ждём немного для обработки
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Проверяем обновленный баланс
    const { data: userAfter, error: userAfterError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (userAfterError || !userAfter) {
      console.error('Ошибка получения обновленного пользователя:', userAfterError);
      return;
    }

    console.log('\nБаланс ПОСЛЕ транзакции:');
    console.log(`- UNI: ${userAfter.balance_uni}`);
    console.log(`- TON: ${userAfter.balance_ton}`);

    // 5. Проверяем разницу
    const uniDiff = parseFloat(userAfter.balance_uni) - parseFloat(userBefore.balance_uni);
    const tonDiff = parseFloat(userAfter.balance_ton) - parseFloat(userBefore.balance_ton);

    console.log('\nИзменения баланса:');
    console.log(`- UNI: ${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)}`);
    console.log(`- TON: ${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)}`);

    if (Math.abs(uniDiff - 500) < 0.01) {
      console.log('\n✅ УСПЕХ! Баланс автоматически увеличился на 500 UNI');
    } else {
      console.log('\n❌ ОШИБКА! Баланс не обновился корректно');
      console.log('Ожидалось: +500 UNI');
      console.log(`Получено: +${uniDiff} UNI`);
    }

    // 6. Проверяем логи сервера
    console.log('\n--- Последние транзакции пользователя ---');
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, amount_ton, status, created_at')
      .eq('user_id', 48)
      .order('created_at', { ascending: false })
      .limit(5);

    recentTx?.forEach(tx => {
      console.log(`ID ${tx.id}: ${tx.type} - UNI: ${tx.amount_uni || 0}, TON: ${tx.amount_ton || 0} (${tx.status})`);
    });

  } catch (error) {
    console.error('Неожиданная ошибка:', error);
  }
}

checkMissionBalanceUpdate();