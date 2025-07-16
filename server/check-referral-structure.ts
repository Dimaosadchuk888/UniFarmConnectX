import { supabase } from '../core/supabase.js';

async function checkReferralStructure() {
  console.log('=== ПРОВЕРКА СТРУКТУРЫ РЕФЕРАЛОВ ===\n');
  
  try {
    // 1. Проверяем рефералов первого уровня у пользователя 74
    const { data: level1Referrals, error: level1Error } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_deposit_amount, created_at')
      .eq('referred_by', 74)
      .order('created_at', { ascending: false });
      
    if (level1Error) throw level1Error;
    
    console.log(`📊 РЕФЕРАЛЫ ПЕРВОГО УРОВНЯ (User 74):`);
    console.log(`Всего: ${level1Referrals?.length || 0} человек\n`);
    
    level1Referrals?.forEach((ref, i) => {
      console.log(`${i+1}. ${ref.username} (ID: ${ref.id})`);
      console.log(`   💰 Баланс: ${ref.balance_uni?.toLocaleString('ru-RU')} UNI, ${ref.balance_ton} TON`);
      console.log(`   📈 Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
      console.log(`   📅 Дата: ${new Date(ref.created_at).toLocaleString('ru-RU')}\n`);
    });
    
    // 2. Проверяем структуру по уровням (находим рефералов второго уровня)
    console.log('\n📊 СТРУКТУРА ПО УРОВНЯМ:\n');
    
    // Получаем ID рефералов первого уровня
    const level1Ids = level1Referrals?.map(r => r.id) || [];
    
    if (level1Ids.length > 0) {
      // Рефералы второго уровня
      const { data: level2Referrals, error: level2Error } = await supabase
        .from('users')
        .select('id, username, referred_by')
        .in('referred_by', level1Ids);
        
      if (!level2Error && level2Referrals) {
        console.log(`Уровень 2: ${level2Referrals.length} человек`);
        
        // Группируем по родителям
        const byParent = level2Referrals.reduce((acc, ref) => {
          if (!acc[ref.referred_by]) acc[ref.referred_by] = [];
          acc[ref.referred_by].push(ref);
          return acc;
        }, {} as Record<number, any[]>);
        
        Object.entries(byParent).forEach(([parentId, refs]) => {
          const parent = level1Referrals?.find(r => r.id === parseInt(parentId));
          console.log(`  └─ от ${parent?.username}: ${refs.length} рефералов`);
        });
      }
    }
    
    // 3. Проверяем доходы от реферальной системы
    console.log('\n💰 ДОХОДЫ ОТ РЕФЕРАЛОВ:\n');
    
    const { data: referralRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('amount, currency, description, created_at')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!rewardsError && referralRewards && referralRewards.length > 0) {
      console.log('Последние 10 начислений:');
      referralRewards.forEach((tx, i) => {
        console.log(`${i+1}. +${parseFloat(tx.amount).toLocaleString('ru-RU')} ${tx.currency}`);
        console.log(`   ${tx.description}`);
        console.log(`   ${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
      });
      
      // Общая сумма
      const totalUni = referralRewards
        .filter(tx => tx.currency === 'UNI')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
      const totalTon = referralRewards
        .filter(tx => tx.currency === 'TON')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
      console.log(`\n📊 ИТОГО ДОХОДОВ:`);
      if (totalUni > 0) console.log(`UNI: ${totalUni.toLocaleString('ru-RU')}`);
      if (totalTon > 0) console.log(`TON: ${totalTon.toLocaleString('ru-RU')}`);
    } else {
      console.log('Доходов от рефералов пока нет');
      console.log('(Они начисляются когда рефералы получают доход от фарминга)');
    }
    
    // 4. Показываем реферальную ссылку
    console.log('\n🔗 РЕФЕРАЛЬНАЯ ССЫЛКА:');
    console.log(`https://t.me/YourBotName?start=TEST_1752129840905_dokxv0`);
    console.log('(Используйте эту ссылку для приглашения новых пользователей)');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkReferralStructure();