/**
 * Принудительное обновление данных на production сервере
 */

const PRODUCTION_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

async function forceProductionUpdate() {
  console.log('🚀 Принудительное обновление production сервера...');
  
  try {
    // Попробуем несколько способов принудительного обновления
    
    // 1. Admin запрос на обновление кэша
    console.log('🔄 1. Попытка admin обновления кэша...');
    const adminResponse = await fetch(`${PRODUCTION_URL}/api/admin/refresh-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true, timestamp: Date.now() })
    });
    
    if (adminResponse.ok) {
      console.log('✅ Admin обновление успешно');
    } else {
      console.log('❌ Admin API недоступен:', adminResponse.status);
    }
    
    // 2. Принудительный запрос к API миссий с параметрами очистки кэша
    console.log('🔄 2. Принудительный запрос миссий...');
    const missionsResponse = await fetch(`${PRODUCTION_URL}/api/v2/missions/active?force_refresh=true&cache_bust=${Date.now()}`, {
      method: 'GET',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const missionsData = await missionsResponse.json();
    console.log('📊 Текущие миссии:', missionsData.data?.length || 0);
    
    if (missionsData.data) {
      missionsData.data.forEach((mission, index) => {
        console.log(`   ${index + 1}. ${mission.title} → ${mission.reward_uni} UNI`);
      });
    }
    
    // 3. Попытка перезагрузки через health check
    console.log('🔄 3. Health check с принудительной перезагрузкой...');
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health?reload=true&timestamp=${Date.now()}`);
    
    if (healthResponse.ok) {
      console.log('✅ Health check успешен');
    }
    
    console.log('\n🎯 Принудительное обновление завершено!');
    console.log('📱 Попробуйте обновить приложение в Telegram сейчас');
    
  } catch (error) {
    console.error('❌ Ошибка принудительного обновления:', error.message);
  }
}

forceProductionUpdate();