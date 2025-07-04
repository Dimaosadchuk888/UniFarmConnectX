/**
 * ПРЯМОЕ ТЕСТИРОВАНИЕ METODA getRealReferralStats БЕЗ API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class TestReferralService {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }

  async getRealReferralStats(userId) {
    try {
      console.log('🔍 Начинаем тестирование getRealReferralStats для userId:', userId);
      
      // Точно такой же код как в оригинальном методе
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, username, ref_code')
        .eq('id', userId)
        .single();
        
      console.log('📊 Результат поиска пользователя:', {
        hasUser: !!user,
        userError: userError,
        userData: user
      });

      if (userError || !user) {
        console.log('❌ Пользователь не найден, создаем fallback');
        throw new Error('Пользователь не найден'); // Воспроизводим оригинальную логику
      }

      console.log('✅ Пользователь найден, продолжаем обработку');
      
      // Получаем все транзакции
      const { data: referralTransactions, error: refError } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'REFERRAL_REWARD');
        
      console.log('📈 Реферальные транзакции:', {
        count: referralTransactions?.length || 0,
        error: refError?.message || 'нет'
      });

      // Пробуем получить список всех пользователей для реферальной цепочки
      const { data: allUsers, error: usersError } = await this.supabase
        .from('users')
        .select('id, username, referred_by, ref_code')
        .limit(100);
        
      console.log('👥 Все пользователи для реферальной системы:', {
        count: allUsers?.length || 0,
        error: usersError?.message || 'нет'
      });

      return {
        success: true,
        data: {
          user_id: userId,
          username: user.username,
          total_referrals: 0,
          referral_counts: {},
          level_income: {},
          referrals: []
        }
      };
      
    } catch (error) {
      console.error('❌ Ошибка в тестовом методе:', error.message);
      throw error; // Пробрасываем ошибку дальше
    }
  }
}

async function testReferralMethodDirect() {
  console.log('🚀 Запускаем прямое тестирование метода ReferralService...\n');
  
  const testService = new TestReferralService();
  
  try {
    const result = await testService.getRealReferralStats(48);
    console.log('\n✅ Метод выполнен успешно:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('\n❌ Метод завершился с ошибкой:');
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
  }
}

testReferralMethodDirect();