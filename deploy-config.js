/**
 * Конфигурация деплоя UniFarm на Replit
 * 
 * Этот файл позволяет автоматизировать настройку окружения для деплоя
 * Используется при развертывании приложения на Replit
 */

// Конфигурация для Replit PostgreSQL
const DATABASE_CONFIG = {
  url: "postgresql://runner@localhost:5432/postgres",
  host: "localhost",
  port: 5432,
  user: "runner",
  database: "postgres",
};

// Конфигурация для HTTP сервера
const SERVER_CONFIG = {
  port: 3000,
  host: "0.0.0.0",
};

// Конфигурация для файлов и путей
const PATH_CONFIG = {
  // Пути к файлам деплоя
  replit: {
    source: ".replit.production",
    target: ".replit",
  },
  // Файлы для запуска в production
  productionServer: "production-server.mjs",
  startScript: "start-unified.js",
};

// Переменные окружения для production
const ENV_VARIABLES = {
  NODE_ENV: "production",
  PORT: SERVER_CONFIG.port.toString(),
  DATABASE_PROVIDER: "replit",
  DATABASE_URL: DATABASE_CONFIG.url,
  PGHOST: DATABASE_CONFIG.host,
  PGPORT: DATABASE_CONFIG.port.toString(),
  PGUSER: DATABASE_CONFIG.user,
  PGDATABASE: DATABASE_CONFIG.database,
};

// Команды для запуска приложения
const COMMANDS = {
  build: "npm run build",
  migrate: "NODE_ENV=production DATABASE_PROVIDER=replit npm run db:push",
  start: `NODE_ENV=production PORT=${SERVER_CONFIG.port} DATABASE_PROVIDER=replit node ${PATH_CONFIG.startScript}`,
  checkDb: "node check-replit-db.mjs",
};

// Конфигурация для автоматического деплоя
const DEPLOY_CONFIG = {
  deployTarget: "cloudrun",
  deployBranch: "main",
  startCommand: COMMANDS.start,
};

module.exports = {
  DATABASE_CONFIG,
  SERVER_CONFIG,
  PATH_CONFIG,
  ENV_VARIABLES,
  COMMANDS,
  DEPLOY_CONFIG,
};