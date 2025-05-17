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
import { SessionController } from './controllers/sessionController';
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация новых маршрутов API');

  // Маршруты для сессий
  app.post('/api/v2/session/restore', (req, res) => SessionController.restoreSession(req, res));
  app.get('/api/v2/session/generate-guest-id', (req, res) => SessionController.generateGuestId(req, res));
  
  // Маршруты для пользователей
  app.get('/api/v2/users/:id', (req, res) => UserController.getUserById(req, res));
  app.get('/api/v2/users/username/:username', (req, res) => UserController.getUserByUsername(req, res));
  app.get('/api/v2/users/guest/:guestId', (req, res) => UserController.getUserByGuestId(req, res));
  app.get('/api/v2/users/ref-code/:refCode', (req, res) => UserController.getUserByRefCode(req, res));
  app.post('/api/v2/users', (req, res) => UserController.createUser(req, res));
  app.put('/api/v2/users/:id/ref-code', (req, res) => UserController.updateRefCode(req, res));
  
  // Маршруты для транзакций
  app.get('/api/v2/users/:userId/transactions', (req, res) => TransactionController.getUserTransactions(req, res));
  app.post('/api/v2/users/:userId/deposit', (req, res) => TransactionController.depositFunds(req, res));
  app.post('/api/v2/users/:userId/withdraw', (req, res) => TransactionController.withdrawFunds(req, res));
  app.post('/api/v2/transactions', (req, res) => TransactionController.createTransaction(req, res));
  
  console.log('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}