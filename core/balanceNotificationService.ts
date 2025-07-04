/**
 * Централизованная служба уведомлений об изменениях баланса
 * Интегрируется с WebSocket для уведомления клиентов о начислениях
 */

import { logger } from './logger';

export interface BalanceUpdateData {
  userId: number;
  balanceUni: number;
  balanceTon: number;
  changeAmount: number;
  currency: 'UNI' | 'TON';
  source: 'farming' | 'boost_income' | 'referral_reward' | 'daily_bonus' | 'mission';
  timestamp: string;
}

export class BalanceNotificationService {
  private static instance: BalanceNotificationService;
  private websocketConnections: Map<number, WebSocket[]> = new Map();
  private pendingUpdates: Map<number, BalanceUpdateData[]> = new Map();
  private updateTimeouts: Map<number, NodeJS.Timeout> = new Map();
  
  private constructor() {}

  public static getInstance(): BalanceNotificationService {
    if (!BalanceNotificationService.instance) {
      BalanceNotificationService.instance = new BalanceNotificationService();
    }
    return BalanceNotificationService.instance;
  }

  /**
   * Регистрирует WebSocket подключение для пользователя
   */
  public registerConnection(userId: number, ws: WebSocket): void {
    if (!this.websocketConnections.has(userId)) {
      this.websocketConnections.set(userId, []);
    }
    
    this.websocketConnections.get(userId)!.push(ws);
    logger.info(`[BalanceNotification] Зарегистрировано подключение для пользователя ${userId}`);
  }

  /**
   * Удаляет WebSocket подключение для пользователя
   */
  public removeConnection(userId: number, ws: WebSocket): void {
    const connections = this.websocketConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(ws);
      if (index !== -1) {
        connections.splice(index, 1);
        if (connections.length === 0) {
          this.websocketConnections.delete(userId);
        }
        logger.info(`[BalanceNotification] Удалено подключение для пользователя ${userId}`);
      }
    }
  }

  /**
   * Отправляет уведомление об изменении баланса
   * Использует debounce для агрегации изменений
   */
  public notifyBalanceUpdate(updateData: BalanceUpdateData): void {
    const { userId } = updateData;
    
    // Добавляем обновление в очередь
    if (!this.pendingUpdates.has(userId)) {
      this.pendingUpdates.set(userId, []);
    }
    this.pendingUpdates.get(userId)!.push(updateData);

    // Сбрасываем предыдущий таймаут, если есть
    if (this.updateTimeouts.has(userId)) {
      clearTimeout(this.updateTimeouts.get(userId)!);
    }

    // Устанавливаем новый таймаут для агрегации изменений
    const timeout = setTimeout(() => {
      this.sendAggregatedUpdate(userId);
    }, 2000); // Ждем 2 секунды для агрегации

    this.updateTimeouts.set(userId, timeout);
  }

  /**
   * Отправляет агрегированное обновление баланса
   */
  private sendAggregatedUpdate(userId: number): void {
    const updates = this.pendingUpdates.get(userId);
    if (!updates || updates.length === 0) return;

    // Агрегируем все изменения
    const latestUpdate = updates[updates.length - 1];
    const totalUniChange = updates
      .filter(u => u.currency === 'UNI')
      .reduce((sum, u) => sum + u.changeAmount, 0);
    const totalTonChange = updates
      .filter(u => u.currency === 'TON')
      .reduce((sum, u) => sum + u.changeAmount, 0);

    const aggregatedUpdate = {
      type: 'balance_update',
      userId,
      balanceData: {
        balanceUni: latestUpdate.balanceUni,
        balanceTon: latestUpdate.balanceTon,
        changes: {
          uni: totalUniChange,
          ton: totalTonChange
        },
        sources: [...new Set(updates.map(u => u.source))],
        timestamp: new Date().toISOString()
      }
    };

    // Отправляем уведомление через WebSocket
    this.sendToUserConnections(userId, aggregatedUpdate);

    // Очищаем данные
    this.pendingUpdates.delete(userId);
    this.updateTimeouts.delete(userId);

    logger.info(`[BalanceNotification] Отправлено агрегированное обновление баланса`, {
      userId,
      uniChange: totalUniChange,
      tonChange: totalTonChange,
      sources: aggregatedUpdate.balanceData.sources
    });
  }

  /**
   * Отправляет сообщение всем подключениям пользователя
   */
  private sendToUserConnections(userId: number, message: any): void {
    const connections = this.websocketConnections.get(userId);
    if (!connections || connections.length === 0) {
      logger.debug(`[BalanceNotification] Нет активных подключений для пользователя ${userId}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    connections.forEach((ws, index) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          sentCount++;
        } else {
          // Удаляем неактивное подключение
          connections.splice(index, 1);
        }
      } catch (error) {
        logger.error(`[BalanceNotification] Ошибка отправки сообщения пользователю ${userId}`, error);
        // Удаляем неисправное подключение
        connections.splice(index, 1);
      }
    });

    logger.debug(`[BalanceNotification] Отправлено сообщение ${sentCount} подключениям пользователя ${userId}`);
  }

  /**
   * Принудительно отправляет все ожидающие обновления
   */
  public flushPendingUpdates(): void {
    for (const userId of this.pendingUpdates.keys()) {
      if (this.updateTimeouts.has(userId)) {
        clearTimeout(this.updateTimeouts.get(userId)!);
        this.updateTimeouts.delete(userId);
      }
      this.sendAggregatedUpdate(userId);
    }
  }

  /**
   * Получает статистику активных подключений
   */
  public getConnectionStats(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;
    for (const connections of this.websocketConnections.values()) {
      totalConnections += connections.length;
    }
    
    return {
      totalUsers: this.websocketConnections.size,
      totalConnections
    };
  }
}