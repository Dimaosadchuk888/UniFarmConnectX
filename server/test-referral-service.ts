import { ReferralService } from '../modules/referral/service.js';

async function testReferralService() {
  console.log('=== ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    const referralService = new ReferralService();
    
    // Тестируем начисление реферальных комиссий для реферала test_user_L1_1 (ID: 114)
    const testUserId = '114';
    const testAmount = '100'; // 100 UNI тестовый доход
    
    console.log(`Тестируем начисление реферальных комиссий:`);
    console.log(`- Пользователь: ${testUserId}`);
    console.log(`- Сумма дохода: ${testAmount} UNI`);
    console.log(`- Ожидаемая комиссия для User 74: 5 UNI (5% от дохода)\n`);
    
    const result = await referralService.distributeReferralRewards(
      testUserId,
      testAmount,
      'UNI',
      'farming'
    );
    
    console.log('Результат:');
    console.log(`- Распределено уровней: ${result.distributed}`);
    console.log(`- Общая сумма комиссий: ${result.totalAmount} UNI`);
    console.log(`- Успешно: ${result.success ? '✅' : '❌'}`);
    
    if (result.details) {
      console.log('\nДетали распределения:');
      result.details.forEach((detail: any, index: number) => {
        console.log(`Уровень ${index + 1}: User ${detail.userId} получил ${detail.amount} UNI`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testReferralService();