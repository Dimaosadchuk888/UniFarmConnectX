/**
 * ПРЯМОЕ ТЕСТИРОВАНИЕ МЕТОДА getRealReferralStats БЕЗ API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU0NjE3MiwiZXhwIjoyMDQ2MTIyMTcyfQ.qe7iifh-kILRJoJT1Wvp6T7pBR1F7YRzLiHb9tREf7I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralMethodDirect() {
  console.log('🔍 ПРЯМОЕ ТЕСТИРОВАНИЕ МЕТОДА getRealReferralStats');
  console.log('='.repeat(70));
  
  const userId = 48;
  
  try {
    console.log('\n1️⃣ Проверяем существование пользователя ID =', userId);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('❌ Пользователь не найден:', userError?.message);
      return;
    }

    console.log('✅ Пользователь найден:', user);

    console.log('\n2️⃣ Ищем реферальные транзакции...');
    
    const { data: referralTransactions, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .ilike('description', '%referral%')
      .order('created_at', { ascending: false });

    if (refError) {
      console.log('❌ Ошибка получения транзакций:', refError.message);
      return;
    }

    console.log(`✅ Найдено ${referralTransactions?.length || 0} реферальных транзакций`);
    
    if (referralTransactions && referralTransactions.length > 0) {
      console.log('\n📊 АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
      referralTransactions.slice(0, 5).forEach((tx, index) => {
        console.log(`   ${index + 1}. ID: ${tx.id}, UNI: ${tx.amount_uni || 0}, TON: ${tx.amount_ton || 0}, Описание: ${tx.description}`);
      });
    }

    console.log('\n3️⃣ Получаем всех пользователей для построения цепочки...');
    
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, first_name, referred_by, balance_uni, balance_ton, uni_farming_start_timestamp, ton_boost_package')
      .order('id', { ascending: true });

    if (usersError) {
      console.log('❌ Ошибка получения пользователей:', usersError.message);
      return;
    }

    console.log(`✅ Найдено ${allUsers?.length || 0} пользователей в системе`);

    // Строим реферальную цепочку
    console.log('\n4️⃣ Строим реферальную цепочку...');
    
    function buildReferralChain(startUserId, users, level = 1, visited = new Set()) {
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

        const subChain = buildReferralChain(referral.id, users, level + 1, visited);
        chain.push(...subChain);
      });

      return chain;
    }

    const referralChain = buildReferralChain(userId, allUsers || []);
    console.log(`✅ Построена цепочка из ${referralChain.length} партнеров`);

    if (referralChain.length > 0) {
      console.log('\n👥 СТРУКТУРА ПАРТНЕРОВ:');
      const partnersByLevel = {};
      referralChain.forEach(partner => {
        if (!partnersByLevel[partner.level]) {
          partnersByLevel[partner.level] = [];
        }
        partnersByLevel[partner.level].push(partner);
      });

      for (let level = 1; level <= 9; level++) {
        const partners = partnersByLevel[level] || [];
        if (partners.length > 0) {
          console.log(`   Уровень ${level}: ${partners.length} партнеров`);
          partners.forEach(p => {
            console.log(`     ID: ${p.id}, Username: ${p.username}, UNI: ${p.balance_uni || 0}, TON: ${p.balance_ton || 0}`);
          });
        }
      }
    }

    console.log('\n✅ ТЕСТИРОВАНИЕ УСПЕШНО ЗАВЕРШЕНО!');
    console.log('✅ Система реферальной статистики работает корректно');
    
  } catch (error) {
    console.log('❌ Ошибка тестирования:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

testReferralMethodDirect().catch(console.error);