import { BaseEntity } from './BaseEntity';

/**
 * Базовый класс пользователя UniFarm
 */
export class User extends BaseEntity {
  constructor(
    id: number,
    public telegramId: string,
    public username: string,
    public refCode?: string,
    public parentRefCode?: string,
    public balanceUni: number = 0,
    public balanceTon: number = 0,
    createdAt: Date = new Date()
  ) {
    super(id, createdAt);
  }

  /**
   * Генерирует реферальную ссылку
   */
  getReferralLink(): string {
    return `https://t.me/unifarm_bot?start=${this.refCode}`;
  }

  /**
   * Проверяет, был ли пользователь приглашен
   */
  isReferred(): boolean {
    return !!this.parentRefCode;
  }

  /**
   * Форматирует баланс UNI для отображения
   */
  getFormattedUniBalance(): string {
    return this.balanceUni.toFixed(6);
  }

  /**
   * Форматирует баланс TON для отображения
   */
  getFormattedTonBalance(): string {
    return this.balanceTon.toFixed(6);
  }

  /**
   * Проверяет, достаточно ли UNI для операции
   */
  hasEnoughUni(amount: number): boolean {
    return this.balanceUni >= amount;
  }

  /**
   * Проверяет, достаточно ли TON для операции
   */
  hasEnoughTon(amount: number): boolean {
    return this.balanceTon >= amount;
  }

  /**
   * Валидация пользователя
   */
  validate(): boolean {
    return (
      !!this.telegramId &&
      !!this.username &&
      this.balanceUni >= 0 &&
      this.balanceTon >= 0
    );
  }

  /**
   * Сериализация в JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      telegramId: this.telegramId,
      username: this.username,
      refCode: this.refCode,
      parentRefCode: this.parentRefCode,
      balanceUni: this.balanceUni,
      balanceTon: this.balanceTon,
      createdAt: this.createdAt
    };
  }
}