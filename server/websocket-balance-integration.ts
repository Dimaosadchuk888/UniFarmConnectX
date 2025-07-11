import { BalanceManager } from '../core/BalanceManager';
import { BalanceNotificationService } from '../core/BalanceNotificationService';
import { logger } from '../core/logger';

/**
 * Настройка интеграции между BalanceManager и BalanceNotificationService
 * Подключает callback для автоматической отправки WebSocket уведомлений при изменении баланса
 */
export function setupWebSocketBalanceIntegration(): void {
  try {
    const balanceManager = BalanceManager.getInstance();
    const notificationService = BalanceNotificationService.getInstance();
    
    // Устанавливаем callback для отправки WebSocket уведомлений при изменении баланса
    balanceManager.onBalanceUpdate = async (userId: number) => {
      try {
        await notificationService.notifyBalanceUpdate(userId);
        logger.info('[WebSocketBalanceIntegration] Уведомление о балансе отправлено', { userId });
      } catch (error) {
        logger.error('[WebSocketBalanceIntegration] Ошибка отправки уведомления о балансе', {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };
    
    logger.info('[WebSocketBalanceIntegration] Интеграция WebSocket с BalanceManager настроена');
  } catch (error) {
    logger.error('[WebSocketBalanceIntegration] Ошибка настройки интеграции', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}