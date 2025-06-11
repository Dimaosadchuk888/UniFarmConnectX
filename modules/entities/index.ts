/**
 * Экспорт всех сущностей UniFarm
 * Модернизированная архитектура с наследованием классов
 */

export { BaseEntity } from './BaseEntity';
export { User } from './User';
export { Farmer } from './Farmer';
export { Admin } from './Admin';
export { Wallet } from './Wallet';
export { Mission, type MissionType } from './Mission';

/**
 * Фабрика для создания пользователей разных типов
 */
export class UserFactory {
  /**
   * Создает обычного пользователя
   */
  static createUser(data: {
    id: number;
    telegramId: string;
    username: string;
    refCode?: string;
    parentRefCode?: string;
    balanceUni?: number;
    balanceTon?: number;
  }): User {
    return new User(
      data.id,
      data.telegramId,
      data.username,
      data.refCode,
      data.parentRefCode,
      data.balanceUni,
      data.balanceTon
    );
  }

  /**
   * Создает фермера
   */
  static createFarmer(data: {
    id: number;
    telegramId: string;
    username: string;
    refCode?: string;
    parentRefCode?: string;
    balanceUni?: number;
    balanceTon?: number;
    totalFarmed?: number;
    farmingRate?: number;
  }): Farmer {
    return new Farmer(
      data.id,
      data.telegramId,
      data.username,
      data.refCode,
      data.parentRefCode,
      data.balanceUni,
      data.balanceTon,
      data.totalFarmed,
      undefined,
      data.farmingRate
    );
  }

  /**
   * Создает администратора
   */
  static createAdmin(data: {
    id: number;
    telegramId: string;
    username: string;
    permissions?: string[];
  }): Admin {
    return new Admin(
      data.id,
      data.telegramId,
      data.username,
      undefined,
      undefined,
      0,
      0,
      data.permissions || []
    );
  }
}

/**
 * Утилиты для работы с сущностями
 */
export class EntityUtils {
  /**
   * Преобразует данные из базы в объект пользователя
   */
  static fromDbToUser(dbUser: any): User {
    return UserFactory.createUser({
      id: dbUser.id,
      telegramId: String(dbUser.telegram_id),
      username: dbUser.username,
      refCode: dbUser.ref_code,
      parentRefCode: dbUser.parent_ref_code,
      balanceUni: Number(dbUser.balance_uni) || 0,
      balanceTon: Number(dbUser.balance_ton) || 0
    });
  }

  /**
   * Преобразует данные из базы в объект фермера
   */
  static fromDbToFarmer(dbUser: any): Farmer {
    return UserFactory.createFarmer({
      id: dbUser.id,
      telegramId: String(dbUser.telegram_id),
      username: dbUser.username,
      refCode: dbUser.ref_code,
      parentRefCode: dbUser.parent_ref_code,
      balanceUni: Number(dbUser.balance_uni) || 0,
      balanceTon: Number(dbUser.balance_ton) || 0,
      totalFarmed: Number(dbUser.uni_deposit_amount) || 0,
      farmingRate: Number(dbUser.uni_farming_rate) || 0
    });
  }

  /**
   * Преобразует данные из базы в объект кошелька
   */
  static fromDbToWallet(dbWallet: any): Wallet {
    return new Wallet(
      dbWallet.id,
      dbWallet.user_id,
      Number(dbWallet.balance_uni) || 0,
      Number(dbWallet.balance_ton) || 0,
      dbWallet.ton_wallet_address
    );
  }

  /**
   * Преобразует данные из базы в объект миссии
   */
  static fromDbToMission(dbMission: any): Mission {
    return new Mission(
      dbMission.id,
      dbMission.type,
      dbMission.title,
      dbMission.description,
      Number(dbMission.reward_uni) || 0,
      Boolean(dbMission.is_active)
    );
  }
}