/**
 * Координатор обновлений баланса
 * Устраняет race conditions и координирует все источники обновления
 */

interface UpdateRequest {
  source: string;
  timestamp: number;
  forceRefresh: boolean;
  userId: number;
}

export class BalanceUpdateCoordinator {
  private static instance: BalanceUpdateCoordinator;
  private pendingRequests = new Map<number, UpdateRequest>();
  private lastUpdateTime = new Map<number, number>();
  private updateCallbacks = new Map<number, (forceRefresh: boolean) => Promise<void>>();
  
  // Дебаунсинг конфигурация
  private readonly DEBOUNCE_TIME = 1500; // 1.5 секунды
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 секунд между обновлениями
  
  private constructor() {}
  
  static getInstance(): BalanceUpdateCoordinator {
    if (!BalanceUpdateCoordinator.instance) {
      BalanceUpdateCoordinator.instance = new BalanceUpdateCoordinator();
    }
    return BalanceUpdateCoordinator.instance;
  }
  
  /**
   * Регистрирует callback для обновления баланса пользователя
   */
  registerUpdateCallback(userId: number, callback: (forceRefresh: boolean) => Promise<void>) {
    this.updateCallbacks.set(userId, callback);
    console.log(`[BalanceCoordinator] Зарегистрирован callback для пользователя ${userId}`);
  }
  
  /**
   * Удаляет callback для пользователя
   */
  unregisterUpdateCallback(userId: number) {
    this.updateCallbacks.delete(userId);
    this.pendingRequests.delete(userId);
    this.lastUpdateTime.delete(userId);
  }
  
  /**
   * Запрашивает обновление баланса с умной координацией
   */
  async requestUpdate(userId: number, source: string, forceRefresh: boolean = false): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(userId) || 0;
    const timeSinceLastUpdate = now - lastUpdate;
    
    console.log(`[BalanceCoordinator] Запрос обновления от ${source} для пользователя ${userId}`, {
      forceRefresh,
      timeSinceLastUpdate: `${Math.round(timeSinceLastUpdate / 1000)}с`,
      minInterval: `${this.MIN_UPDATE_INTERVAL / 1000}с`
    });
    
    // Проверяем минимальный интервал между обновлениями
    if (!forceRefresh && timeSinceLastUpdate < this.MIN_UPDATE_INTERVAL) {
      console.log(`[BalanceCoordinator] Пропускаем обновление от ${source} - слишком рано`, {
        remaining: `${Math.round((this.MIN_UPDATE_INTERVAL - timeSinceLastUpdate) / 1000)}с`
      });
      return;
    }
    
    // Сохраняем запрос
    const request: UpdateRequest = {
      source,
      timestamp: now,
      forceRefresh,
      userId
    };
    
    const existingRequest = this.pendingRequests.get(userId);
    
    // Если есть pending запрос и новый более приоритетный - заменяем
    if (existingRequest) {
      const shouldReplace = forceRefresh && !existingRequest.forceRefresh;
      if (shouldReplace) {
        console.log(`[BalanceCoordinator] Заменяем запрос ${existingRequest.source} на ${source} (более приоритетный)`);
        this.pendingRequests.set(userId, request);
      } else {
        console.log(`[BalanceCoordinator] Игнорируем запрос от ${source} - уже есть pending от ${existingRequest.source}`);
        return;
      }
    } else {
      this.pendingRequests.set(userId, request);
    }
    
    // Дебаунсинг - ждем немного перед выполнением
    await new Promise(resolve => setTimeout(resolve, this.DEBOUNCE_TIME));
    
    // Проверяем, что запрос еще актуален
    const currentRequest = this.pendingRequests.get(userId);
    if (!currentRequest || currentRequest.timestamp !== request.timestamp) {
      console.log(`[BalanceCoordinator] Запрос от ${source} устарел или заменен`);
      return;
    }
    
    // Выполняем обновление
    await this.executeUpdate(userId, request);
  }
  
  /**
   * Выполняет актуальное обновление баланса
   */
  private async executeUpdate(userId: number, request: UpdateRequest): Promise<void> {
    const callback = this.updateCallbacks.get(userId);
    if (!callback) {
      console.warn(`[BalanceCoordinator] Нет callback для пользователя ${userId}`);
      return;
    }
    
    try {
      console.log(`[BalanceCoordinator] ✅ Выполняем обновление от ${request.source} для пользователя ${userId}`, {
        forceRefresh: request.forceRefresh
      });
      
      await callback(request.forceRefresh);
      
      // Записываем время последнего обновления
      this.lastUpdateTime.set(userId, Date.now());
      
      console.log(`[BalanceCoordinator] ✅ Обновление завершено успешно от ${request.source}`);
      
    } catch (error) {
      console.error(`[BalanceCoordinator] ❌ Ошибка обновления от ${request.source}:`, error);
    } finally {
      // Удаляем обработанный запрос
      this.pendingRequests.delete(userId);
    }
  }
  
  /**
   * Принудительное обновление (для критических случаев)
   */
  async forceUpdate(userId: number, source: string): Promise<void> {
    console.log(`[BalanceCoordinator] 🚨 ПРИНУДИТЕЛЬНОЕ обновление от ${source} для пользователя ${userId}`);
    
    const callback = this.updateCallbacks.get(userId);
    if (!callback) {
      console.warn(`[BalanceCoordinator] Нет callback для принудительного обновления пользователя ${userId}`);
      return;
    }
    
    try {
      // Очищаем все pending запросы
      this.pendingRequests.delete(userId);
      
      await callback(true);
      this.lastUpdateTime.set(userId, Date.now());
      
      console.log(`[BalanceCoordinator] ✅ Принудительное обновление завершено от ${source}`);
      
    } catch (error) {
      console.error(`[BalanceCoordinator] ❌ Ошибка принудительного обновления от ${source}:`, error);
    }
  }
  
  /**
   * Получить статистику координатора
   */
  getStats(): Record<string, any> {
    return {
      pendingRequests: this.pendingRequests.size,
      registeredUsers: this.updateCallbacks.size,
      lastUpdateTimes: Object.fromEntries(this.lastUpdateTime.entries())
    };
  }
}

// Создаем глобальный экземпляр
export const balanceCoordinator = BalanceUpdateCoordinator.getInstance();