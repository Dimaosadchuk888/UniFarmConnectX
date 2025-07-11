import { supabase } from './core/supabase';

async function checkReferralDBTables() {
  console.log('=== ПРОВЕРКА ТАБЛИЦ БД ДЛЯ ПАРТНЕРСКОЙ ПРОГРАММЫ ===\n');
  
  try {
    // 1. Проверяем структуру таблицы referrals
    console.log('1. Таблица referrals:');
    const { data: referralsStructure } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
      
    if (referralsStructure) {
      console.log('- Структура таблицы:', referralsStructure.length > 0 ? Object.keys(referralsStructure[0]) : 'таблица пустая');
    }
    
    const { count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });
      
    console.log('- Количество записей:', referralsCount || 0);
    
    // 2. Проверяем таблицу referral_earnings
    console.log('\n2. Таблица referral_earnings:');
    const { data: earningsStructure } = await supabase
      .from('referral_earnings')
      .select('*')
      .limit(1);
      
    if (earningsStructure) {
      console.log('- Структура таблицы:', earningsStructure.length > 0 ? Object.keys(earningsStructure[0]) : 'таблица пустая или не существует');
    }
    
    const { count: earningsCount } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact', head: true });
      
    console.log('- Количество записей:', earningsCount || 0);
    
    // 3. Проверяем реферальные поля в таблице users
    console.log('\n3. Реферальные поля в таблице users:');
    const { data: userSample } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
      
    const referralFields = Object.keys(userSample || {}).filter(field => 
      field.includes('ref') || field.includes('referr')
    );
    
    console.log('- Найденные реферальные поля:', referralFields);
    
    // 4. Проверяем целостность реферальных связей
    console.log('\n4. Целостность реферальных связей:');
    
    // Проверяем, есть ли пользователи с несуществующими реферерами
    const { data: usersWithReferrers } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .not('referred_by', 'is', null);
      
    const referrerIds = new Set(usersWithReferrers?.map(u => u.referred_by));
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .in('id', Array.from(referrerIds));
      
    const existingIds = new Set(existingUsers?.map(u => u.id));
    const missingReferrers = Array.from(referrerIds).filter(id => !existingIds.has(id));
    
    console.log('- Пользователей с реферерами:', usersWithReferrers?.length || 0);
    console.log('- Несуществующих реферов:', missingReferrers.length);
    if (missingReferrers.length > 0) {
      console.log('  IDs несуществующих реферов:', missingReferrers);
    }
    
    // 5. Проверяем транзакции REFERRAL_REWARD
    console.log('\n5. Транзакции REFERRAL_REWARD:');
    const { count: refTxCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'REFERRAL_REWARD');
      
    console.log('- Количество транзакций:', refTxCount || 0);
    
    // Проверяем последние транзакции
    const { data: recentRefTx } = await supabase
      .from('transactions')
      .select('created_at, user_id, amount_uni, amount_ton')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentRefTx && recentRefTx.length > 0) {
      console.log('- Последние транзакции:');
      recentRefTx.forEach(tx => {
        console.log(`  ${tx.created_at}: User ${tx.user_id} - ${tx.amount_uni} UNI, ${tx.amount_ton} TON`);
      });
    }
    
    // 6. Проверяем циклические связи
    console.log('\n6. Проверка циклических реферальных связей:');
    
    const checkCycles = (users: any[]) => {
      const visited = new Set<number>();
      const stack = new Set<number>();
      const cycles: number[][] = [];
      
      const dfs = (userId: number, path: number[] = []): boolean => {
        if (stack.has(userId)) {
          const cycleStart = path.indexOf(userId);
          cycles.push(path.slice(cycleStart));
          return true;
        }
        
        if (visited.has(userId)) return false;
        
        visited.add(userId);
        stack.add(userId);
        path.push(userId);
        
        const user = users.find(u => u.id === userId);
        if (user?.referred_by) {
          dfs(user.referred_by, [...path]);
        }
        
        stack.delete(userId);
        return false;
      };
      
      users.forEach(user => {
        if (!visited.has(user.id)) {
          dfs(user.id);
        }
      });
      
      return cycles;
    };
    
    const cycles = checkCycles(usersWithReferrers || []);
    console.log('- Найдено циклов:', cycles.length);
    if (cycles.length > 0) {
      console.log('- Циклические связи:', cycles);
    }
    
    // 7. Статистика реферальных уровней
    console.log('\n7. Статистика по уровням:');
    
    // Строим дерево рефералов для подсчета уровней
    const buildLevelStats = (users: any[]) => {
      const levelStats: Record<number, number> = {};
      
      // Находим корневых пользователей
      const roots = users.filter(u => !u.referred_by);
      
      const countLevels = (userId: number, level: number = 1) => {
        const referrals = users.filter(u => u.referred_by === userId);
        
        if (referrals.length > 0) {
          levelStats[level] = (levelStats[level] || 0) + referrals.length;
          
          referrals.forEach(ref => {
            countLevels(ref.id, level + 1);
          });
        }
      };
      
      roots.forEach(root => countLevels(root.id));
      
      return levelStats;
    };
    
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, referred_by');
      
    const levelStats = buildLevelStats(allUsers || []);
    
    console.log('Распределение по уровням:');
    Object.entries(levelStats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([level, count]) => {
        console.log(`- Уровень ${level}: ${count} пользователей`);
      });
      
    console.log('\n✅ Проверка таблиц БД завершена');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  }
}

checkReferralDBTables().catch(console.error);