/**
 * Прямой тест ReferralController.getReferralLevelsStats
 */
import { ReferralController } from './modules/referral/controller.ts';
import dotenv from 'dotenv';

dotenv.config();

async function testControllerDirect() {
  console.log('🔍 ПРЯМОЕ ТЕСТИРОВАНИЕ ReferralController.getReferralLevelsStats');
  console.log('='.repeat(70));

  try {
    const controller = new ReferralController();
    
    // Mock req/res objects
    const mockReq = {
      user: { id: 48 },
      params: {},
      query: { user_id: 48 },
      headers: {
        'user-agent': 'Test-Agent',
        'authorization': 'Bearer test-token'
      }
    };

    let responseData = null;
    let statusCode = 200;

    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log('✅ ОТВЕТ КОНТРОЛЛЕРА:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        statusCode = code;
        console.log('📊 HTTP Status:', code);
        return mockRes;
      }
    };

    console.log('📡 Вызываем getReferralLevelsStats...');
    
    await controller.getReferralLevelsStats(mockReq, mockRes);
    
    console.log('\n📋 ИТОГОВЫЙ РЕЗУЛЬТАТ:');
    console.log('Status Code:', statusCode);
    console.log('Response:', responseData ? 'Данные получены' : 'Данные отсутствуют');
    
  } catch (error) {
    console.error('💥 ОШИБКА В КОНТРОЛЛЕРЕ:', error.message);
    console.error('📋 СТЕК ОШИБКИ:', error.stack);
  }
}

testControllerDirect().catch(console.error);