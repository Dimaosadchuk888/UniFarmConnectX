import { logger } from './logger';
import { BalanceManager } from './BalanceManager';
import type { WebSocket } from 'ws';

interface UserConnection {
  userId: number;
  sockets: Set<WebSocket>;
}

export class BalanceNotificationService {
  private static instance: BalanceNotificationService;
  private connections: Map<number, UserConnection> = new Map();
  private balanceManager: BalanceManager;
  
  private constructor() {
    this.balanceManager = BalanceManager.getInstance();
    this.setupBalanceUpdateHook();
  }
  
  static getInstance(): BalanceNotificationService {
    if (!BalanceNotificationService.instance) {
      BalanceNotificationService.instance = new BalanceNotificationService();
    }
    return BalanceNotificationService.instance;
  }
  
  /**
   * Добавляет WebSocket соединение для пользователя
   */
  addConnection(userId: number, socket: WebSocket): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, {
        userId,
        sockets: new Set()
      });
    }
    
    const userConnection = this.connections.get(userId)!;
    userConnection.sockets.add(socket);
    
    logger.info('[BalanceNotification] WebSocket подключен', {
      userId,
      totalConnections: userConnection.sockets.size
    });
  }
  
  /**
   * Удаляет WebSocket соединение для пользователя
   */
  removeConnection(userId: number, socket: WebSocket): void {
    const userConnection = this.connections.get(userId);
    if (userConnection) {
      userConnection.sockets.delete(socket);
      
      if (userConnection.sockets.size === 0) {
        this.connections.delete(userId);
      }
      
      logger.info('[BalanceNotification] WebSocket отключен', {
        userId,
        remainingConnections: userConnection.sockets.size
      });
    }
  }
  
  /**
   * Отправляет уведомление об обновлении баланса
   */
  async notifyBalanceUpdate(userId: number): Promise<void> {
    const userConnection = this.connections.get(userId);
    if (!userConnection || userConnection.sockets.size === 0) {
      return;
    }
    
    try {
      // Получаем актуальный баланс из кеша или БД
      const balance = await this.balanceManager.getUserBalance(userId);
      
      const message = JSON.stringify({
        type: 'balance_update',
        userId,
        data: {
          balance_uni: balance.balance_uni,
          balance_ton: balance.balance_ton,
          timestamp: new Date().toISOString()
        }
      });
      
      // Отправляем всем активным соединениям пользователя
      const deadSockets: WebSocket[] = [];
      
      userConnection.sockets.forEach(socket => {
        if (socket.readyState === 1) { // WebSocket.OPEN
          try {
            socket.send(message);
          } catch (error) {
            logger.error('[BalanceNotification] Ошибка отправки сообщения', {
              userId,
              error: error instanceof Error ? error.message : String(error)
            });
            deadSockets.push(socket);
          }
        } else {
          deadSockets.push(socket);
        }
      });
      
      // Удаляем мертвые соединения
      deadSockets.forEach(socket => {
        this.removeConnection(userId, socket);
      });
      
      if (userConnection.sockets.size > 0) {
        logger.info('[BalanceNotification] Уведомление отправлено', {
          userId,
          connections: userConnection.sockets.size
        });
      }
    } catch (error) {
      logger.error('[BalanceNotification] Ошибка при отправке уведомления', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Настраивает перехват обновлений баланса в BalanceManager
   */
  private setupBalanceUpdateHook(): void {
    // Добавляем колбек в BalanceManager для уведомлений
    this.balanceManager.onBalanceUpdate = async (userId: number) => {
      await this.notifyBalanceUpdate(userId);
    };
  }
  
  /**
   * Отправляет пользовательское сообщение
   */
  sendCustomMessage(userId: number, type: string, data: any): void {
    const userConnection = this.connections.get(userId);
    if (!userConnection || userConnection.sockets.size === 0) {
      return;
    }
    
    const message = JSON.stringify({
      type,
      userId,
      data,
      timestamp: new Date().toISOString()
    });
    
    userConnection.sockets.forEach(socket => {
      if (socket.readyState === 1) {
        try {
          socket.send(message);
        } catch (error) {
          logger.error('[BalanceNotification] Ошибка отправки пользовательского сообщения', {
            userId,
            type,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
  }
  
  /**
   * Получает статистику подключений
   */
  getConnectionStats(): { totalUsers: number; totalSockets: number } {
    let totalSockets = 0;
    this.connections.forEach(conn => {
      totalSockets += conn.sockets.size;
    });
    
    return {
      totalUsers: this.connections.size,
      totalSockets
    };
  }
}