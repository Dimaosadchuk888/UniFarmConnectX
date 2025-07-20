/**
 * ПОЛНЫЙ АНАЛИЗ СТРУКТУРЫ ПОЛЕЙ ТРАНЗАКЦИЙ
 * Проверяем все поля amount_* в БД и их использование
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTransactionFields() {
  console.log('📊 ПОЛНЫЙ АНАЛИЗ СТРУКТУРЫ ПОЛЕЙ ТРАНЗАКЦИЙ');
  console.log('='.repeat(50));
  
  try {
    // 1. Анализ схемы таблицы transactions
    console.log('\n🗃️ СХЕМА ТАБЛИЦЫ transactions:');
    const { data: sampleTx } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (sampleTx && sampleTx.length > 0) {
      const fields = Object.keys(sampleTx[0]);
      const amountFields = fields.filter(field => field.includes('amount'));
      
      console.log('   Все поля amount:');
      amountFields.forEach(field => {
        console.log(`   - ${field}: ${typeof sampleTx[0][field]}`);
      });
      
      console.log('\n   Все поля таблицы:');
      fields.forEach(field => {
        console.log(`   - ${field}`);
      });
    }
    
    // 2. Анализ TON транзакций с разными полями
    console.log('\n💰 АНАЛИЗ TON ТРАНЗАКЦИЙ (последние 10):');
    const { data: tonTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tonTxs) {
      tonTxs.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id} (User: ${tx.user_id})`);
        console.log(`      amount: "${tx.amount}" (${typeof tx.amount})`);
        console.log(`      amount_ton: "${tx.amount_ton}" (${typeof tx.amount_ton})`);
        console.log(`      amount_uni: "${tx.amount_uni}" (${typeof tx.amount_uni})`);
        console.log(`      type: ${tx.type}`);
        console.log(`      description: ${tx.description.substring(0, 50)}...`);
        
        // Проверяем логику заполнения
        const hasAmount = tx.amount && parseFloat(tx.amount) > 0;
        const hasAmountTon = tx.amount_ton && parseFloat(tx.amount_ton) > 0;
        const hasAmountUni = tx.amount_uni && parseFloat(tx.amount_uni) > 0;
        
        console.log(`      ✅ Заполнено: amount=${hasAmount}, amount_ton=${hasAmountTon}, amount_uni=${hasAmountUni}`);
        
        // Выявляем проблемы
        if (!hasAmount && hasAmountTon) {
          console.log(`      🚨 ПРОБЛЕМА: amount=0, но amount_ton=${tx.amount_ton}`);
        }
        if (!hasAmount && !hasAmountTon) {
          console.log(`      ❌ КРИТИЧНО: все amount поля = 0`);
        }
      });
    }
    
    // 3. Анализ UNI транзакций
    console.log('\n🌾 АНАЛИЗ UNI ТРАНЗАКЦИЙ (последние 5):');
    const { data: uniTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (uniTxs) {
      uniTxs.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id} (User: ${tx.user_id})`);
        console.log(`      amount: "${tx.amount}" (${typeof tx.amount})`);
        console.log(`      amount_ton: "${tx.amount_ton}" (${typeof tx.amount_ton})`);
        console.log(`      amount_uni: "${tx.amount_uni}" (${typeof tx.amount_uni})`);
        console.log(`      type: ${tx.type}`);
        
        const hasAmount = tx.amount && parseFloat(tx.amount) > 0;
        const hasAmountTon = tx.amount_ton && parseFloat(tx.amount_ton) > 0;
        const hasAmountUni = tx.amount_uni && parseFloat(tx.amount_uni) > 0;
        
        console.log(`      ✅ Заполнено: amount=${hasAmount}, amount_ton=${hasAmountTon}, amount_uni=${hasAmountUni}`);
        
        if (!hasAmount && hasAmountUni) {
          console.log(`      🚨 ПРОБЛЕМА: amount=0, но amount_uni=${tx.amount_uni}`);
        }
      });
    }
    
    // 4. Статистика по заполнению полей
    console.log('\n📈 СТАТИСТИКА ЗАПОЛНЕНИЯ ПОЛЕЙ:');
    
    // TON транзакции
    const { data: tonStats } = await supabase
      .from('transactions')
      .select('amount, amount_ton, amount_uni')
      .eq('currency', 'TON');
    
    if (tonStats) {
      const tonWithAmount = tonStats.filter(tx => tx.amount && parseFloat(tx.amount) > 0).length;
      const tonWithAmountTon = tonStats.filter(tx => tx.amount_ton && parseFloat(tx.amount_ton) > 0).length;
      
      console.log(`\n   TON транзакции (всего: ${tonStats.length}):`);
      console.log(`   - amount > 0: ${tonWithAmount} (${(tonWithAmount/tonStats.length*100).toFixed(1)}%)`);
      console.log(`   - amount_ton > 0: ${tonWithAmountTon} (${(tonWithAmountTon/tonStats.length*100).toFixed(1)}%)`);
      
      if (tonWithAmount !== tonWithAmountTon) {
        console.log(`   🚨 НЕСООТВЕТСТВИЕ: ${Math.abs(tonWithAmount - tonWithAmountTon)} транзакций имеют разные значения`);
      }
    }
    
    // UNI транзакции
    const { data: uniStats } = await supabase
      .from('transactions')
      .select('amount, amount_ton, amount_uni')
      .eq('currency', 'UNI');
    
    if (uniStats) {
      const uniWithAmount = uniStats.filter(tx => tx.amount && parseFloat(tx.amount) > 0).length;
      const uniWithAmountUni = uniStats.filter(tx => tx.amount_uni && parseFloat(tx.amount_uni) > 0).length;
      
      console.log(`\n   UNI транзакции (всего: ${uniStats.length}):`);
      console.log(`   - amount > 0: ${uniWithAmount} (${(uniWithAmount/uniStats.length*100).toFixed(1)}%)`);
      console.log(`   - amount_uni > 0: ${uniWithAmountUni} (${(uniWithAmountUni/uniStats.length*100).toFixed(1)}%)`);
      
      if (uniWithAmount !== uniWithAmountUni) {
        console.log(`   🚨 НЕСООТВЕТСТВИЕ: ${Math.abs(uniWithAmount - uniWithAmountUni)} транзакций имеют разные значения`);
      }
    }
    
    // 5. Проверка транзакций с нулевыми amount
    console.log('\n❌ ТРАНЗАКЦИИ С amount = 0:');
    const { data: zeroAmount } = await supabase
      .from('transactions')
      .select('*')
      .eq('amount', 0)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (zeroAmount && zeroAmount.length > 0) {
      console.log(`   Найдено ${zeroAmount.length} транзакций с amount = 0:`);
      zeroAmount.forEach((tx, i) => {
        const realAmount = tx.currency === 'TON' ? tx.amount_ton : tx.amount_uni;
        console.log(`   ${i + 1}. ID: ${tx.id}, currency: ${tx.currency}, real_amount: ${realAmount}`);
      });
    } else {
      console.log('   ✅ Транзакций с amount = 0 не найдено');
    }
    
    console.log('\n🎯 ВЫВОДЫ:');
    console.log('1. Проверить какие поля использует Frontend для отображения');
    console.log('2. Выявить несоответствия между amount и amount_ton/amount_uni');
    console.log('3. Определить правильную логику заполнения полей');
    console.log('4. Убедиться что Backend заполняет правильные поля');
    
  } catch (error) {
    console.log('❌ Ошибка анализа:', error.message);
  }
}

analyzeTransactionFields().catch(console.error);