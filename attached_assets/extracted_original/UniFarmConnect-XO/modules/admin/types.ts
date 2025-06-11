export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalVolume: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdate: Date;
}

export interface AdminPermissions {
  canViewStats: boolean;
  canManageUsers: boolean;
  canViewTransactions: boolean;
  canManageSystem: boolean;
  canAccessLogs: boolean;
}

export interface AdminActionLog {
  id: number;
  adminId: number;
  action: string;
  details?: string;
  timestamp: Date;
  ipAddress?: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface CreateAdminRequest {
  userId: number;
  role: AdminRole;
  permissions: string[];
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentActions: AdminActionLog[];
  systemAlerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  resolved: boolean;
}