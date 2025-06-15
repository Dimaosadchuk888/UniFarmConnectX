
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalFarmingSessions: number;
  activeFarmingSessions: number;
  totalTransactions: number;
  totalBoostPackages: number;
  timestamp: string;
}

export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  usersWithReferrer: number;
  totalUniBalance: string;
  totalTonBalance: string;
  timestamp: string;
}

export interface FarmingStats {
  totalSessions: number;
  activeSessions: number;
  totalDeposited: string;
  totalEarned: string;
  averageDailyRate: string;
  timestamp: string;
}

export interface DatabaseStats {
  connectionStatus: 'connected' | 'disconnected' | 'error';
  activeConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  timestamp: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'unhealthy';
  database: 'connected' | 'disconnected' | 'error';
  api: 'operational' | 'degraded' | 'down';
  criticalErrors: number;
  lastCheck: string;
}

export interface PoolStats {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  timestamp: string;
}

export interface DetailedPoolStats extends PoolStats {
  health: 'good' | 'warning' | 'critical';
  utilizationPercentage: number;
  waitingTime: number;
  errors: number;
}

export interface MonitoringMetrics {
  systemStats: SystemStats;
  userStats: UserStats;
  farmingStats: FarmingStats;
  systemHealth: SystemHealth;
  poolStats?: PoolStats;
}
