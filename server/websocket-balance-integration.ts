import { BalanceManager, BalanceChangeData } from '../core/BalanceManager';
import { BalanceNotificationService } from '../core/balanceNotificationService';
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
    balanceManager.onBalanceUpdate = async (changeData: BalanceChangeData) => {
      try {
        // Определяем основную валюту и сумму изменения
        const changeAmount = changeData.currency === 'UNI' ? changeData.changeAmountUni : 
                            changeData.currency === 'TON' ? changeData.changeAmountTon :
                            Math.max(changeData.changeAmountUni, changeData.changeAmountTon);
        
        const primaryCurrency = changeData.currency === 'BOTH' ? 
                               (changeData.changeAmountUni >= changeData.changeAmountTon ? 'UNI' : 'TON') :
                               changeData.currency;
        
        // Формируем объект для уведомления с актуальными данными
        notificationService.notifyBalanceUpdate({
          userId: changeData.userId,
          balanceUni: changeData.newBalanceUni,
          balanceTon: changeData.newBalanceTon,
          changeAmount: changeAmount,
          currency: primaryCurrency,
          source: changeData.source as any,
          timestamp: new Date().toISOString()
        });
        
        logger.info('[WebSocketBalanceIntegration] Уведомление о балансе отправлено', { 
          userId: changeData.userId,
          changeUni: changeData.changeAmountUni,
          changeTon: changeData.changeAmountTon,
          source: changeData.source
        });
      } catch (error) {
        logger.error('[WebSocketBalanceIntegration] Ошибка отправки уведомления о балансе', {
          userId: changeData.userId,
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