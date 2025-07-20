#!/usr/bin/env node
/**
 * Диагностика проблемы с цветами реферальных начислений TON
 * Проверяет why TON referral rewards still show purple instead of blue
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://zbvgxrgsqjwizgqnpnev.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_ANON_KEY или SUPABASE_SERVICE_ROLE_KEY не найдены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReferralColors() {
  console.log('🔍 АНАЛИЗ ПРОБЛЕМЫ С ЦВЕТАМИ РЕФЕРАЛЬНЫХ TON');
  console.log('=' .repeat(60));
  
  try {
    // 1. Получаем последние реферальные транзакции TON
    console.log('\n1️⃣ ПОСЛЕДНИЕ РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ TON:');
    const { data: tonReferrals, error: tonError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, currency, description, metadata, created_at')
      .eq('type', 'REFERRAL_REWARD')
      .gt('amount_ton', 0)
      .order('created_at', { desc: true })
      .limit(5);
      
    if (tonError) {
      console.error('❌ Ошибка запроса TON рефералов:', tonError.message);
      return;
    }
    
    if (!tonReferrals || tonReferrals.length === 0) {
      console.log('⚠️  Реферальные транзакции TON не найдены');
    } else {
      tonReferrals.forEach(tx => {
        console.log(`📝 ID ${tx.id} | User ${tx.user_id} | TON: ${tx.amount_ton}`);
        console.log(`   Type: "${tx.type}" | Currency: "${tx.currency}"`); 
        console.log(`   Description: "${tx.description}"`);
        console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
        console.log('   ---');
      });
    }
    
    // 2. Получаем последние реферальные транзакции UNI для сравнения
    console.log('\n2️⃣ ПОСЛЕДНИЕ РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ UNI (для сравнения):');
    const { data: uniReferrals, error: uniError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, currency, description, metadata, created_at')
      .eq('type', 'REFERRAL_REWARD')
      .gt('amount_uni', 0)
      .order('created_at', { desc: true })
      .limit(3);
      
    if (!uniError && uniReferrals && uniReferrals.length > 0) {
      uniReferrals.forEach(tx => {
        console.log(`📝 ID ${tx.id} | User ${tx.user_id} | UNI: ${tx.amount_uni}`);
        console.log(`   Type: "${tx.type}" | Currency: "${tx.currency}"`); 
        console.log(`   Description: "${tx.description}"`);
        console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
        console.log('   ---');
      });
    }
    
    // 3. АНАЛИЗ ПРОБЛЕМЫ
    console.log('\n🔍 АНАЛИЗ ПРОБЛЕМЫ:');
    console.log('Frontend логика (StyledTransactionItem.tsx строки 62-71):');
    console.log('```');
    console.log('else if (type === "REFERRAL_REWARD") {');
    console.log('  if (currency === "TON" || description?.includes("TON")) {');
    console.log('    transactionType = "REFERRAL_REWARD_TON"; // СИНИЙ');
    console.log('  } else {');
    console.log('    transactionType = "REFERRAL_REWARD"; // ФИОЛЕТОВЫЙ');
    console.log('  }');
    console.log('}');
    console.log('```');
    
    if (tonReferrals && tonReferrals.length > 0) {
      const sample = tonReferrals[0];
      console.log(`\n✅ ПРОВЕРКА УСЛОВИЙ для ID ${sample.id}:`);
      console.log(`   type === "REFERRAL_REWARD": ${sample.type === 'REFERRAL_REWARD'}`);
      console.log(`   currency === "TON": ${sample.currency === 'TON'}`);
      console.log(`   description.includes("TON"): ${sample.description?.includes('TON')}`);
      
      if (sample.type === 'REFERRAL_REWARD' && (sample.currency === 'TON' || sample.description?.includes('TON'))) {
        console.log('🤔 ОЖИДАЕТСЯ: синий цвет (REFERRAL_REWARD_TON)');
        console.log('📱 РЕАЛЬНОСТЬ: все еще фиолетовый');
        console.log('\n🔧 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
        console.log('1. Browser cache - не обновился код после изменений');
        console.log('2. Bundle не пересобрался после изменений');
        console.log('3. CSS конфликт - синие стили перекрываются фиолетовыми');
        console.log('4. React component не перерендерился');
      } else {
        console.log('❌ УСЛОВИЕ НЕ ВЫПОЛНЯЕТСЯ - поэтому фиолетовый цвет правильный');
      }
    }
    
  } catch (error) {
    console.error('💥 Ошибка диагностики:', error.message);
  }
}

debugReferralColors().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});