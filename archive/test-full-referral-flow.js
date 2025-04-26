/**
 * Полный тест логики обработки реферальных кодов
 * 
 * Эмулирует процесс:
 * 1. Извлечение кода из URL
 * 2. Валидация кода
 * 3. Сохранение кода в "localStorage"
 * 4. Получение кода при регистрации
 */

// Эмуляция локального хранилища
const mockLocalStorage = {
  storage: {},
  setItem(key, value) {
    this.storage[key] = value;
    console.log(`[localStorage] Данные сохранены в ${key}:`, value);
  },
  getItem(key) {
    console.log(`[localStorage] Данные запрошены из ${key}:`, this.storage[key] || null);
    return this.storage[key] || null;
  },
  removeItem(key) {
    console.log(`[localStorage] Данные удалены из ${key}`);
    delete this.storage[key];
  }
};

// Константы
const REFERRAL_CODE_KEY = 'unifarm_referral_code';
const REFERRAL_CODE_TTL = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

// Типы для данных
class StoredReferralCode {
  constructor(code, timestamp) {
    this.code = code;
    this.timestamp = timestamp;
  }
}

// Сервис для работы с реферальными кодами
class ReferralServiceSimulator {
  constructor(localStorage) {
    this.localStorage = localStorage;
  }

  // Извлекает параметр ref_code из URL
  getRefCodeFromUrl(url) {
    try {
      const urlObject = new URL(url);
      const ref_code = urlObject.searchParams.get('ref_code');
      console.log(`[ReferralService] Извлечение параметра ref_code из URL: ${ref_code || 'не найден'}`);
      return ref_code;
    } catch (error) {
      console.error('[ReferralService] Ошибка при извлечении параметра ref_code из URL:', error);
      return null;
    }
  }

  // Проверяет валидность реферального кода
  isValidRefCode(code) {
    if (!code) return false;
    const isValid = /^[a-zA-Z0-9]{6,16}$/.test(code);
    console.log(`[ReferralService] Проверка валидности реферального кода "${code}": ${isValid ? 'валидный' : 'невалидный'}`);
    return isValid;
  }

  // Сохраняет реферальный код в локальное хранилище
  saveRefCode(code) {
    try {
      if (!this.isValidRefCode(code)) {
        console.warn(`[ReferralService] Попытка сохранить невалидный реферальный код: ${code}`);
        return;
      }

      const data = new StoredReferralCode(code, Date.now());
      this.localStorage.setItem(REFERRAL_CODE_KEY, JSON.stringify(data));
      console.log(`[ReferralService] Реферальный код "${code}" сохранен в локальное хранилище`);
    } catch (error) {
      console.error('[ReferralService] Ошибка при сохранении реферального кода:', error);
    }
  }

  // Получает сохраненный реферальный код из локального хранилища
  getSavedRefCode() {
    try {
      const storedData = this.localStorage.getItem(REFERRAL_CODE_KEY);
      
      if (!storedData) {
        console.log('[ReferralService] В локальном хранилище нет сохраненного реферального кода');
        return null;
      }
      
      const data = JSON.parse(storedData);
      
      // Проверяем, не устарел ли код
      const now = Date.now();
      if (now - data.timestamp > REFERRAL_CODE_TTL) {
        console.log('[ReferralService] Сохраненный реферальный код устарел и будет удален');
        this.localStorage.removeItem(REFERRAL_CODE_KEY);
        return null;
      }
      
      console.log(`[ReferralService] Получен сохраненный реферальный код: ${data.code}`);
      return data.code;
    } catch (error) {
      console.error('[ReferralService] Ошибка при получении сохраненного реферального кода:', error);
      return null;
    }
  }

  // Удаляет сохраненный реферальный код
  clearSavedRefCode() {
    try {
      this.localStorage.removeItem(REFERRAL_CODE_KEY);
      console.log('[ReferralService] Сохраненный реферальный код удален из локального хранилища');
    } catch (error) {
      console.error('[ReferralService] Ошибка при удалении сохраненного реферального кода:', error);
    }
  }

  // Инициализирует обработку реферальных кодов
  initialize(url) {
    console.log('[ReferralService] Инициализация...');
    
    // Проверяем, есть ли в URL параметр ref_code
    const refCodeFromUrl = this.getRefCodeFromUrl(url);
    
    if (refCodeFromUrl && this.isValidRefCode(refCodeFromUrl)) {
      console.log(`[ReferralService] Найден валидный реферальный код в URL: ${refCodeFromUrl}`);
      
      // Сохраняем его в локальное хранилище
      this.saveRefCode(refCodeFromUrl);
      
      // Логируем событие для аналитики
      console.log(`[АУДИТ] Обработан реферальный код из URL: ${refCodeFromUrl}, guest_id: test-guest-id`);
    } else {
      console.log('[ReferralService] В URL не найден валидный реферальный код');
    }
  }

  // Получает реферальный код для использования при регистрации
  getReferralCodeForRegistration(url) {
    // Сначала проверяем URL (приоритет выше)
    const refCodeFromUrl = this.getRefCodeFromUrl(url);
    
    if (refCodeFromUrl && this.isValidRefCode(refCodeFromUrl)) {
      console.log(`[ReferralService] Используем реферальный код из URL для регистрации: ${refCodeFromUrl}`);
      return refCodeFromUrl;
    }
    
    // Если в URL нет кода, проверяем локальное хранилище
    const savedRefCode = this.getSavedRefCode();
    
    if (savedRefCode) {
      console.log(`[ReferralService] Используем сохраненный реферальный код для регистрации: ${savedRefCode}`);
      return savedRefCode;
    }
    
    console.log('[ReferralService] Нет доступного реферального кода для регистрации');
    return null;
  }
}

// Тестовые данные
const testScenarios = [
  {
    name: 'Сценарий 1: Валидный код в URL',
    url: 'https://example.com/?ref_code=QltFGzKh',
    expectedCode: 'QltFGzKh'
  },
  {
    name: 'Сценарий 2: Валидный код в localStorage (без URL)',
    url: 'https://example.com/',
    prepareStorage: (service) => {
      service.saveRefCode('ABCDEF123');
    },
    expectedCode: 'ABCDEF123'
  },
  {
    name: 'Сценарий 3: Невалидный код в URL',
    url: 'https://example.com/?ref_code=ABC',
    expectedCode: null
  },
  {
    name: 'Сценарий 4: Приоритет URL над localStorage',
    url: 'https://example.com/?ref_code=URL12345',
    prepareStorage: (service) => {
      service.saveRefCode('STOR12345');
    },
    expectedCode: 'URL12345'
  },
  {
    name: 'Сценарий 5: Устаревший код в localStorage',
    url: 'https://example.com/',
    prepareStorage: (service) => {
      // Создаем код с timestamp, который старше TTL
      const expiredData = new StoredReferralCode('EXPIRED12', Date.now() - (REFERRAL_CODE_TTL + 1000));
      service.localStorage.setItem(REFERRAL_CODE_KEY, JSON.stringify(expiredData));
    },
    expectedCode: null
  }
];

// Запускаем тестирование
async function runTests() {
  console.log('='.repeat(60));
  console.log('Тестирование полного цикла обработки реферальных кодов');
  console.log('='.repeat(60));
  
  for (const scenario of testScenarios) {
    console.log('\n' + '-'.repeat(60));
    console.log(`Тестируем: ${scenario.name}`);
    console.log('-'.repeat(60));
    
    // Создаем новый экземпляр для каждого теста
    const localStorage = {...mockLocalStorage, storage: {}};
    const referralService = new ReferralServiceSimulator(localStorage);
    
    // Подготавливаем хранилище, если нужно
    if (scenario.prepareStorage) {
      scenario.prepareStorage(referralService);
    }
    
    // Инициализируем сервис с URL
    referralService.initialize(scenario.url);
    
    // Получаем код для регистрации
    const registrationCode = referralService.getReferralCodeForRegistration(scenario.url);
    
    // Проверяем результат
    console.log('\nРезультат теста:');
    if (registrationCode === scenario.expectedCode) {
      console.log(`✅ УСПЕХ: Получен ожидаемый код для регистрации: ${registrationCode === null ? 'null' : registrationCode}`);
    } else {
      console.log(`❌ ОШИБКА: Получен код ${registrationCode}, но ожидался ${scenario.expectedCode}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Тестирование завершено!');
  console.log('='.repeat(60));
}

// Запускаем тесты
runTests().catch(console.error);