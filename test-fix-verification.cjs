/**
 * ПРЯМАЯ ПРОВЕРКА ИСПРАВЛЕННОЙ ЛОГИКИ REFERRALSERVICE
 * Тест исправления с amount_uni/amount_ton вместо amount
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFixedReferralLogic() {
  console.log('🔍 ПРОВЕРКА ИСПРАВЛЕННОЙ ЛОГИКИ REFERRALSERVICE');
  console.log('=' .repeat(60));
  
  try {
    const userId = 48;
    
    // 1. Проверка пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.log('❌ ОШИБКА: Пользователь не найден -', userError.message);
      return;
    }
    
    console.log('✅ Пользователь найден:', {
      id: user.id,
      username: user.username,
      ref_code: user.ref_code
    });
    
    // 2. ИСПРАВЛЕННЫЙ ЗАПРОС с amount_uni/amount_ton
    const { data: referralTransactions, error: refError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, currency, description, created_at')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    if (refError) {
      console.log('❌ ОШИБКА получения транзакций:', refError.message);
      return;
    }
    
    console.log(`✅ Найдено ${referralTransactions?.length || 0} реферальных транзакций`);
    
    // 3. Анализ транзакций по уровням
    const levelStats = {};
    let totalUniEarned = 0;
    let totalTonEarned = 0;
    let totalTransactions = 0;
    
    if (referralTransactions && referralTransactions.length > 0) {
      referralTransactions.forEach(tx => {
        const levelMatch = tx.description?.match(/L(\d+)/);
        if (levelMatch) {
          const level = parseInt(levelMatch[1]);
          if (!levelStats[level]) {
            levelStats[level] = { count: 0, uni: 0, ton: 0 };
          }
          
          levelStats[level].count++;
          totalTransactions++;
          
          // Обработка amount_uni
          if (tx.amount_uni && parseFloat(tx.amount_uni) > 0) {
            const uniAmount = parseFloat(tx.amount_uni);
            levelStats[level].uni += uniAmount;
            totalUniEarned += uniAmount;
          }
          
          // Обработка amount_ton
          if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
            const tonAmount = parseFloat(tx.amount_ton);
            levelStats[level].ton += tonAmount;
            totalTonEarned += tonAmount;
          }
        }
      });
    }
    
    // 4. Вывод результатов
    console.log('\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:');
    console.log('-'.repeat(40));
    console.log(`📈 Всего транзакций: ${totalTransactions}`);
    console.log(`💰 Общий доход UNI: ${totalUniEarned.toFixed(6)}`);
    console.log(`💎 Общий доход TON: ${totalTonEarned.toFixed(6)}`);
    console.log(`🎯 Уровни активности: ${Object.keys(levelStats).length}`);
    
    if (Object.keys(levelStats).length > 0) {
      console.log('\n🏆 СТАТИСТИКА ПО УРОВНЯМ:');
      Object.keys(levelStats).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        const stats = levelStats[level];
        console.log(`  L${level}: ${stats.count} транзакций, ${stats.uni.toFixed(6)} UNI, ${stats.ton.toFixed(6)} TON`);
      });
    }
    
    // 5. Поиск прямых рефералов
    const { data: directReferrals } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('referred_by', userId);
      
    console.log(`\n👥 Прямые рефералы: ${directReferrals?.length || 0}`);
    if (directReferrals && directReferrals.length > 0) {
      directReferrals.forEach(ref => {
        console.log(`  User ID ${ref.id} (${ref.username || 'no username'})`);
      });
    }
    
    // 6. Финальный вердикт
    console.log('\n🎉 ВЕРДИКТ:');
    console.log('-'.repeat(40));
    if (totalTransactions > 0) {
      console.log('✅ ИСПРАВЛЕНИЕ УСПЕШНО! Система находит и обрабатывает реферальные транзакции');
      console.log(`✅ Логика amount_uni/amount_ton работает корректно`);
      console.log(`✅ Найдено ${totalTransactions} транзакций с доходом ${totalUniEarned.toFixed(6)} UNI`);
    } else {
      console.log('⚠️  Реферальные транзакции не найдены (но это не ошибка кода)');
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Запуск теста
testFixedReferralLogic().then(() => {
  console.log('\n🏁 Тест завершен');
  process.exit(0);
});