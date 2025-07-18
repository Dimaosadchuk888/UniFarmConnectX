/**
 * Проверка полной цепочки отображения партнеров
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verifyReferralChain() {
  console.log('\n🔍 ПРОВЕРКА ЦЕПОЧКИ ОТОБРАЖЕНИЯ ПАРТНЕРОВ');
  console.log('='.repeat(60));

  try {
    // 1. Проверяем вызов processReferral в auth/service.ts
    console.log('\n📋 1. ПРОВЕРКА ВЫЗОВА processReferral()');
    
    // Найдем User 197 (новый пользователь)
    const { data: user197 } = await supabase
      .from('users')
      .select('*')
      .eq('id', 197)
      .single();
    
    if (!user197) {
      console.log('❌ User 197 не найден!');
      return;
    }
    
    console.log(`✅ User 197 найден: ${user197.username}`);
    console.log(`   Referred By: ${user197.referred_by}`);
    console.log(`   Ref Code: ${user197.ref_code}`);
    console.log(`   Created: ${user197.created_at}`);
    
    // 2. Проверяем, что должно быть в API /api/v2/referrals/stats
    console.log('\n📋 2. ПРОВЕРКА API /api/v2/referrals/stats');
    
    const { data: apiStats } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_user:users!referrals_user_id_fkey(
          id,
          username,
          telegram_id,
          ref_code,
          created_at
        )
      `)
      .eq('referrer_id', 184);
    
    console.log(`   Записей в referrals для User 184: ${apiStats?.length || 0}`);
    
    if (apiStats && apiStats.length > 0) {
      apiStats.forEach((ref, index) => {
        console.log(`   ${index + 1}. Level ${ref.level}: ${ref.referred_user?.username} (ID: ${ref.referred_user?.id})`);
      });
    }
    
    // 3. Проверяем что возвращает метод getRealReferralStats
    console.log('\n📋 3. ПРОВЕРКА МЕТОДА getRealReferralStats');
    
    // Имитируем вызов getRealReferralStats
    const { data: userInfo } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', 184)
      .single();
    
    const { data: partnersCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referrer_id', 184);
    
    console.log(`   User Info: ${userInfo?.username || 'Unknown'}`);
    console.log(`   Partners Count: ${partnersCount?.length || 0}`);
    
    // 4. Проверяем фронтенд компонент ReferralStats
    console.log('\n📋 4. АНАЛИЗ ФРОНТЕНД КОМПОНЕНТА');
    console.log('   Компонент: ReferralStats.tsx');
    console.log('   API Endpoint: /api/v2/referrals/stats');
    console.log('   Метод: getRealReferralStats');
    
    // 5. Проверяем корневую причину
    console.log('\n📋 5. КОРНЕВАЯ ПРИЧИНА');
    
    if (user197.referred_by === null) {
      console.log('❌ ПРОБЛЕМА: processReferral() НЕ ВЫЗЫВАЕТСЯ!');
      console.log('   Решение: Добавить вызов processReferral() в auth/service.ts');
      console.log('   Место: После создания пользователя в authenticateUser()');
    } else {
      console.log('✅ referred_by заполнен правильно');
    }
    
    if (!apiStats || apiStats.length === 0) {
      console.log('❌ ПРОБЛЕМА: Таблица referrals пуста!');
      console.log('   Решение: processReferral() должен создать запись в referrals');
    } else {
      console.log('✅ Таблица referrals содержит данные');
    }

    return {
      user197,
      apiStats,
      partnersCount: partnersCount?.length || 0
    };

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
    return null;
  }
}

verifyReferralChain().then((result) => {
  if (result) {
    console.log('\n✅ Проверка цепочки завершена');
    console.log('🎯 Требуется: добавить вызов processReferral() в auth/service.ts');
  }
}).catch(error => {
  console.error('❌ Ошибка:', error);
});