// Главный индекс модулей UniFarm
export { UserService } from './user/service';
export { UserController } from './user/controller';
export { WalletService } from './wallet/service';
export { WalletController } from './wallet/controller';
export { ReferralService } from './referral/service';
export { FarmingService } from './farming/service';
export { BoostService } from './boost/service';
export { MissionsService } from './missions/service';
export { TelegramService } from './telegram/service';
export { DailyBonusService } from './dailyBonus/service';
export { AdminService } from './admin/service';

// Маршруты модулей
export { default as userRoutes } from './user/routes';
export { default as walletRoutes } from './wallet/routes';