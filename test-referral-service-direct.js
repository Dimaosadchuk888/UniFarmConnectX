/**
 * Прямой тест ReferralService.getRealReferralStats
 */
import { ReferralService } from './modules/referral/service.ts';
import dotenv from 'dotenv';

dotenv.config();

async function testReferralServiceDirect() {
  console.log('🔍 ПРЯМОЕ ТЕСТИРОВАНИЕ ReferralService.getRealReferralStats');
  console.log('='.repeat(70));

  try {
    const referralService = new ReferralService();
    
    console.log('📡 Вызываем getRealReferralStats с userId=48...');
    
    const result = await referralService.getRealReferralStats(48);
    
    console.log('✅ РЕЗУЛЬТАТ ПОЛУЧЕН:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('💥 ОШИБКА В СЕРВИСЕ:', error.message);
    console.error('📋 СТЕК ОШИБКИ:', error.stack);
  }
}

testReferralServiceDirect().catch(console.error);