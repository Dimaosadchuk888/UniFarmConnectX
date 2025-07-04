/**
 * Тест импорта referral routes
 */
import dotenv from 'dotenv';
dotenv.config();

async function testReferralImport() {
  console.log('🔍 ТЕСТИРОВАНИЕ ИМПОРТА REFERRAL ROUTES');
  console.log('='.repeat(50));

  try {
    console.log('📦 Попытка импорта routes...');
    const routes = await import('./modules/referral/routes.ts');
    console.log('✅ Routes импортированы успешно:', !!routes.default);
    
    console.log('🎯 Попытка импорта controller...');
    const controller = await import('./modules/referral/controller.ts');
    console.log('✅ Controller импортирован успешно:', !!controller.ReferralController);
    
    console.log('🎯 Попытка импорта service...');
    const service = await import('./modules/referral/service.ts');
    console.log('✅ Service импортирован успешно:', !!service.ReferralService);
    
    console.log('\n🔧 Создание экземпляров...');
    const controllerInstance = new controller.ReferralController();
    console.log('✅ Controller создан:', !!controllerInstance);
    
    const serviceInstance = new service.ReferralService();
    console.log('✅ Service создан:', !!serviceInstance);
    
  } catch (error) {
    console.error('💥 ОШИБКА ИМПОРТА:', error.message);
    console.error('📋 СТЕК:', error.stack);
  }
}

testReferralImport().catch(console.error);