/**
 * ДИАГНОСТИКА TON ДЕПОЗИТОВ USER 25 (TELEGRAM АККАУНТ)
 * Проверка нового депозита и состояния баланса
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseUser25TonDeposit() {
  console.log('🔍 ДИАГНОСТИКА USER 25 - TELEGRAM АККАУНТ');
  console.log('='.repeat(50));
  
  const userId = 25;
  
  try {
    // 1. Текущий баланс и информация
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.log('❌ User 25 не найден:', userError?.message);
      return;
    }
    
    console.log('👤 USER 25 (TELEGRAM АККАУНТ):');
    console.log(`   Telegram ID: ${user.telegram_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   TON баланс: ${user.balance_ton}`);
    console.log(`   UNI баланс: ${user.balance_uni}`);
    console.log(`   Последняя активность: ${user.last_active}`);
    console.log(`   Создан: ${user.created_at}`);
    
    // 2. Все TON транзакции за последние 24 часа
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentTonTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });
    
    console.log(`\n📊 TON ТРАНЗАКЦИИ ЗА 24 ЧАСА (${recentTonTx?.length || 0}):`);
    
    if (recentTonTx && recentTonTx.length > 0) {
      let totalBalance = 0;
      
      recentTonTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const hoursAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60 / 60);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60) % 60;
        const amount = parseFloat(tx.amount || 0);
        
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Сумма: ${amount} TON`);
        console.log(`      Время: ${time.toLocaleString()} (${hoursAgo}ч ${minutesAgo}м назад)`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
        
        if (tx.metadata) {
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
        }
        
        // Ищем потенциальные депозиты
        if (tx.type === 'DEPOSIT' || tx.description.includes('deposit') || tx.description.includes('пополнение')) {
          console.log(`      🎯 ВОЗМОЖНЫЙ ДЕПОЗИТ!`);
        }
        
        // Компенсационная транзакция
        if (tx.description.includes('compensation') || tx.description.includes('restoration')) {
          console.log(`      🔧 КОМПЕНСАЦИОННАЯ ТРАНЗАКЦИЯ`);
        }
        
        // Подсчет баланса
        if (tx.type === 'DEPOSIT' || tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD') {
          totalBalance += amount;
        } else if (tx.type === 'WITHDRAWAL') {
          totalBalance -= amount;
        }
      });
      
      console.log(`\n💰 РАСЧЕТ БАЛАНСА ИЗ ТРАНЗАКЦИЙ:`);
      console.log(`   Расчетный баланс за 24ч: ${totalBalance} TON`);
      console.log(`   Текущий баланс в БД: ${user.balance_ton} TON`);
      
      const diff = parseFloat(user.balance_ton) - totalBalance;
      if (Math.abs(diff) > 0.001) {
        console.log(`   ⚠️ НЕСООТВЕТСТВИЕ: ${diff} TON`);
        
        // Проверяем старые транзакции для полного расчета
        const { data: allTonTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('currency', 'TON')
          .order('created_at', { ascending: false });
        
        if (allTonTx) {
          let fullBalance = 0;
          allTonTx.forEach(tx => {
            const amount = parseFloat(tx.amount || 0);
            if (tx.type === 'DEPOSIT' || tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD') {
              fullBalance += amount;
            } else if (tx.type === 'WITHDRAWAL') {
              fullBalance -= amount;
            }
          });
          
          console.log(`   Полный расчетный баланс: ${fullBalance} TON`);
          const fullDiff = parseFloat(user.balance_ton) - fullBalance;
          console.log(`   Полное несоответствие: ${fullDiff} TON`);
        }
      } else {
        console.log(`   ✅ Баланс соответствует транзакциям за 24ч`);
      }
      
    } else {
      console.log('   ❌ TON транзакции за 24 часа не найдены');
      if (parseFloat(user.balance_ton) > 0) {
        console.log(`   🤔 НО баланс ${user.balance_ton} TON существует!`);
        console.log('   Возможно депозиты были давно или есть проблема с записью');
      }
    }
    
    // 3. Поиск недавних депозитов по ключевым словам
    console.log('\n🔍 ПОИСК ВОЗМОЖНЫХ ДЕПОЗИТОВ:');
    
    const { data: possibleDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('description.ilike.%0.1%,description.ilike.%deposit%,description.ilike.%пополнение%,description.ilike.%blockchain%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (possibleDeposits && possibleDeposits.length > 0) {
      console.log(`   📄 Найдено ${possibleDeposits.length} возможных депозитов:`);
      possibleDeposits.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const hoursAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60 / 60);
        console.log(`      ${i + 1}. ${tx.type}: ${tx.amount} ${tx.currency} (${hoursAgo}ч назад) - ${tx.description}`);
      });
    } else {
      console.log('   ❌ Возможные депозиты не найдены');
    }
    
    // 4. Проверка активности в системе
    console.log('\n🔄 СИСТЕМНАЯ АКТИВНОСТЬ:');
    
    const { data: systemActivity } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // За 2 часа
      .order('created_at', { ascending: false });
    
    if (systemActivity && systemActivity.length > 0) {
      console.log(`   📊 TON депозиты в системе за 2 часа (${systemActivity.length}):`);
      systemActivity.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`      ${i + 1}. User ${tx.user_id}: ${tx.amount} TON (${minutesAgo} мин назад)`);
        
        if (tx.user_id === userId) {
          console.log(`         🎯 ЭТО ВАШ АККАУНТ!`);
        }
      });
    } else {
      console.log('   ❌ TON депозиты в системе за 2 часа не найдены');
      console.log('   🤔 Если вы делали депозит, он не записался в БД');
    }
    
    console.log('\n🎯 ВЫВОДЫ ДЛЯ USER 25:');
    console.log('1. Проверьте отображается ли депозит в истории транзакций Telegram приложения');
    console.log('2. Если да - проблема с записью в backend');
    console.log('3. Если нет - проблема с TON Connect интеграцией');
    console.log('4. Баланс мог обновиться без создания транзакции');
    
  } catch (error) {
    console.log('❌ Критическая ошибка диагностики:', error.message);
  }
}

diagnoseUser25TonDeposit().catch(console.error);