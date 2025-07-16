import { supabase } from '../core/supabase.js';

async function checkAllReferrals() {
  console.log('=== ПОЛНАЯ ПРОВЕРКА РЕФЕРАЛОВ ===\n');
  
  try {
    // 1. Прямые рефералы пользователя 74 (первый уровень)
    const { data: directReferrals, error: directError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('referred_by', 74);
      
    if (directError) throw directError;
    
    console.log(`📊 ПРЯМЫЕ РЕФЕРАЛЫ (1-й уровень) пользователя 74:`);
    console.log(`Количество: ${directReferrals?.length || 0}\n`);
    
    // 2. Все пользователи созданные сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayUsers, error: todayError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .gte('created_at', today.toISOString())
      .order('id', { ascending: true });
      
    if (todayError) throw todayError;
    
    console.log(`📅 ВСЕ ПОЛЬЗОВАТЕЛИ СОЗДАННЫЕ СЕГОДНЯ:`);
    console.log(`Количество: ${todayUsers?.length || 0}\n`);
    
    // 3. Анализ структуры рефералов
    console.log(`🔍 АНАЛИЗ СТРУКТУРЫ:`);
    
    // Группируем по referred_by
    const referralStructure = new Map<number, number>();
    todayUsers?.forEach(user => {
      if (user.referred_by) {
        referralStructure.set(user.referred_by, (referralStructure.get(user.referred_by) || 0) + 1);
      }
    });
    
    // Показываем топ пригласителей
    const topInviters = Array.from(referralStructure.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    console.log('Топ пригласителей:');
    topInviters.forEach(([inviterId, count]) => {
      const inviter = todayUsers?.find(u => u.id === inviterId) || 
                      directReferrals?.find(u => u.id === inviterId);
      const inviterName = inviter?.username || (inviterId === 74 ? 'test_user_1752129840905 (User 74)' : `User ${inviterId}`);
      console.log(`- ${inviterName}: ${count} рефералов`);
    });
    
    // 4. Проверка всех пользователей с test_ или ref_ в имени
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .or('username.ilike.test_user_L%,username.ilike.ref_L%');
      
    if (!testError && testUsers) {
      console.log(`\n🧪 ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ:`);
      console.log(`Всего найдено: ${testUsers.length}`);
      
      // Группируем по уровням
      const byLevel = new Map<string, number>();
      testUsers.forEach(user => {
        const match = user.username.match(/L(\d+)/);
        if (match) {
          const level = match[1];
          byLevel.set(level, (byLevel.get(level) || 0) + 1);
        }
      });
      
      console.log('\nПо уровням:');
      Array.from(byLevel.entries())
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([level, count]) => {
          console.log(`- Уровень ${level}: ${count} пользователей`);
        });
    }
    
    // 5. Итоговая статистика
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`- Прямых рефералов у User 74: ${directReferrals?.length || 0}`);
    console.log(`- Всего создано сегодня: ${todayUsers?.length || 0}`);
    console.log(`- Из них тестовых: ${testUsers?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkAllReferrals();