import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: {
        id: number;
        username?: string;
        first_name?: string;
        last_name?: string;
        [key: string]: unknown;
      };
      telegram?: {
        user?: {
          id: number;
          username?: string;
          first_name?: string;
          last_name?: string;
          [key: string]: unknown;
        };
        validated?: boolean;
      };
    }
  }
}