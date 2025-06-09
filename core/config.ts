/**
 * Централизованная конфигурация для всех модулей системы
 */

import { appConfig } from '../config/app';
import { databaseConfig } from '../config/database';
import { telegramConfig } from '../config/telegram';

export const config = {
  app: appConfig,
  database: databaseConfig,
  telegram: telegramConfig,
  security: {
    cors: {
      origin: appConfig.corsOrigins,
      credentials: true
    }
  }
};