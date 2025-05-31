// Главный индекс модулей UniFarm
export { UserService } from './user/service';
export { UserController } from './user/controller';
export { WalletService } from './wallet/service';
export { WalletController } from './wallet/controller';
export { FarmingController } from './farming/controller';
export { MissionsController } from './missions/controller';
export { TelegramController } from './telegram/controller';
export { ReferralService } from './referral/service';
export { ReferralController } from './referral/controller';
export { BoostService } from './boost/service';
export { BoostController } from './boost/controller';
export { TelegramService } from './telegram/service';
export { DailyBonusService } from './dailyBonus/service';
export { DailyBonusController } from './dailyBonus/controller';
export { AdminService } from './admin/service';
export { AdminController } from './admin/controller';
export { AuthService } from './auth/service';
export { AuthController } from './auth/controller';

// Маршруты модулей
export { default as userRoutes } from './user/routes';
export { default as walletRoutes } from './wallet/routes';
export { default as farmingRoutes } from './farming/routes';
export { default as missionsRoutes } from './missions/routes';
export { default as telegramRoutes } from './telegram/routes';
export { default as referralRoutes } from './referral/routes';
export { default as boostRoutes } from './boost/routes';
export { default as dailyBonusRoutes } from './dailyBonus/routes';
export { default as adminRoutes } from './admin/routes';
export { default as authRoutes } from './auth/routes';

// Middleware
export { telegramMiddleware, requireTelegramAuth } from './telegram/middleware';