import { supabase } from './modules/database/database';

async function checkAccumulatedBalance() {
  console.log('🔍 ПРОВЕРКА НАКОПЛЕННОГО БАЛАНСА ДЛЯ USER 184');
  console.log('='.repeat(60));

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, balance_ton, ton_farming_accumulated, ton_farming_balance')
      .eq('id', 184)
      .single();

    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }

    console.log('\n📊 БАЛАНСЫ USER 184:');
    console.log('├─ balance_ton:', user.balance_ton);
    console.log('├─ ton_farming_accumulated:', user.ton_farming_accumulated);
    console.log('└─ ton_farming_balance:', user.ton_farming_balance);

    const balanceTon = parseFloat(user.balance_ton || '0');
    const accumulated = parseFloat(user.ton_farming_accumulated || '0');
    const farmingBalance = parseFloat(user.ton_farming_balance || '0');

    console.log('\n🧮 ВОЗМОЖНЫЕ СУММЫ:');
    console.log(`├─ balance_ton + ton_farming_accumulated = ${(balanceTon + accumulated).toFixed(6)}`);
    console.log(`├─ balance_ton + ton_farming_balance = ${(balanceTon + farmingBalance).toFixed(6)}`);
    console.log(`└─ Все три поля = ${(balanceTon + accumulated + farmingBalance).toFixed(6)}`);

    console.log('\n🎯 UI ПОКАЗЫВАЕТ: 3.136777 TON');
    console.log('💡 ПРОВЕРКА СОВПАДЕНИЯ:');
    console.log(`├─ ${(balanceTon + accumulated).toFixed(6)} == 3.136777? ${Math.abs((balanceTon + accumulated) - 3.136777) < 0.0001 ? '✅ ДА!' : '❌ НЕТ'}`);
    console.log(`└─ ${(balanceTon + farmingBalance).toFixed(6)} == 3.136777? ${Math.abs((balanceTon + farmingBalance) - 3.136777) < 0.0001 ? '✅ ДА!' : '❌ НЕТ'}`);

  } catch (err) {
    console.error('Ошибка:', err);
  }
}

checkAccumulatedBalance();
