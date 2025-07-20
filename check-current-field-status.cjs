/**
 * ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ПОЛЕЙ В БД
 * Анализируем как заполнены поля amount, amount_ton, amount_uni
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentFieldStatus() {
  console.log('🔍 ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ПОЛЕЙ БД');
  console.log('='.repeat(50));
  
  try {
    // 1. Последние 10 транзакций всех типов
    console.log('\n📊 ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ (все типы):');
    const { data: recentTxs } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentTxs) {
      recentTxs.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id} | User: ${tx.user_id} | ${tx.currency}`);
        console.log(`      type: ${tx.type}`);
        console.log(`      amount: "${tx.amount}" (${typeof tx.amount})`);
        console.log(`      amount_ton: "${tx.amount_ton}" (${typeof tx.amount_ton})`);
        console.log(`      amount_uni: "${tx.amount_uni}" (${typeof tx.amount_uni})`);
        console.log(`      created: ${tx.created_at}`);
        
        // Проверка корректности заполнения
        const amount = parseFloat(tx.amount || 0);
        const amount_ton = parseFloat(tx.amount_ton || 0);
        const amount_uni = parseFloat(tx.amount_uni || 0);
        
        if (tx.currency === 'TON') {
          if (amount > 0 && amount_ton > 0) {
            console.log(`      ✅ TON: корректно заполнены amount и amount_ton`);
          } else if (amount === 0 && amount_ton > 0) {
            console.log(`      ⚠️  TON: amount=0, но amount_ton=${amount_ton} (старая проблема)`);
          } else if (amount > 0 && amount_ton === 0) {
            console.log(`      🔄 TON: amount=${amount}, но amount_ton=0 (новая логика?)`);
          } else {
            console.log(`      ❌ TON: оба поля = 0`);
          }
        }
        
        if (tx.currency === 'UNI') {
          if (amount > 0 && amount_uni > 0) {
            console.log(`      ✅ UNI: корректно заполнены amount и amount_uni`);
          } else if (amount === 0 && amount_uni > 0) {
            console.log(`      ⚠️  UNI: amount=0, но amount_uni=${amount_uni} (старая проблема)`);
          } else if (amount > 0 && amount_uni === 0) {
            console.log(`      🔄 UNI: amount=${amount}, но amount_uni=0 (новая логика?)`);
          } else {
            console.log(`      ❌ UNI: оба поля = 0`);
          }
        }
      });
    }
    
    // 2. Статистика по заполнению полей после последних изменений
    console.log('\n📈 СТАТИСТИКА ЗАПОЛНЕНИЯ ПОЛЕЙ (последние 24 часа):');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentStats } = await supabase
      .from('transactions')
      .select('currency, amount, amount_ton, amount_uni')
      .gte('created_at', yesterday.toISOString());
    
    if (recentStats) {
      const tonTxs = recentStats.filter(tx => tx.currency === 'TON');
      const uniTxs = recentStats.filter(tx => tx.currency === 'UNI');
      
      console.log(`\n   TON транзакции за 24ч (всего: ${tonTxs.length}):`);
      if (tonTxs.length > 0) {
        const tonWithAmount = tonTxs.filter(tx => parseFloat(tx.amount || 0) > 0).length;
        const tonWithAmountTon = tonTxs.filter(tx => parseFloat(tx.amount_ton || 0) > 0).length;
        
        console.log(`   - amount > 0: ${tonWithAmount} (${(tonWithAmount/tonTxs.length*100).toFixed(1)}%)`);
        console.log(`   - amount_ton > 0: ${tonWithAmountTon} (${(tonWithAmountTon/tonTxs.length*100).toFixed(1)}%)`);
        
        if (tonWithAmount !== tonTxs.length) {
          console.log(`   🚨 ${tonTxs.length - tonWithAmount} TON транзакций с amount = 0`);
        }
        if (tonWithAmountTon !== tonTxs.length) {
          console.log(`   🚨 ${tonTxs.length - tonWithAmountTon} TON транзакций с amount_ton = 0`);
        }
      }
      
      console.log(`\n   UNI транзакции за 24ч (всего: ${uniTxs.length}):`);
      if (uniTxs.length > 0) {
        const uniWithAmount = uniTxs.filter(tx => parseFloat(tx.amount || 0) > 0).length;
        const uniWithAmountUni = uniTxs.filter(tx => parseFloat(tx.amount_uni || 0) > 0).length;
        
        console.log(`   - amount > 0: ${uniWithAmount} (${(uniWithAmount/uniTxs.length*100).toFixed(1)}%)`);
        console.log(`   - amount_uni > 0: ${uniWithAmountUni} (${(uniWithAmountUni/uniTxs.length*100).toFixed(1)}%)`);
        
        if (uniWithAmount !== uniTxs.length) {
          console.log(`   🚨 ${uniTxs.length - uniWithAmount} UNI транзакций с amount = 0`);
        }
        if (uniWithAmountUni !== uniTxs.length) {
          console.log(`   🚨 ${uniTxs.length - uniWithAmountUni} UNI транзакций с amount_uni = 0`);
        }
      }
    }
    
    // 3. Проверяем транзакции User 25 (DimaOsadchuk)
    console.log('\n👤 ТРАНЗАКЦИИ USER 25 (DimaOsadchuk):');
    const { data: user25Txs } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (user25Txs && user25Txs.length > 0) {
      user25Txs.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id} | ${tx.currency} | ${tx.type}`);
        console.log(`      amount: "${tx.amount}"`);
        console.log(`      amount_ton: "${tx.amount_ton}"`);
        console.log(`      amount_uni: "${tx.amount_uni}"`);
        console.log(`      description: ${tx.description.substring(0, 50)}...`);
        
        const amount = parseFloat(tx.amount || 0);
        const specificAmount = tx.currency === 'TON' ? parseFloat(tx.amount_ton || 0) : parseFloat(tx.amount_uni || 0);
        
        if (amount === 0 && specificAmount > 0) {
          console.log(`      🚨 ПРОБЛЕМА: amount=0, но ${tx.currency.toLowerCase()}_amount=${specificAmount}`);
        } else if (amount > 0) {
          console.log(`      ✅ ИСПРАВЛЕНО: amount заполнено корректно`);
        }
      });
    } else {
      console.log('   Транзакции User 25 не найдены');
    }
    
    // 4. Проверяем специфично TON депозиты User 25
    console.log('\n💎 TON ДЕПОЗИТЫ USER 25:');
    const { data: user25TonDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    if (user25TonDeposits && user25TonDeposits.length > 0) {
      console.log(`   Найдено ${user25TonDeposits.length} TON транзакций:`);
      user25TonDeposits.forEach((tx, i) => {
        const amount = parseFloat(tx.amount || 0);
        const amount_ton = parseFloat(tx.amount_ton || 0);
        
        console.log(`   ${i + 1}. ID: ${tx.id} | amount: ${amount} | amount_ton: ${amount_ton}`);
        
        if (amount === 0 && amount_ton > 0) {
          console.log(`      🚨 НЕ ОТОБРАЖАЕТСЯ: Frontend читает amount=0`);
        } else if (amount > 0) {
          console.log(`      ✅ ОТОБРАЖАЕТСЯ: Frontend читает amount=${amount}`);
        }
      });
    } else {
      console.log('   TON депозиты User 25 не найдены');
    }
    
    console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
    console.log('- Если amount заполнено - транзакция отображается');
    console.log('- Если amount = 0, но amount_ton/amount_uni > 0 - транзакция НЕ отображается');
    console.log('- Нужно определить текущий статус заполнения полей');
    
  } catch (error) {
    console.log('❌ Ошибка анализа:', error.message);
  }
}

checkCurrentFieldStatus().catch(console.error);