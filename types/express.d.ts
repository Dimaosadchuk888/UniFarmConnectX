/**
 * Express Request расширения для UniFarm
 */

declare global {
  namespace Express {
    interface Request {
      telegram?: {
        user?: {
          id: number;
          telegram_id: number;
          username?: string;
        };
        validated?: boolean;
      };
      telegramUser?: {
        id: number;
        telegram_id: number;
        username?: string;
      };
    }
  }
}

export {};