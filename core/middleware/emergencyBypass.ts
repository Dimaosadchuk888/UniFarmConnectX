
/**
 * Emergency bypass middleware for connection issues
 * Temporarily allows all requests through for demo/development
 */
import { Request, Response, NextFunction } from 'express';

export function emergencyBypass(req: Request, res: Response, next: NextFunction): void {
  console.log('[EmergencyBypass] Allowing request:', req.originalUrl);
  
  const demoUser = {
    id: 42,
    telegram_id: 42,
    username: 'demo_user',
    first_name: 'Demo User',
    ref_code: 'REF_EMERGENCY_DEMO'
  };
  
  (req as any).user = demoUser;
  (req as any).telegramUser = demoUser;
  next();
}
