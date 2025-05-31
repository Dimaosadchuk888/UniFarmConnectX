/**
 * Сервис для безопасной работы с localStorage и sessionStorage
 * Обеспечивает кроссплатформенную совместимость и обработку ошибок
 * 
 * Основные функции:
 * - Сохранение и получение данных сессии
 * - Работа с guest_id пользователя  
 * - Обработка ошибок доступа к хранилищу
 * - Поддержка fallback сценариев
 */

// Типы данных для сессии
interface SessionData {
  guest_id?: string;
  guestId?: string; // Альтернативное поле для совместимости
  user_id?: number;
  userId?: number; // Альтернативное поле для совместимости
  telegram_user_id?: number;
  ref_code?: string;
  timestamp?: string;
  [key: string]: any; // Дополнительные поля
}

// Ключи для хранения данных
const SESSION_KEYS = {
  SESSION_DATA: 'unifarm_session_data',
  GUEST_ID: 'unifarm_guest_id',
  USER_ID: 'unifarm_user_id',
  REF_CODE: 'unifarm_ref_code'
} as const;

/**
 * Проверка доступности localStorage
 * @returns {boolean} true если localStorage доступен
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    // Проверка на возможность записи
    const testKey = '__test_localStorage__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('[SessionStorageService] localStorage недоступен:', error);
    return false;
  }
}

/**
 * Проверка доступности sessionStorage
 * @returns {boolean} true если sessionStorage доступен
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }

    // Проверка на возможность записи
    const testKey = '__test_sessionStorage__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('[SessionStorageService] sessionStorage недоступен:', error);
    return false;
  }
}

/**
 * Получает guest_id пользователя
 * @returns guest_id или null, если он не найден
 */
function getGuestId(): string | null {
  try {
    // Проверяем наличие guest_id в localStorage (приоритетный источник)
    if (isLocalStorageAvailable()) {
      const guestId = localStorage.getItem(SESSION_KEYS.GUEST_ID);
      if (guestId) {
        console.log('[SessionStorageService] ✅ guest_id получен из localStorage');
        return guestId;
      }
    }

    // Проверяем наличие guest_id в sessionStorage (запасной вариант)
    if (isSessionStorageAvailable()) {
      const guestId = sessionStorage.getItem(SESSION_KEYS.GUEST_ID);
      if (guestId) {
        console.log('[SessionStorageService] ✅ guest_id получен из sessionStorage');

        // Если нашли в sessionStorage, дублируем в localStorage для надежности
        if (isLocalStorageAvailable()) {
          localStorage.setItem(SESSION_KEYS.GUEST_ID, guestId);
          console.log('[SessionStorageService] Перенесли guest_id из sessionStorage в localStorage');
        }

        return guestId;
      }
    }

    // Если не нашли в отдельных ключах, пробуем извлечь из полных данных сессии
    const sessionData = sessionStorageService.getSession();
    if (sessionData && (sessionData.guest_id || sessionData.guestId)) {
      const foundGuestId = sessionData.guest_id || sessionData.guestId || null;
      if (foundGuestId) {
        console.log('[SessionStorageService] ✅ guest_id извлечен из данных сессии');

        // Сохраняем отдельно для удобства в будущем
        if (isLocalStorageAvailable()) {
          localStorage.setItem(SESSION_KEYS.GUEST_ID, foundGuestId);
        }

        return foundGuestId;
      }
    }

    console.log('[SessionStorageService] ❌ guest_id не найден ни в одном из хранилищ');
    return null;
  } catch (error) {
    console.error('[SessionStorageService] ❌ Ошибка при получении guest_id:', error);
    return null;
  }
}

/**
 * Основной сервис для работы с хранилищем
 */
const sessionStorageService = {
  /**
   * Сохраняет данные сессии в доступное хранилище
   * @param {SessionData} sessionData - Данные для сохранения
   * @returns {boolean} Результат операции сохранения
   */
  saveSession(sessionData: SessionData): boolean {
    if (!sessionData) {
      console.warn('[SessionStorageService] ⚠️ Попытка сохранить пустые данные сессии');
      return false;
    }

    try {
      const dataToSave = {
        ...sessionData,
        timestamp: new Date().toISOString()
      };

      const sessionDataStr = JSON.stringify(dataToSave);

      // Приоритет: localStorage, затем sessionStorage
      if (isLocalStorageAvailable()) {
        localStorage.setItem(SESSION_KEYS.SESSION_DATA, sessionDataStr);
        console.log('[SessionStorageService] ✅ Данные сессии сохранены в localStorage');

        // Дублируем guest_id отдельно для быстрого доступа
        if (sessionData.guest_id) {
          localStorage.setItem(SESSION_KEYS.GUEST_ID, sessionData.guest_id);
        }
      } else if (isSessionStorageAvailable()) {
        sessionStorage.setItem(SESSION_KEYS.SESSION_DATA, sessionDataStr);
        console.log('[SessionStorageService] ✅ Данные сессии сохранены в sessionStorage (localStorage недоступен)');
      } else {
        console.error('[SessionStorageService] ❌ Не удалось сохранить данные сессии - хранилища недоступны');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SessionStorageService] ❌ Ошибка при сохранении данных сессии:', error);

      // Попытка сохранить только самые важные данные в качестве аварийного сценария
      try {
        if (sessionData.guest_id && isLocalStorageAvailable()) {
          localStorage.setItem(SESSION_KEYS.GUEST_ID, sessionData.guest_id);
          console.log('[SessionStorageService] ✓ Сохранен только guest_id в аварийном режиме');
        } else if (sessionData.guest_id && isSessionStorageAvailable()) {
          sessionStorage.setItem(SESSION_KEYS.GUEST_ID, sessionData.guest_id);
          console.log('[SessionStorageService] ✓ Сохранен только guest_id в sessionStorage в аварийном режиме');
        }
      } catch (emergencyError) {
        console.error('[SessionStorageService] ❌ Критическая ошибка при аварийном сохранении guest_id:', emergencyError);
      }

      return false;
    }
  },

  /**
   * Получает данные сессии из доступного хранилища
   * @returns {SessionData | null} Данные сессии или null, если не найдены
   */
  getSession(): SessionData | null {
    try {
      let sessionData: SessionData | null = null;

      // Сначала пробуем localStorage
      if (isLocalStorageAvailable()) {
        const sessionDataStr = localStorage.getItem(SESSION_KEYS.SESSION_DATA);
        if (sessionDataStr) {
          try {
            sessionData = JSON.parse(sessionDataStr);
            console.log('[SessionStorageService] ✅ Данные сессии получены из localStorage');
          } catch (parseError) {
            console.error('[SessionStorageService] Ошибка при разборе данных сессии из localStorage:', parseError);
          }
        }
      }

      // Если не нашли в localStorage, пробуем sessionStorage
      if (!sessionData && isSessionStorageAvailable()) {
        const sessionDataStr = sessionStorage.getItem(SESSION_KEYS.SESSION_DATA);
        if (sessionDataStr) {
          try {
            sessionData = JSON.parse(sessionDataStr);

            // Если нашли в sessionStorage, дублируем в localStorage для надежности
            if (isLocalStorageAvailable()) {
              localStorage.setItem(SESSION_KEYS.SESSION_DATA, sessionDataStr);
              console.log('[SessionStorageService] Перенесли данные из sessionStorage в localStorage');
            }

            console.log('[SessionStorageService] ✅ Данные сессии получены из sessionStorage');
          } catch (parseError) {
            console.error('[SessionStorageService] Ошибка при разборе данных сессии из sessionStorage:', parseError);
          }
        }
      }

      // Если не нашли полные данные, пробуем собрать из отдельных ключей как аварийный вариант
      if (!sessionData) {
        const emergencyData: SessionData = {};
        let hasAnyData = false;

        // Пробуем получить guest_id
        const guestId = getGuestId();
        if (guestId) {
          emergencyData.guest_id = guestId;
          hasAnyData = true;
        }

        // Пробуем получить user_id из аварийного хранилища
        try {
          if (isLocalStorageAvailable()) {
            const userId = localStorage.getItem('user_id');
            if (userId) {
              emergencyData.user_id = parseInt(userId, 10);
              hasAnyData = true;
            }
          }
        } catch (e) {
          console.warn('[SessionStorageService] Не удалось получить user_id из аварийного хранилища');
        }

        if (hasAnyData) {
          console.log('[SessionStorageService] ✓ Восстановлены частичные данные сессии в аварийном режиме');
          return emergencyData;
        }

        console.log('[SessionStorageService] ❌ Не удалось найти данные сессии');
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('[SessionStorageService] ❌ Критическая ошибка при получении данных сессии:', error);
      return null;
    }
  },

  /**
   * Получает guest_id пользователя
   * @returns guest_id или null, если он не найден
   */
  getGuestId(): string | null {
    return getGuestId();
  },

  /**
   * Сохраняет guest_id
   * @param guestId Идентификатор гостя для сохранения
   * @returns true в случае успешного сохранения
   */
  saveGuestId(guestId: string): boolean {
    try {
      if (!guestId) {
        console.error('[SessionStorageService] Попытка сохранить пустой guest_id');
        return false;
      }

      console.log('[SessionStorageService] Сохранение guest_id:', guestId);

      // Сохраняем guest_id в localStorage (основное хранилище)
      if (isLocalStorageAvailable()) {
        localStorage.setItem(SESSION_KEYS.GUEST_ID, guestId);
        console.log('[SessionStorageService] ✅ guest_id успешно сохранен в localStorage');
      } else {
        console.warn('[SessionStorageService] localStorage недоступен');
      }

      // Дублируем guest_id в sessionStorage для надежности
      if (isSessionStorageAvailable()) {
        sessionStorage.setItem(SESSION_KEYS.GUEST_ID, guestId);
        console.log('[SessionStorageService] ✅ guest_id продублирован в sessionStorage');
      } else {
        console.warn('[SessionStorageService] sessionStorage недоступен');
      }

      // Обновляем guest_id в данных сессии, если они существуют
      const sessionData = this.getSession();
      if (sessionData) {
        sessionData.guest_id = guestId;
        this.saveSession(sessionData);
        console.log('[SessionStorageService] ✅ guest_id обновлен в данных сессии');
      }

      return true;
    } catch (error) {
      console.error('[SessionStorageService] ❌ Ошибка при сохранении guest_id:', error);
      return false;
    }
  },

  /**
   * Очищает информацию о сессии
   * @param preserveGuestId Если true, то guest_id не будет удален
   * @returns true в случае успешной очистки
   */
  clearSession(preserveGuestId: boolean = false): boolean {
    try {
      console.log('[SessionStorageService] Очистка данных сессии, сохранять guest_id:', preserveGuestId);

      // Сохраняем guest_id, если нужно
      let guestId = null;
      if (preserveGuestId) {
        guestId = this.getGuestId();
      }

      // Очищаем данные в localStorage
      if (isLocalStorageAvailable()) {
        localStorage.removeItem(SESSION_KEYS.SESSION_DATA);
        if (!preserveGuestId) {
          localStorage.removeItem(SESSION_KEYS.GUEST_ID);
        }
        console.log('[SessionStorageService] ✅ Данные очищены из localStorage');
      }

      // Очищаем данные в sessionStorage
      if (isSessionStorageAvailable()) {
        sessionStorage.removeItem(SESSION_KEYS.SESSION_DATA);
        if (!preserveGuestId) {
          sessionStorage.removeItem(SESSION_KEYS.GUEST_ID);
        }
        console.log('[SessionStorageService] ✅ Данные очищены из sessionStorage');
      }

      // Восстанавливаем guest_id, если нужно
      if (preserveGuestId && guestId) {
        this.saveGuestId(guestId);
        console.log('[SessionStorageService] ✅ guest_id восстановлен после очистки');
      }

      return true;
    } catch (error) {
      console.error('[SessionStorageService] ❌ Ошибка при очистке данных сессии:', error);
      return false;
    }
  },

  /**
   * Получает идентификатор пользователя из сессии
   * @returns ID пользователя или null, если он не найден
   */
  getUserId(): number | null {
    try {
      const sessionData = this.getSession();
      if (sessionData && (sessionData.user_id || sessionData.userId)) {
        const userId = sessionData.user_id || sessionData.userId || null;
        if (userId !== null && userId !== undefined) {
          console.log('[SessionStorageService] ✅ user_id получен из данных сессии');
          return typeof userId === 'string' ? parseInt(userId, 10) : userId;
        }
      }

      // Пробуем получить user_id из аварийного хранилища
      if (isLocalStorageAvailable()) {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          try {
            const parsedUserId = parseInt(userId, 10);
            console.log('[SessionStorageService] ✅ user_id получен из аварийного хранилища');
            return parsedUserId;
          } catch (parseError) {
            console.warn('[SessionStorageService] Ошибка при разборе user_id из аварийного хранилища:', parseError);
          }
        }
      }

      console.log('[SessionStorageService] ❌ user_id не найден');
      return null;
    } catch (error) {
      console.error('[SessionStorageService] ❌ Ошибка при получении user_id:', error);
      return null;
    }
  }
};

// Экспортируем основной сервис и вспомогательные функции
export default sessionStorageService;
export { isLocalStorageAvailable, isSessionStorageAvailable, getGuestId };