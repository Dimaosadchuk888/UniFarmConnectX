/**
 * ПРЯМОЕ ТЕСТИРОВАНИЕ REFERRALSERVICE БЕЗ API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU0NjE3MiwiZXhwIjoyMDQ2MTIyMTcyfQ.qe7iifh-kILRJoJT1Wvp6T7pBR1F7YRzLiHb9tREf7I';

const supabase = createClient(supabaseUrl, supabaseKey);

class TestReferralService {
  
  async getRealReferralStats(userId) {
    try {
      console.log('🔍 [ReferralService] Получение реальной статистики партнерской программы', { userId });

      // Сначала проверим, существует ли пользователь
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, ref_code')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.log('❌ [ReferralService] Пользователь не найден', { userId, error: userError?.message });
        throw new Error('Пользователь не найден');
      }

      console.log('✅ [ReferralService] Пользователь найден', { user });

      // 1. Получаем все реферальные транзакции
      const { data: referralTransactions, error: refError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('description', '%referral%')
        .order('created_at', { ascending: false });

      if (refError) {
        console.log('❌ [ReferralService] Ошибка получения реферальных транзакций', {
          userId,
          error: refError.message
        });
        throw refError;
      }

      console.log(`✅ Найдено ${referralTransactions?.length || 0} реферальных транзакций`);

      // 2. Получаем всех пользователей для построения реферальной цепочки
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, first_name, referred_by, balance_uni, balance_ton, uni_farming_start_timestamp, ton_boost_package')
        .order('id', { ascending: true });

      if (usersError) {
        console.log('❌ [ReferralService] Ошибка получения пользователей', { error: usersError.message });
        throw usersError;
      }

      console.log(`✅ Найдено ${allUsers?.length || 0} пользователей в системе`);

      return {
        success: true,
        user: user,
        transactions: referralTransactions?.length || 0,
        totalUsers: allUsers?.length || 0
      };

    } catch (error) {
      console.log('❌ [ReferralService] Ошибка получения реальной статистики', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
}

async function testServiceDirect() {
  console.log('🔍 ПРЯМОЕ ТЕСТИРОВАНИЕ ReferralService');
  console.log('='.repeat(70));
  
  const userId = 48;
  const service = new TestReferralService();
  
  try {
    const result = await service.getRealReferralStats(userId);
    console.log('✅ УСПЕШНЫЙ РЕЗУЛЬТАТ:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ ОШИБКА СЕРВИСА:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

testServiceDirect().catch(console.error);