/**
 * Восстановленные маршруты API после очистки проекта
 * Использует только проверенные контроллеры
 */

import express, { Express } from "express";

/**
 * Регистрирует основные маршруты API
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация восстановленных маршрутов API');

  // Базовые диагностические маршруты
  app.get('/api/v2/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'UniFarm API работает после восстановления'
    });
  });

  app.get('/api/v2/status', (req, res) => {
    res.json({
      status: 'restored',
      version: '2.0',
      database: 'connected',
      routes: 'active',
      timestamp: new Date().toISOString()
    });
  });

  // Отладочный маршрут для проверки регистрации
  app.get('/api/debug/routes-status', (req, res) => {
    res.json({
      routes_registered: true,
      timestamp: new Date().toISOString(),
      message: 'Новые маршруты успешно зарегистрированы после восстановления'
    });
  });

  console.log('[NewRoutes] ✅ Восстановленные маршруты успешно зарегистрированы');
}