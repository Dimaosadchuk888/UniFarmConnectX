import { supabase } from '../core/supabase.js';
import { BalanceManager } from '../core/BalanceManager.js';
import { UnifiedTransactionService } from '../core/TransactionService.js';

async function createTestReferrals() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ РЕФЕРАЛОВ ДЛЯ USER 184 ===\n');
  
  const referrerCode = 'REF_1752755835358_yjrusv'; // Ваш реферальный код
  const referrerId = 184; // Ваш ID пользователя
  
  try {
    // Создаем 5 тестовых пользователей
    const testUsers = [];
    const timestamp = Date.now();
    
    for (let i = 1; i <= 5; i++) {
      const username = `test_ref_${timestamp}_${i}`;
      const telegramId = 8000000 + timestamp + i;
      
      console.log(`\n📝 Создание пользователя ${i}/5:`);
      console.log(`- Username: ${username}`);
      console.log(`- Telegram ID: ${telegramId}`);
      
      // Создаем пользователя
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: username,
          first_name: `Test Ref ${i}`,
          ref_code: `REF_${timestamp}_${i}`,
          referred_by: referrerId,
          balance_uni: 10000, // Начальный баланс для депозитов
          balance_ton: 100,   // Начальный баланс для TON Boost
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error(`❌ Ошибка создания пользователя:`, error);
        continue;
      }
      
      console.log(`✅ Пользователь создан с ID: ${newUser.id}`);
      testUsers.push(newUser);
      
      // Открываем UNI депозит
      const uniDepositAmount = 1000 + (i * 500); // 1500, 2000, 2500, 3000, 3500 UNI
      console.log(`\n💰 Открытие UNI депозита: ${uniDepositAmount} UNI`);
      
      // Списываем с баланса
      const balanceManager = new BalanceManager();
      await balanceManager.addBalance(newUser.id, -uniDepositAmount, 0, 'farming_deposit');
      
      // Обновляем депозит в БД
      const { error: depositError } = await supabase
        .from('users')
        .update({
          uni_farming_active: true,
          uni_deposit_amount: uniDepositAmount,
          uni_farming_balance: 0,
          uni_farming_rate: 0.01,
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', newUser.id);
        
      if (depositError) {
        console.error(`❌ Ошибка открытия UNI депозита:`, depositError);
      } else {
        console.log(`✅ UNI депозит открыт`);
        
        // Создаем транзакцию депозита
        await UnifiedTransactionService.getInstance().createTransaction({
          user_id: newUser.id,
          type: 'FARMING_DEPOSIT',
          amount_uni: uniDepositAmount,
          amount_ton: 0,
          currency: 'UNI',
          status: 'completed',
          description: `UNI farming deposit: ${uniDepositAmount} UNI`
        });
      }
      
      // Открываем TON Boost (пакет 1 - 10 TON)
      console.log(`\n🚀 Активация TON Boost (пакет 1):`);
      
      // Списываем с баланса
      await balanceManager.addBalance(newUser.id, 0, -10, 'boost_purchase');
      
      // Создаем или обновляем запись в ton_farming_data
      const { error: tonError } = await supabase
        .from('ton_farming_data')
        .upsert({
          user_id: newUser.id.toString(), // В ton_farming_data user_id хранится как string
          boost_package_id: 1,
          farming_balance: 10,
          farming_rate: 0.005,
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (tonError) {
        console.error(`❌ Ошибка активации TON Boost:`, tonError);
      } else {
        console.log(`✅ TON Boost активирован`);
        
        // Создаем транзакцию покупки
        await UnifiedTransactionService.getInstance().createTransaction({
          user_id: newUser.id,
          type: 'BOOST_PURCHASE',
          amount_uni: 0,
          amount_ton: 10,
          currency: 'TON',
          status: 'completed',
          description: 'TON Boost пакет 1 (10 TON)'
        });
      }
    }
    
    console.log('\n✅ ИТОГИ:');
    console.log(`- Создано пользователей: ${testUsers.length}`);
    console.log(`- Все пользователи приглашены по вашей реферальной ссылке`);
    console.log(`- У всех открыты депозиты UNI и TON`);
    console.log(`\n📊 Что произойдет дальше:`);
    console.log(`1. Через 5 минут планировщик начислит доход всем новым пользователям`);
    console.log(`2. Вы получите реферальные комиссии 5% от их доходов`);
    console.log(`3. В истории транзакций появятся записи REFERRAL_REWARD`);
    
    // Показываем созданных пользователей
    console.log('\n👥 Созданные пользователи:');
    testUsers.forEach((user, index) => {
      const uniDeposit = 1000 + ((index + 1) * 500);
      console.log(`${index + 1}. ${user.username} (ID: ${user.id})`);
      console.log(`   - UNI депозит: ${uniDeposit} UNI`);
      console.log(`   - TON депозит: 10 TON`);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

createTestReferrals();