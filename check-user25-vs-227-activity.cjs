/**
 * СРАВНЕНИЕ АКТИВНОСТИ USER 25 VS USER 227
 * Детальная проверка новых транзакций
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function compareUser25vs227Activity() {
  console.log('🆚 СРАВНЕНИЕ АКТИВНОСТИ USER 25 VS USER 227');
  console.log('='.repeat(45));
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  try {
    // Проверяем каждого пользователя отдельно
    for (const userId of [25, 227]) {
      console.log(`\n👤 АНАЛИЗ USER ${userId}:`);
      console.log('-'.repeat(25));
      
      // Получаем информацию о пользователе
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (user) {
        console.log(`   📋 Профиль:`);
        console.log(`      Telegram ID: ${user.telegram_id}`);
        console.log(`      Username: ${user.username}`);
        console.log(`      TON баланс: ${user.balance_ton}`);
        console.log(`      UNI баланс: ${user.balance_uni}`);
        console.log(`      Создан: ${user.created_at}`);
        console.log(`      Последняя активность: ${user.last_active}`);
      } else {
        console.log(`   ❌ Пользователь не найден`);
        continue;
      }
      
      // Все транзакции за 10 минут
      const { data: allTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });
      
      console.log(`\n   📊 Все транзакции за 10 минут: ${allTx?.length || 0}`);
      
      if (allTx && allTx.length > 0) {
        // Группируем по валютам
        const tonTx = allTx.filter(tx => tx.currency === 'TON');
        const uniTx = allTx.filter(tx => tx.currency === 'UNI');
        
        console.log(`      💎 TON транзакции: ${tonTx.length}`);
        console.log(`      🌾 UNI транзакции: ${uniTx.length}`);
        
        if (tonTx.length > 0) {
          console.log(`\n   💎 ДЕТАЛИ TON ТРАНЗАКЦИЙ:`);
          tonTx.forEach((tx, i) => {
            const time = new Date(tx.created_at);
            const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
            const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000) % 60;
            
            console.log(`      ${i + 1}. ID: ${tx.id} | ${tx.type} | ${tx.amount} TON`);
            console.log(`         Время: ${minutesAgo}:${secondsAgo.toString().padStart(2, '0')} назад`);
            console.log(`         Описание: ${tx.description}`);
            console.log(`         Статус: ${tx.status}`);
            
            if (tx.type === 'DEPOSIT') {
              console.log(`         🎯 ДЕПОЗИТ!`);
            }
          });
        } else {
          console.log(`      ❌ TON транзакции не найдены`);
        }
        
        if (uniTx.length > 0 && uniTx.length <= 3) {
          console.log(`\n   🌾 ПОСЛЕДНИЕ UNI ТРАНЗАКЦИИ:`);
          uniTx.slice(0, 3).forEach((tx, i) => {
            const time = new Date(tx.created_at);
            const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
            console.log(`      ${i + 1}. ${tx.type} ${tx.amount} UNI (${minutesAgo} мин назад)`);
          });
        }
      } else {
        console.log(`      ❌ Транзакции за 10 минут не найдены`);
      }
      
      // Считаем общую статистику
      const { count: totalTonCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('currency', 'TON');
      
      console.log(`\n   📈 Общая статистика:`);
      console.log(`      Всего TON транзакций: ${totalTonCount || 0}`);
      
      // Последняя TON транзакция
      const { data: lastTonTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (lastTonTx && lastTonTx.length > 0) {
        const tx = lastTonTx[0];
        const time = new Date(tx.created_at);
        const hoursAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60 / 60);
        console.log(`      Последняя TON транзакция: ${hoursAgo}ч назад (${tx.type} ${tx.amount} TON)`);
      } else {
        console.log(`      Последняя TON транзакция: не найдена`);
      }
    }
    
    // Сравнительный анализ
    console.log(`\n🔍 СРАВНИТЕЛЬНЫЙ АНАЛИЗ:`);
    console.log('='.repeat(30));
    
    const { data: user25Recent } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('currency', 'TON')
      .gte('created_at', tenMinutesAgo);
    
    const { data: user227Recent } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .gte('created_at', tenMinutesAgo);
    
    console.log(`User 25 новых TON транзакций: ${user25Recent?.length || 0}`);
    console.log(`User 227 новых TON транзакций: ${user227Recent?.length || 0}`);
    
    if ((user25Recent?.length || 0) === 0 && (user227Recent?.length || 0) === 0) {
      console.log(`\n❌ ЗАКЛЮЧЕНИЕ: Ни один из пользователей не имеет новых TON транзакций`);
      console.log(`Если вы отправили депозиты - они не записались в backend`);
    } else {
      console.log(`\n✅ ЗАКЛЮЧЕНИЕ: Обнаружена новая TON активность`);
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка сравнения:', error.message);
  }
}

compareUser25vs227Activity().catch(console.error);