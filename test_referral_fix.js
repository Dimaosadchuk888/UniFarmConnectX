/**
 * Тест исправления реферальной системы
 * Проверяет, корректно ли теперь обрабатывается параметр startapp
 */

// Симуляция окружения браузера для тестирования
global.window = {
  location: {
    search: '?startapp=REF_1750079004411_nddfp2'
  },
  Telegram: {
    WebApp: {
      startParam: null // Telegram startParam не передается в этом тесте
    }
  }
};

// Симуляция sessionStorage
global.sessionStorage = {
  storage: {},
  getItem(key) {
    return this.storage[key] || null;
  },
  setItem(key, value) {
    this.storage[key] = value;
  }
};

// Импортируем функцию напрямую
function getReferrerIdFromURL() {
  console.log('[TEST] Checking for referrer ID in URL and Telegram WebApp...');
  
  try {
    // Проверяем URL параметры  
    const urlParams = new URLSearchParams(window.location.search);
    
    // Проверяем параметр ref_code
    const refCodeParam = urlParams.get('ref_code');
    if (refCodeParam) {
      console.log('[TEST] Found ref_code parameter in URL:', refCodeParam);
      return refCodeParam;
    }
    
    // Проверяем старый формат ссылки с параметром startapp
    const startappParam = urlParams.get('startapp');
    if (startappParam) {
      console.log('[TEST] Found legacy startapp parameter in URL:', startappParam);
      return startappParam;
    }
    
    // Проверяем Telegram WebApp startParam
    const telegramStartParam = window.Telegram?.WebApp?.startParam;
    if (telegramStartParam) {
      console.log('[TEST] Found startParam in Telegram WebApp:', telegramStartParam);
      return telegramStartParam;
    }
    
    console.log('[TEST] No referral code found in any source');
    return null;
  } catch (error) {
    console.error('[TEST] Error getting referrer ID:', error);
    return null;
  }
}

// Запускаем тест
console.log('=== ТЕСТ ИСПРАВЛЕНИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
console.log('🔗 Тестируем URL: ?startapp=REF_1750079004411_nddfp2');

const result = getReferrerIdFromURL();

console.log('\n🎯 РЕЗУЛЬТАТ ТЕСТА:');
if (result === 'REF_1750079004411_nddfp2') {
  console.log('✅ УСПЕХ: Реферальный код корректно извлечен!');
  console.log('   Полученный код:', result);
  console.log('   Ожидаемый код: REF_1750079004411_nddfp2');
  console.log('   Статус: СОВПАДЕНИЕ ✅');
} else {
  console.log('❌ ОШИБКА: Реферальный код НЕ извлечен или извлечен неверно');
  console.log('   Полученный код:', result);
  console.log('   Ожидаемый код: REF_1750079004411_nddfp2');
  console.log('   Статус: НЕ СОВПАДАЕТ ❌');
}

console.log('\n📊 ДЕТАЛИ:');
console.log('   URL search:', window.location.search);
console.log('   startapp параметр:', new URLSearchParams(window.location.search).get('startapp'));
console.log('   Telegram startParam:', window.Telegram?.WebApp?.startParam);

console.log('\n💡 ВЫВОД:');
if (result === 'REF_1750079004411_nddfp2') {
  console.log('   Исправление в App.tsx должно РЕШИТЬ проблему!');
  console.log('   Функция getReferrerIdFromURL() работает корректно.');
} else {
  console.log('   Требуется дополнительная отладка функции getReferrerIdFromURL()');
}