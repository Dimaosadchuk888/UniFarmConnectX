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

// Импорт функций напрямую из файлов контроллеров (с учетом правильного регистра)
import { restoreSession, generateGuestId } from './controllers/SessionController';
import { getUserById, getUserByUsername, getUserByGuestId, getUserByRefCode, createUser, updateRefCode } from './controllers/UserController';
import { getUserTransactions, depositFunds, withdrawFunds, createTransaction } from './controllers/TransactionController';

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация новых маршрутов API');

  // Маршруты для сессий
  app.post('/api/v2/session/restore', (req, res) => restoreSession(req, res));
  app.get('/api/v2/session/generate-guest-id', (req, res) => generateGuestId(req, res));
  
  // Маршруты для пользователей
  app.get('/api/v2/users/:id', (req, res) => getUserById(req, res));
  app.get('/api/v2/users/username/:username', (req, res) => getUserByUsername(req, res));
  app.get('/api/v2/users/guest/:guestId', (req, res) => getUserByGuestId(req, res));
  app.get('/api/v2/users/ref-code/:refCode', (req, res) => getUserByRefCode(req, res));
  app.post('/api/v2/users', (req, res) => createUser(req, res));
  app.put('/api/v2/users/:id/ref-code', (req, res) => updateRefCode(req, res));
  
  // Маршруты для транзакций
  app.get('/api/v2/users/:userId/transactions', (req, res) => getUserTransactions(req, res));
  app.post('/api/v2/users/:userId/deposit', (req, res) => depositFunds(req, res));
  app.post('/api/v2/users/:userId/withdraw', (req, res) => withdrawFunds(req, res));
  app.post('/api/v2/transactions', (req, res) => createTransaction(req, res));
  
  console.log('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}