export interface AuthResponse {
  success: boolean;
  data?: {
    user_id: number;
    session_token: string;
    refresh_token?: string;
    expires_at: Date;
  };
  message?: string;
}

export interface LoginRequest {
  guestId: string;
  telegramInitData?: string;
  refCode?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  user_id: number;
}

export interface SessionData {
  user_id: number;
  session_token: string;
  expires_at: Date;
  is_active: boolean;
}

export interface AuthAttemptData {
  user_id?: number;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  attempt_type: 'login' | 'register' | 'refresh';
}

export type AuthError = 
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'TOKEN_INVALID'
  | 'USER_NOT_FOUND'
  | 'TOO_MANY_ATTEMPTS'
  | 'INTERNAL_ERROR';

export interface AuthValidationResult {
  valid: boolean;
  user_id?: number;
  error?: AuthError;
  session?: SessionData;
}