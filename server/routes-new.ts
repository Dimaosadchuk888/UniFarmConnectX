/**
 * Новые маршруты API, использующие новую архитектуру:
 * контроллер -> сервис -> хранилище
 * 
 * Этот файл содержит некоторые из маршрутов, которые были
 * переписаны на новую архитектуру. После тестирования и
 * полного перехода, все эти маршруты будут перенесены в
 * основной файл routes.ts
 */

import express, { Express, Request, Response, NextFunction } from "express";
import { UserController, TransactionController, SessionController } from "./controllers";

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация новых маршрутов API');
  
  // Маршруты для сессий
  app.post('/api/v2/session/restore', SessionController.restoreSession);
  app.get('/api/v2/session/generate-guest-id', SessionController.generateGuestId);
  
  // Маршруты для пользователей
  app.get('/api/v2/users/:id', UserController.getUserById);
  app.get('/api/v2/users/username/:username', UserController.getUserByUsername);
  app.get('/api/v2/users/guest/:guestId', UserController.getUserByGuestId);
  app.get('/api/v2/users/ref-code/:refCode', UserController.getUserByRefCode);
  app.post('/api/v2/users', UserController.createUser);
  app.put('/api/v2/users/:id/ref-code', UserController.updateRefCode);
  
  // Маршруты для транзакций
  app.get('/api/v2/users/:userId/transactions', TransactionController.getUserTransactions);
  app.post('/api/v2/users/:userId/deposit', TransactionController.depositFunds);
  app.post('/api/v2/users/:userId/withdraw', TransactionController.withdrawFunds);
  app.post('/api/v2/transactions', TransactionController.createTransaction);
  
  console.log('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}