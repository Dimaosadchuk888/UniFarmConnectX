/**
 * Новые маршруты API, использующие новую архитектуру:
 * контроллер -> сервис -> хранилище
 * 
 * Этот файл содержит некоторые из маршрутов, которые были
 * переписаны на новую архитектуру. После тестирования и
 * полного перехода, все эти маршруты будут перенесены в
 * основной файл routes.ts
 */

import express, { Express, Request, Response } from "express";

// Явно импортируем контроллеры для новых маршрутов API
import * as sessionController from './controllers/SessionController';
import * as userController from './controllers/UserController';
import * as transactionController from './controllers/TransactionController';

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация новых маршрутов API');

  // Маршруты для сессий
  app.post('/api/v2/session/restore', (req, res) => sessionController.restoreSession(req, res));
  app.get('/api/v2/session/generate-guest-id', (req, res) => sessionController.generateGuestId(req, res));
  
  // Маршруты для пользователей
  app.get('/api/v2/users/:id', (req, res) => userController.getUserById(req, res));
  app.get('/api/v2/users/username/:username', (req, res) => userController.getUserByUsername(req, res));
  app.get('/api/v2/users/guest/:guestId', (req, res) => userController.getUserByGuestId(req, res));
  app.get('/api/v2/users/ref-code/:refCode', (req, res) => userController.getUserByRefCode(req, res));
  app.post('/api/v2/users', (req, res) => userController.createUser(req, res));
  app.put('/api/v2/users/:id/ref-code', (req, res) => userController.updateRefCode(req, res));
  
  // Маршруты для транзакций
  app.get('/api/v2/users/:userId/transactions', (req, res) => transactionController.getUserTransactions(req, res));
  app.post('/api/v2/users/:userId/deposit', (req, res) => transactionController.depositFunds(req, res));
  app.post('/api/v2/users/:userId/withdraw', (req, res) => transactionController.withdrawFunds(req, res));
  app.post('/api/v2/transactions', (req, res) => transactionController.createTransaction(req, res));
  
  console.log('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}