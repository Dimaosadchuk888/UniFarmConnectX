import { BaseEntity } from './BaseEntity';

/**
 * Класс кошелька для управления балансами и транзакциями
 */
export class Wallet extends BaseEntity {
  constructor(
    id: number,
    public userId: number,
    public uniBalance: number = 0,
    public tonBalance: number = 0,
    public tonWalletAddress?: string,
    createdAt: Date = new Date()
  ) {
    super(id, createdAt);
  }

  /**
   * Пополняет баланс UNI
   */
  depositUNI(amount: number): boolean {
    if (amount <= 0) {
      return false;
    }
    this.uniBalance += amount;
    return true;
  }

  /**
   * Пополняет баланс TON
   */
  depositTON(amount: number): boolean {
    if (amount <= 0) {
      return false;
    }
    this.tonBalance += amount;
    return true;
  }

  /**
   * Выводит UNI токены
   */
  withdrawUNI(amount: number): boolean {
    if (amount <= 0 || this.uniBalance < amount) {
      return false;
    }
    this.uniBalance -= amount;
    return true;
  }

  /**
   * Выводит TON токены
   */
  withdrawTON(amount: number): boolean {
    if (amount <= 0 || this.tonBalance < amount) {
      return false;
    }
    this.tonBalance -= amount;
    return true;
  }

  /**
   * Переводит UNI между кошельками
   */
  transferUNI(targetWallet: Wallet, amount: number): boolean {
    if (this.withdrawUNI(amount)) {
      return targetWallet.depositUNI(amount);
    }
    return false;
  }

  /**
   * Переводит TON между кошельками
   */
  transferTON(targetWallet: Wallet, amount: number): boolean {
    if (this.withdrawTON(amount)) {
      return targetWallet.depositTON(amount);
    }
    return false;
  }

  /**
   * Проверяет достаточность средств UNI
   */
  hasEnoughUNI(amount: number): boolean {
    return this.uniBalance >= amount;
  }

  /**
   * Проверяет достаточность средств TON
   */
  hasEnoughTON(amount: number): boolean {
    return this.tonBalance >= amount;
  }

  /**
   * Получает общий баланс в эквиваленте UNI
   */
  getTotalBalanceInUNI(tonToUniRate: number = 1): number {
    return this.uniBalance + (this.tonBalance * tonToUniRate);
  }

  /**
   * Форматирует баланс для отображения
   */
  getFormattedBalance(): { uni: string; ton: string; total: string } {
    return {
      uni: this.uniBalance.toFixed(6),
      ton: this.tonBalance.toFixed(6),
      total: this.getTotalBalanceInUNI().toFixed(6)
    };
  }

  /**
   * Проверяет, подключен ли TON кошелек
   */
  hasTonWallet(): boolean {
    return !!this.tonWalletAddress;
  }

  /**
   * Устанавливает адрес TON кошелька
   */
  setTonWalletAddress(address: string): boolean {
    if (!address || address.length < 10) {
      return false;
    }
    this.tonWalletAddress = address;
    return true;
  }

  /**
   * Валидация кошелька
   */
  validate(): boolean {
    return (
      this.userId > 0 &&
      this.uniBalance >= 0 &&
      this.tonBalance >= 0
    );
  }

  /**
   * Сериализация кошелька
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      uniBalance: this.uniBalance,
      tonBalance: this.tonBalance,
      tonWalletAddress: this.tonWalletAddress,
      formattedBalance: this.getFormattedBalance(),
      hasTonWallet: this.hasTonWallet(),
      createdAt: this.createdAt
    };
  }
}