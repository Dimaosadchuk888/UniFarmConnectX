import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: {
        id: number;
        username?: string;
        first_name?: string;
        last_name?: string;
        language_code?: string;
      };
      telegram?: {
        user: {
          id: number;
          username?: string;
          first_name?: string;
          last_name?: string;
          language_code?: string;
        };
        validated: boolean;
      };
    }
  }
}