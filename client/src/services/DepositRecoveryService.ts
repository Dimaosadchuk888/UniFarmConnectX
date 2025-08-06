/**
 * Сервис автоматического восстановления потерянных депозитов
 * Работает в фоне и пытается отправить неудачные депозиты повторно
 */

interface FailedDeposit {
  txHash: string;
  amount: number;
  walletAddress: string;
  timestamp: number;
  error?: string;
  retryCount?: number;
}

class DepositRecoveryService {
  private static instance: DepositRecoveryService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 секунд
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_DELAYS = [5000, 10000, 30000, 60000, 120000]; // Exponential backoff
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 часа
  
  private constructor() {}
  
  static getInstance(): DepositRecoveryService {
    if (!DepositRecoveryService.instance) {
      DepositRecoveryService.instance = new DepositRecoveryService();
    }
    return DepositRecoveryService.instance;
  }
  
  /**
   * Запускает фоновую проверку и восстановление депозитов
   */
  start() {
    if (this.intervalId) {
      console.log('[DepositRecovery] Сервис уже запущен');
      return;
    }
    
    console.log('[DepositRecovery] Запуск сервиса восстановления депозитов');
    
    // Немедленная проверка при запуске
    this.checkAndRecoverDeposits();
    
    // Периодическая проверка
    this.intervalId = setInterval(() => {
      this.checkAndRecoverDeposits();
    }, this.CHECK_INTERVAL);
  }
  
  /**
   * Останавливает фоновую проверку
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DepositRecovery] Сервис остановлен');
    }
  }
  
  /**
   * Проверяет и восстанавливает потерянные депозиты
   */
  private async checkAndRecoverDeposits() {
    try {
      // Проверяем pending депозиты
      const pendingData = localStorage.getItem('pending_ton_deposit');
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        if (this.isValidForRetry(pending)) {
          console.log('[DepositRecovery] Обнаружен pending депозит, пытаемся восстановить');
          await this.recoverDeposit({
            ...pending,
            walletAddress: '' // Будет получен заново
          }, 'pending_ton_deposit');
        }
      }
      
      // Проверяем failed депозиты
      const failedData = localStorage.getItem('failed_ton_deposit');
      if (failedData) {
        const failed = JSON.parse(failedData);
        if (this.isValidForRetry(failed)) {
          console.log('[DepositRecovery] Обнаружен failed депозит, пытаемся восстановить');
          await this.recoverDeposit(failed, 'failed_ton_deposit');
        }
      }
      
      // Проверяем массив неудачных депозитов (для множественных)
      const failedDepositsData = localStorage.getItem('failed_ton_deposits');
      if (failedDepositsData) {
        const failedDeposits: FailedDeposit[] = JSON.parse(failedDepositsData);
        const validDeposits = failedDeposits.filter(d => this.isValidForRetry(d));
        
        if (validDeposits.length > 0) {
          console.log(`[DepositRecovery] Обнаружено ${validDeposits.length} failed депозитов`);
          
          for (const deposit of validDeposits) {
            await this.recoverDeposit(deposit, 'failed_ton_deposits');
            // Задержка между попытками
            await this.sleep(2000);
          }
        }
      }
    } catch (error) {
      console.error('[DepositRecovery] Ошибка при проверке депозитов:', error);
    }
  }
  
  /**
   * Проверяет, подходит ли депозит для повторной попытки
   */
  private isValidForRetry(deposit: any): boolean {
    if (!deposit || !deposit.txHash || !deposit.amount) {
      return false;
    }
    
    // Проверяем возраст депозита
    const age = Date.now() - (deposit.timestamp || 0);
    if (age > this.MAX_AGE_MS) {
      console.log('[DepositRecovery] Депозит слишком старый, пропускаем');
      return false;
    }
    
    // Проверяем количество попыток
    const retryCount = deposit.retryCount || 0;
    if (retryCount >= this.MAX_RETRY_COUNT) {
      console.log('[DepositRecovery] Превышено максимальное количество попыток');
      return false;
    }
    
    // Проверяем задержку между попытками
    const lastRetry = deposit.lastRetryTimestamp || deposit.timestamp;
    const delay = this.RETRY_DELAYS[Math.min(retryCount, this.RETRY_DELAYS.length - 1)];
    if (Date.now() - lastRetry < delay) {
      return false; // Еще рано для следующей попытки
    }
    
    return true;
  }
  
  /**
   * Восстанавливает потерянный депозит
   */
  private async recoverDeposit(deposit: FailedDeposit, storageKey: string) {
    try {
      console.log('[DepositRecovery] Начинаем восстановление депозита:', {
        amount: deposit.amount,
        retryCount: deposit.retryCount || 0
      });
      
      // Получаем адрес кошелька если его нет
      let walletAddress = deposit.walletAddress;
      if (!walletAddress) {
        // Пытаемся получить из TON Connect
        const tonWallet = localStorage.getItem('ton-connect-ui_wallet-info');
        if (tonWallet) {
          const walletInfo = JSON.parse(tonWallet);
          walletAddress = walletInfo.account?.address;
        }
      }
      
      if (!walletAddress) {
        console.error('[DepositRecovery] Не удалось получить адрес кошелька');
        this.updateDepositRetryInfo(deposit, storageKey, false);
        return;
      }
      
      // Импортируем apiRequest динамически
      const { apiRequest } = await import('@/lib/queryClient');
      
      // Отправляем на backend
      const response = await apiRequest('/api/v2/wallet/ton-deposit', {
        method: 'POST',
        body: JSON.stringify({
          ton_tx_hash: deposit.txHash,
          amount: deposit.amount,
          wallet_address: walletAddress
        })
      });
      
      if (response?.success) {
        console.log('[DepositRecovery] ✅ Депозит успешно восстановлен!', {
          transactionId: response.transaction_id
        });
        
        // Удаляем из localStorage
        this.removeRecoveredDeposit(deposit, storageKey);
        
        // Показываем уведомление пользователю
        this.showSuccessNotification(deposit.amount);
      } else {
        console.error('[DepositRecovery] Backend отклонил депозит:', response?.error);
        this.updateDepositRetryInfo(deposit, storageKey, false);
      }
    } catch (error: any) {
      console.error('[DepositRecovery] Ошибка восстановления:', error);
      
      // Если 401, значит проблема с токеном - не увеличиваем счетчик
      if (error?.status === 401) {
        console.log('[DepositRecovery] Проблема с авторизацией, отложим попытку');
      } else {
        this.updateDepositRetryInfo(deposit, storageKey, false);
      }
    }
  }
  
  /**
   * Обновляет информацию о попытках восстановления
   */
  private updateDepositRetryInfo(deposit: FailedDeposit, storageKey: string, remove: boolean) {
    if (remove || (deposit.retryCount || 0) >= this.MAX_RETRY_COUNT) {
      // Удаляем если достигнут лимит
      localStorage.removeItem(storageKey);
      console.log('[DepositRecovery] Депозит удален из очереди восстановления');
    } else {
      // Обновляем счетчик попыток
      const updated = {
        ...deposit,
        retryCount: (deposit.retryCount || 0) + 1,
        lastRetryTimestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  }
  
  /**
   * Удаляет восстановленный депозит из хранилища
   */
  private removeRecoveredDeposit(deposit: FailedDeposit, storageKey: string) {
    if (storageKey === 'failed_ton_deposits') {
      // Для массива депозитов
      const deposits: FailedDeposit[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = deposits.filter(d => d.txHash !== deposit.txHash);
      if (filtered.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(storageKey);
      }
    } else {
      // Для одиночных депозитов
      localStorage.removeItem(storageKey);
    }
  }
  
  /**
   * Показывает уведомление об успешном восстановлении
   */
  private showSuccessNotification(amount: number) {
    // Используем встроенную систему уведомлений
    const event = new CustomEvent('deposit-recovered', {
      detail: { amount }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Экспортируем singleton
export const depositRecoveryService = DepositRecoveryService.getInstance();

// Автоматический запуск при загрузке модуля
if (typeof window !== 'undefined') {
  // Запускаем после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      depositRecoveryService.start();
    });
  } else {
    depositRecoveryService.start();
  }
}