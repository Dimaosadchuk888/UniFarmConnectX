/**
 * ТЕСТИРОВАНИЕ API ПАРТНЕРСКОЙ СИСТЕМЫ
 * Проверка реальных данных для user_id=48
 */

import { createClient } from '@supabase/supabase-js';

async function testReferralAPI() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 ТЕСТИРОВАНИЕ API ПАРТНЕРСКОЙ СИСТЕМЫ ДЛЯ USER_ID=48');
  console.log('='.repeat(70));
  
  const userId = 48;
  
  // 1. АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ ПО УРОВНЯМ
  console.log('\n💰 1. РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ ПО УРОВНЯМ:');
  console.log('-'.repeat(50));
  
  const { data: referralTransactions, error: refError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false });
  
  if (!refError && referralTransactions?.length > 0) {
    console.log(`✅ Найдено реферальных транзакций: ${referralTransactions.length}`);
    
    // Группируем по уровням
    const levelIncome = {};
    const levelCounts = {};
    
    referralTransactions.forEach(tx => {
      // Извлекаем уровень из описания
      const levelMatch = tx.description.match(/L(\d+)/i) || tx.description.match(/level (\d+)/i);
      const level = levelMatch ? parseInt(levelMatch[1]) : 1;
      
      if (!levelIncome[level]) {
        levelIncome[level] = { uni: 0, ton: 0 };
        levelCounts[level] = 0;
      }
      
      levelCounts[level]++;
      
      if (tx.amount_uni) {
        levelIncome[level].uni += parseFloat(tx.amount_uni);
      }
      if (tx.amount_ton) {
        levelIncome[level].ton += parseFloat(tx.amount_ton);
      }
    });
    
    console.log('\n📊 ДОХОДЫ ПО УРОВНЯМ:');
    Object.keys(levelIncome).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      const income = levelIncome[level];
      const count = levelCounts[level];
      console.log(`   Уровень ${level}: ${count} транзакций | ${income.uni.toFixed(6)} UNI + ${income.ton.toFixed(6)} TON`);
    });
    
    const totalUni = Object.values(levelIncome).reduce((sum, income) => sum + income.uni, 0);
    const totalTon = Object.values(levelIncome).reduce((sum, income) => sum + income.ton, 0);
    
    console.log(`\n💰 Общий доход: ${totalUni.toFixed(6)} UNI + ${totalTon.toFixed(6)} TON`);
    
    // Показываем последние транзакции
    console.log('\n📋 ПОСЛЕДНИЕ РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ:');
    referralTransactions.slice(0, 10).forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      const dateStr = new Date(tx.created_at).toLocaleString('ru-RU');
      console.log(`   ${idx + 1}. [${dateStr}] +${amount} ${currency} | ${tx.description}`);
    });
    
    // 2. СТРУКТУРА ПАРТНЕРОВ ПО УРОВНЯМ
    console.log('\n👥 2. СТРУКТУРА ПАРТНЕРОВ ПО УРОВНЯМ:');
    console.log('-'.repeat(50));
    
    // Строим реферальную цепочку
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, referred_by, balance_uni, balance_ton, uni_farming_active, ton_boost_package')
      .not('referred_by', 'is', null);
    
    if (!usersError && allUsers?.length > 0) {
      // Находим всех пользователей в цепочке от user_id=48
      function findReferralChain(startUserId, users, level = 1, visited = new Set()) {
        if (level > 20 || visited.has(startUserId)) return [];
        
        visited.add(startUserId);
        
        const directReferrals = users.filter(u => u.referred_by === startUserId);
        let chain = [];
        
        directReferrals.forEach(referral => {
          chain.push({
            ...referral,
            level: level,
            referrer_id: startUserId
          });
          
          // Рекурсивно находим рефералов этого пользователя
          const subChain = findReferralChain(referral.id, users, level + 1, visited);
          chain.push(...subChain);
        });
        
        return chain;
      }
      
      const referralChain = findReferralChain(userId, allUsers);
      
      // Группируем по уровням
      const partnersByLevel = {};
      referralChain.forEach(partner => {
        if (!partnersByLevel[partner.level]) {
          partnersByLevel[partner.level] = [];
        }
        partnersByLevel[partner.level].push(partner);
      });
      
      console.log('📊 ПАРТНЕРЫ ПО УРОВНЯМ:');
      for (let level = 1; level <= 20; level++) {
        const partners = partnersByLevel[level] || [];
        const activeUni = partners.filter(p => p.uni_farming_active === true).length;
        const activeTon = partners.filter(p => p.ton_boost_package && p.ton_boost_package > 0).length;
        
        if (partners.length > 0) {
          console.log(`   Уровень ${level}: ${partners.length} партнеров | UNI фарминг: ${activeUni} | TON Boost: ${activeTon}`);
          
          // Показываем первых 3 партнеров
          partners.slice(0, 3).forEach((partner, idx) => {
            console.log(`     ${idx + 1}. ${partner.username} (ID: ${partner.id}) | Балансы: ${partner.balance_uni} UNI, ${partner.balance_ton} TON`);
          });
          
          if (partners.length > 3) {
            console.log(`     ... и еще ${partners.length - 3} партнеров`);
          }
        } else {
          console.log(`   Уровень ${level}: 0 партнеров`);
        }
      }
      
      console.log(`\n📈 Общая структура: ${referralChain.length} партнеров на ${Object.keys(partnersByLevel).length} уровнях`);
      
      // 3. ФОРМИРОВАНИЕ JSON ДЛЯ API
      console.log('\n📋 3. JSON СТРУКТУРА ДЛЯ API:');
      console.log('-'.repeat(50));
      
      const apiResponse = {
        success: true,
        data: {
          user_id: userId,
          username: "demo_user",
          total_referrals: referralChain.length,
          referral_counts: {},
          level_income: levelIncome,
          referrals: referralChain
        }
      };
      
      // Заполняем количество партнеров по уровням
      for (let level = 1; level <= 20; level++) {
        apiResponse.data.referral_counts[level] = partnersByLevel[level]?.length || 0;
      }
      
      console.log('✅ JSON для /api/v2/referrals/stats:');
      console.log(JSON.stringify(apiResponse, null, 2));
      
    } else {
      console.log('❌ Ошибка получения партнеров:', usersError?.message);
    }
    
  } else {
    console.log('📝 Реферальные транзакции не найдены');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ТЕСТИРОВАНИЕ API ЗАВЕРШЕНО');
}

testReferralAPI().catch(console.error);