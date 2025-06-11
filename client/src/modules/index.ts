/**
 * Главный индекс модулей фронтенда
 * Экспортирует все интегрированные сервисы для взаимодействия с бекендом
 */

// Интегрированные сервисы
export { AuthService } from './auth/authService';
export { userService } from './auth/userService';
export { FarmingService } from './farming/farmingService';
export { WalletService } from './wallet/walletService';
export { MissionsService } from './missions/missionsService';
export { ReferralService } from './referral/referralService';

// Компоненты модулей
export { BalanceCard } from './wallet/components/BalanceCard';
export { UniFarmingCard } from './farming/components/UniFarmingCard';
export { MissionsList } from './missions/components/MissionsList';
export { ReferralCard } from './referral/components/ReferralCard';
export { CompleteDashboard } from './dashboard/components/CompleteDashboard';
export { DashboardLayout } from './dashboard/components/DashboardLayout';
export { WelcomeSection } from './dashboard/components/WelcomeSection';

// Типы для интеграции с бекендом
export type { AuthResponse, LoginRequest } from './auth/authService';
export type { FarmingStats, FarmingResponse, DepositRequest } from './farming/farmingService';
export type { WalletBalance, Transaction, WalletResponse } from './wallet/walletService';
export type { Mission, UserMission, MissionsResponse } from './missions/missionsService';
export type { ReferralStats, ReferralUser, ReferralResponse } from './referral/referralService';