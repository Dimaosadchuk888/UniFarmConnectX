/**
 * Утилита для принудительного обновления приложения
 * Очищает все кеши и перезагружает компоненты
 */

import { cacheService } from '@/services/cacheService';
import { queryClient } from '@/lib/queryClient';

export const forceApplicationRefresh = () => {
  console.log('🔄 [ForceRefresh] Начинаем принудительное обновление приложения');
  
  try {
    // 1. Очищаем кеш приложения
    console.log('🗑️ [ForceRefresh] Очищаем CacheService');
    cacheService.clear();
    
    // 2. Очищаем кеш React Query
    console.log('🗑️ [ForceRefresh] Очищаем React Query кеш');
    queryClient.clear();
    
    // 3. Инвалидируем все активные запросы
    console.log('🔄 [ForceRefresh] Инвалидируем все запросы');
    queryClient.invalidateQueries();
    
    // 4. Принудительно обновляем localStorage если есть
    console.log('🗑️ [ForceRefresh] Очищаем localStorage кеш');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('cache') || key.includes('transaction') || key.includes('balance')) {
        localStorage.removeItem(key);
      }
    });
    
    // 5. Логируем успешное завершение
    console.log('✅ [ForceRefresh] Принудительное обновление завершено');
    
    return true;
  } catch (error) {
    console.error('❌ [ForceRefresh] Ошибка при обновлении:', error);
    return false;
  }
};

// Экспортируем для глобального доступа
(window as any).forceRefresh = forceApplicationRefresh;

// Добавляем дополнительную функцию для тестирования
(window as any).testCacheClear = () => {
  console.log('🧪 [TestCacheClear] Тестируем очистку кеша');
  const result = forceApplicationRefresh();
  console.log('🧪 [TestCacheClear] Результат:', result ? 'УСПЕХ' : 'ОШИБКА');
  
  // Дополнительно перезагружаем страницу через 1 секунду
  setTimeout(() => {
    console.log('🔄 [TestCacheClear] Перезагружаем страницу для полной очистки');
    window.location.reload();
  }, 1000);
};