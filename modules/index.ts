// Главный индекс модулей UniFarm
export { UserService } from './user/service';
export { UserController } from './user/controller';
export { WalletService } from './wallet/service';
export { WalletController } from './wallet/controller';
export { FarmingController } from './farming/controller';
export { MissionsController } from './missions/controller';
export { TelegramController } from './telegram/controller';
export { ReferralService } from './referral/service';
export { BoostService } from './boost/service';
export { TelegramService } from './telegram/service';
export { DailyBonusService } from './dailyBonus/service';
export { AdminService } from './admin/service';

// Маршруты модулей
export { default as userRoutes } from './user/routes';
export { default as walletRoutes } from './wallet/routes';
export { default as farmingRoutes } from './farming/routes';
export { default as missionsRoutes } from './missions/routes';
export { default as telegramRoutes } from './telegram/routes';

// Middleware
export { telegramMiddleware, requireTelegramAuth } from './telegram/middleware';