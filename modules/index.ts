// Главный индекс модулей UniFarm

// Services
export { UserService } from './user/service';
export { WalletService } from './wallet/service';
export { FarmingService } from './farming/service';
export { MissionsService } from './missions/service';
export { ReferralService } from './referral/service';
export { BoostService } from './boost/service';
export { TelegramService } from './telegram/service';
export { DailyBonusService } from './dailyBonus/service';
export { AdminService } from './admin/service';
export { AuthService } from './auth/service';

// Controllers
export { UserController } from './user/controller';
export { WalletController } from './wallet/controller';
export { FarmingController } from './farming/controller';
export { MissionsController } from './missions/controller';
export { ReferralController } from './referral/controller';
export { BoostController } from './boost/controller';
export { TelegramController } from './telegram/controller';
export { DailyBonusController } from './dailyBonus/controller';
export { AdminController } from './admin/controller';
export { AuthController } from './auth/controller';

// Routes
export { default as userRoutes } from './user/routes';
export { default as walletRoutes } from './wallet/routes';
export { default as farmingRoutes } from './farming/routes';
export { default as missionsRoutes } from './missions/routes';
export { default as referralRoutes } from './referral/routes';
export { default as boostRoutes } from './boost/routes';
export { default as telegramRoutes } from './telegram/routes';
export { default as dailyBonusRoutes } from './dailyBonus/routes';
export { default as adminRoutes } from './admin/routes';
export { default as authRoutes } from './auth/routes';

// Models - Drizzle схемы и enum'ы
export * from './user/model';
export * from './wallet/model';
export * from './farming/model';
export * from './missions/model';
export * from './referral/model';
export * from './boost/model';
export * from './telegram/model';
export * from './dailyBonus/model';
export * from './admin/model';
export * from './auth/model';

// Types - интерфейсы и типы (без конфликтующих enum'ов)
export * from './user/types';
export * from './wallet/types';
export * from './farming/types';
export * from './missions/types';
export * from './referral/types';
export * from './boost/types';
export * from './telegram/types';
export * from './dailyBonus/types';
export * from './admin/types';
export * from './auth/types';

// Middleware (из core для унификации)
export { requireTelegramAuth, optionalTelegramAuth } from '../core/middleware/telegramAuth';