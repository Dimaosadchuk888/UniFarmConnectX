/**
 * ОТЛАДКА КОНТРОЛЛЕРА REFERRALCONTROLLER
 * Имитирует точный вызов API для диагностики
 */
import { ReferralController } from './modules/referral/controller.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugController() {
  console.log('🔍 ОТЛАДКА ReferralController.getReferralLevelsStats()');
  console.log('='.repeat(70));

  try {
    const controller = new ReferralController();
    
    // Имитируем req и res объекты
    const mockReq = {
      user: { id: 48 },
      params: {},
      query: { user_id: 48 },
      headers: {
        'user-agent': 'Test-Agent',
        'authorization': 'Bearer test-token'
      }
    };

    const mockRes = {
      json: (data) => {
        console.log('✅ ОТВЕТ КОНТРОЛЛЕРА:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        console.log('📊 HTTP Status:', code);
        return mockRes;
      }
    };

    console.log('📡 Вызываем getReferralLevelsStats...');
    
    await controller.getReferralLevelsStats(mockReq, mockRes);
    
  } catch (error) {
    console.error('💥 Ошибка в отладке контроллера:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugController();