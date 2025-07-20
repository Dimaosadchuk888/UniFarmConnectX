/**
 * ПОИСК ПРОПАВШЕЙ ТРАНЗАКЦИИ ДЕПОЗИТА
 * Ищем TON депозит который отображается в интерфейсе но не найден в БД
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingDepositTransaction() {
  console.log('🔍 ПОИСК ПРОПАВШЕЙ TON ТРАНЗАКЦИИ');
  console.log('='.repeat(50));
  
  const userId = 184;
  
  try {
    // 1. Ищем ВСЕ транзакции User 184 за последний час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    console.log('🕐 ПОИСК ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЙ ЧАС:');
    console.log(`   Начиная с: ${new Date(oneHourAgo).toLocaleString()}`);
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (recentError) {
      console.log('❌ Ошибка поиска недавних транзакций:', recentError.message);
      return;
    }
    
    console.log(`\n📊 ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС (${recentTx?.length || 0}):`);
    
    if (recentTx && recentTx.length > 0) {
      recentTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Валюта: ${tx.currency}`);
        console.log(`      Сумма: ${tx.amount || tx.amount_ton || tx.amount_uni || 'N/A'}`);
        console.log(`      Время: ${time.toLocaleString()} (${minutesAgo} мин назад)`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
        
        if (tx.metadata) {
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
        }
      });
    } else {
      console.log('   ❌ Транзакции за последний час не найдены');
    }
    
    // 2. Ищем транзакции по содержанию описания
    console.log('\n🔍 ПОИСК ПО КЛЮЧЕВЫМ СЛОВАМ:');
    
    const searchKeywords = [
      '0.1',
      '0,1', 
      'deposit',
      'пополнение',
      'blockchain',
      'TON'
    ];
    
    for (const keyword of searchKeywords) {
      const { data: keywordTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('description', `%${keyword}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (keywordTx && keywordTx.length > 0) {
        console.log(`\n   📄 Найдено по "${keyword}" (${keywordTx.length}):`);
        keywordTx.forEach((tx, i) => {
          const time = new Date(tx.created_at);
          const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
          console.log(`      ${i + 1}. ${tx.type} ${tx.amount} ${tx.currency} (${minutesAgo} мин назад): ${tx.description}`);
        });
      }
    }
    
    // 3. Проверяем последние ID в системе
    console.log('\n🆔 ПРОВЕРКА ПОСЛЕДНИХ ID ТРАНЗАКЦИЙ:');
    
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at, description')
      .order('id', { ascending: false })
      .limit(20);
    
    if (latestTx) {
      console.log('   📄 Последние 20 транзакций в системе по ID:');
      latestTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`      ${i + 1}. ID ${tx.id}: User ${tx.user_id} ${tx.type} ${tx.amount} ${tx.currency} (${minutesAgo} мин назад)`);
        
        // Выделяем транзакции User 184
        if (tx.user_id === userId) {
          console.log(`         🎯 ЭТО USER 184: ${tx.description}`);
        }
      });
    }
    
    // 4. Ищем возможные TON транзакции других пользователей за последний час
    console.log('\n🌐 TON ДЕПОЗИТЫ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ ЗА ЧАС:');
    
    const { data: otherTonTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (otherTonTx && otherTonTx.length > 0) {
      console.log(`   📄 Найдено ${otherTonTx.length} TON депозитов:`);
      otherTonTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`      ${i + 1}. User ${tx.user_id}: ${tx.amount} TON (${minutesAgo} мин назад) - ${tx.description}`);
      });
    } else {
      console.log('   ❌ TON депозиты за последний час не найдены');
      console.log('   🤔 Это подтверждает что депозит НЕ записан в БД');
    }
    
    console.log('\n🎯 ВЫВОД:');
    console.log('Если пользователь видит депозит 0.1 TON в истории транзакций,');
    console.log('но его нет в БД - это проблема Frontend/Backend синхронизации.');
    console.log('Либо Frontend показывает кэшированные данные, либо есть другой источник.');
    
  } catch (error) {
    console.log('❌ Критическая ошибка поиска:', error.message);
  }
}

findMissingDepositTransaction().catch(console.error);