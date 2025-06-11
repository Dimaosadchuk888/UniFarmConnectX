import { User } from './User';

/**
 * Класс фермера - наследует User с дополнительной логикой фарминга
 */
export class Farmer extends User {
  constructor(
    id: number,
    telegramId: string,
    username: string,
    refCode?: string,
    parentRefCode?: string,
    balanceUni: number = 0,
    balanceTon: number = 0,
    public totalFarmed: number = 0,
    public farmingStartTime?: Date,
    public farmingRate: number = 0,
    public lastFarmingClaim?: Date,
    createdAt: Date = new Date()
  ) {
    super(id, telegramId, username, refCode, parentRefCode, balanceUni, balanceTon, createdAt);
  }

  /**
   * Активирует фарминг с указанной суммой
   */
  farm(amount: number): boolean {
    if (!this.hasEnoughUni(amount)) {
      return false;
    }

    this.balanceUni -= amount;
    this.totalFarmed += amount;
    this.farmingStartTime = new Date();
    this.farmingRate = this.calculateFarmingRate(amount);
    
    return true;
  }

  /**
   * Рассчитывает скорость фарминга на основе депозита
   */
  private calculateFarmingRate(amount: number): number {
    // Базовая ставка 0.1% в день
    const baseRate = 0.001;
    return amount * baseRate / (24 * 60 * 60); // в секунду
  }

  /**
   * Собирает накопленные средства с фарминга
   */
  claimFarming(): number {
    if (!this.farmingStartTime || !this.farmingRate) {
      return 0;
    }

    const now = new Date();
    const secondsPassed = (now.getTime() - this.farmingStartTime.getTime()) / 1000;
    const earned = secondsPassed * this.farmingRate;

    this.balanceUni += earned;
    this.lastFarmingClaim = now;
    this.farmingStartTime = now; // Сброс для следующего периода

    return earned;
  }

  /**
   * Проверяет, активен ли фарминг
   */
  isFarmingActive(): boolean {
    return !!this.farmingStartTime && this.farmingRate > 0;
  }

  /**
   * Рассчитывает текущий накопленный доход
   */
  getCurrentFarmingEarnings(): number {
    if (!this.isFarmingActive()) {
      return 0;
    }

    const now = new Date();
    const secondsPassed = (now.getTime() - this.farmingStartTime!.getTime()) / 1000;
    return secondsPassed * this.farmingRate;
  }

  /**
   * Получает статистику фарминга
   */
  getFarmingStats(): {
    isActive: boolean;
    totalFarmed: number;
    currentEarnings: number;
    farmingRate: number;
    startTime?: Date;
  } {
    return {
      isActive: this.isFarmingActive(),
      totalFarmed: this.totalFarmed,
      currentEarnings: this.getCurrentFarmingEarnings(),
      farmingRate: this.farmingRate,
      startTime: this.farmingStartTime
    };
  }

  /**
   * Переопределение валидации для фермера
   */
  validate(): boolean {
    return super.validate() && this.totalFarmed >= 0 && this.farmingRate >= 0;
  }

  /**
   * Переопределение сериализации для фермера
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      totalFarmed: this.totalFarmed,
      farmingStartTime: this.farmingStartTime,
      farmingRate: this.farmingRate,
      lastFarmingClaim: this.lastFarmingClaim,
      farmingStats: this.getFarmingStats()
    };
  }
}