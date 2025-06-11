import { User } from './User';

/**
 * Класс администратора - наследует User с административными полномочиями
 */
export class Admin extends User {
  constructor(
    id: number,
    telegramId: string,
    username: string,
    refCode?: string,
    parentRefCode?: string,
    balanceUni: number = 0,
    balanceTon: number = 0,
    public permissions: string[] = [],
    createdAt: Date = new Date()
  ) {
    super(id, telegramId, username, refCode, parentRefCode, balanceUni, balanceTon, createdAt);
  }

  /**
   * Проверяет наличие разрешения
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.permissions.includes('*');
  }

  /**
   * Одобряет вывод средств пользователя
   */
  approveWithdrawal(userId: number, amount: number): string {
    if (!this.hasPermission('approve_withdrawals')) {
      return `Недостаточно прав для одобрения выводов`;
    }
    return `Вывод ${amount} для пользователя ${userId} одобрен администратором ${this.username}`;
  }

  /**
   * Блокирует пользователя
   */
  banUser(userId: number, reason?: string): string {
    if (!this.hasPermission('ban_users')) {
      return `Недостаточно прав для блокировки пользователей`;
    }
    const reasonText = reason ? ` по причине: ${reason}` : '';
    return `Пользователь ${userId} заблокирован${reasonText}`;
  }

  /**
   * Разблокирует пользователя
   */
  unbanUser(userId: number): string {
    if (!this.hasPermission('ban_users')) {
      return `Недостаточно прав для разблокировки пользователей`;
    }
    return `Пользователь ${userId} разблокирован`;
  }

  /**
   * Начисляет бонус пользователю
   */
  grantBonus(userId: number, amount: number, currency: 'UNI' | 'TON'): string {
    if (!this.hasPermission('grant_bonuses')) {
      return `Недостаточно прав для начисления бонусов`;
    }
    return `Бонус ${amount} ${currency} начислен пользователю ${userId}`;
  }

  /**
   * Создает системное уведомление
   */
  createSystemNotification(title: string, message: string, targetUsers?: number[]): string {
    if (!this.hasPermission('create_notifications')) {
      return `Недостаточно прав для создания уведомлений`;
    }
    const target = targetUsers ? `для ${targetUsers.length} пользователей` : 'для всех пользователей';
    return `Уведомление "${title}" создано ${target}`;
  }

  /**
   * Получает список доступных действий
   */
  getAvailableActions(): string[] {
    const actions: string[] = [];
    
    if (this.hasPermission('approve_withdrawals')) {
      actions.push('Одобрение выводов');
    }
    if (this.hasPermission('ban_users')) {
      actions.push('Блокировка пользователей');
    }
    if (this.hasPermission('grant_bonuses')) {
      actions.push('Начисление бонусов');
    }
    if (this.hasPermission('create_notifications')) {
      actions.push('Создание уведомлений');
    }
    if (this.hasPermission('view_analytics')) {
      actions.push('Просмотр аналитики');
    }

    return actions;
  }

  /**
   * Валидация администратора
   */
  validate(): boolean {
    return super.validate() && Array.isArray(this.permissions);
  }

  /**
   * Сериализация администратора
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      permissions: this.permissions,
      availableActions: this.getAvailableActions()
    };
  }
}