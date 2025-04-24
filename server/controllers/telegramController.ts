/**
 * Контроллер для обработки Telegram webhook запросов
 * Обрабатывает команды и взаимодействие с пользователями
 */

import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ReferralService } from '../services/referralService';

// Токен Telegram бота из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app';

// Класс для обработки Telegram запросов
export class TelegramController {
  // Базовый URL для вызова Telegram API
  private static API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

  /**
   * Обрабатывает входящий webhook от Telegram
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем наличие обновления
      if (!req.body) {
        console.warn('[TelegramController] Получен пустой запрос без тела');
        res.status(400).json({ ok: false, error: 'Empty request body' });
        return;
      }

      const update = req.body;
      
      // Логируем информацию о входящем обновлении
      console.log(`[TelegramController] Получено обновление от Telegram:`, 
        JSON.stringify(update, null, 2).substring(0, 500) + '...');
      
      // Проверяем тип обновления
      if (update.message) {
        // Обработка обычных сообщений и команд
        await TelegramController.handleMessage(update.message);
      } else if (update.callback_query) {
        // Обработка callback запросов (нажатий на inline кнопки)
        await TelegramController.handleCallbackQuery(update.callback_query);
      } else {
        console.log('[TelegramController] Получен неподдерживаемый тип обновления');
      }
      
      // Всегда отвечаем 200 OK, даже если обработка не удалась,
      // чтобы Telegram не пытался повторно отправить то же самое обновление
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[TelegramController] Ошибка обработки webhook:', error);
      res.status(200).json({ ok: true }); // Всегда отвечаем OK для Telegram
    }
  }

  /**
   * Обрабатывает обычные сообщения и команды
   */
  private static async handleMessage(message: any): Promise<void> {
    try {
      const chatId = message.chat.id;
      const text = message.text || '';
      
      // Обработка команд, начинающихся с "/"
      if (text.startsWith('/')) {
        const command = text.split(' ')[0].substring(1).toLowerCase();
        
        // Извлекаем аргументы команды (все что после пробела)
        const args = text.indexOf(' ') > 0 ? text.substring(text.indexOf(' ') + 1) : '';
        
        switch (command) {
          case 'start':
            await TelegramController.handleStartCommand(chatId, args);
            break;
          case 'ping':
            await TelegramController.handlePingCommand(chatId);
            break;
          case 'info':
            await TelegramController.handleInfoCommand(chatId, message.from);
            break;
          case 'refcode':
            await TelegramController.handleRefCodeCommand(chatId, message.from.id);
            break;
          case 'app':
            await TelegramController.handleAppCommand(chatId);
            break;
          default:
            await TelegramController.sendMessage(chatId, 
              `Команда /${command} не распознана. Используйте /help для просмотра списка доступных команд.`);
        }
      } else {
        // Обработка обычных сообщений
        await TelegramController.handleRegularMessage(chatId, message);
      }
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке сообщения:', error);
    }
  }

  /**
   * Обрабатывает callback запросы (нажатия на inline кнопки)
   */
  private static async handleCallbackQuery(query: any): Promise<void> {
    try {
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;
      const data = query.data;
      const userId = query.from.id;
      
      console.log(`[TelegramController] Получен callback_query: ${data} от пользователя ${userId}`);
      
      switch (data) {
        case 'get_refcode':
          // Обрабатываем запрос на получение реферального кода
          await TelegramController.handleRefCodeCommand(chatId, userId, messageId);
          break;
        case 'open_app':
          // Отправляем сообщение с кнопкой для открытия Mini App
          await TelegramController.handleAppCommand(chatId, messageId);
          break;
        default:
          console.log(`[TelegramController] Неизвестный callback_query: ${data}`);
          await TelegramController.answerCallbackQuery(query.id, 'Неизвестное действие');
      }
      
      // Отвечаем на callback query чтобы убрать состояние загрузки с кнопки
      await TelegramController.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке callback query:', error);
    }
  }

  /**
   * Обрабатывает команду /start
   */
  private static async handleStartCommand(chatId: number, startParam: string): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка команды /start от ${chatId} с параметром: ${startParam}`);
      
      // Сохраняем стартовый параметр, если он есть (для реферальной системы)
      let refCode = null;
      if (startParam) {
        // Обрабатываем реферальный код из startParam
        if (startParam.startsWith('ref_')) {
          refCode = startParam;
        } else if (startParam.match(/^[a-f0-9]{12}$/)) {
          // Если это просто идентификатор длиной 12 символов, считаем его реферальным кодом
          refCode = `ref_${startParam}`;
        }
        
        if (refCode) {
          console.log(`[TelegramController] Обнаружен реферальный код: ${refCode}`);
        }
      }
      
      // Формируем приветственное сообщение
      const welcomeMessage = `
👋 Добро пожаловать в UniFarm!

Начните фарминг и заработок прямо сейчас в нашем Mini App.
Пригласите друзей и получайте реферальные бонусы!

🔽 Нажмите кнопку ниже, чтобы начать 🔽
      `;
      
      // Клавиатура с кнопкой для открытия Mini App
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: 'Открыть UniFarm 🚀',
              web_app: { url: APP_URL }
            }
          ],
          [
            {
              text: "Узнать мой реферальный код",
              callback_data: "get_refcode"
            }
          ]
        ]
      };
      
      await TelegramController.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке команды /start:', error);
    }
  }

  /**
   * Обрабатывает команду /ping
   */
  private static async handlePingCommand(chatId: number): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка команды /ping от ${chatId}`);
      
      // Отправляем сообщение с временем отклика
      const startTime = Date.now();
      const message = await TelegramController.sendMessage(chatId, '🏓 Проверка соединения...');
      
      if (message && message.message_id) {
        const responseTime = Date.now() - startTime;
        await TelegramController.editMessage(
          chatId, 
          message.message_id, 
          `🏓 Понг! Время отклика: ${responseTime} мс`
        );
      }
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке команды /ping:', error);
    }
  }

  /**
   * Обрабатывает команду /info
   */
  private static async handleInfoCommand(chatId: number, user: any): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка команды /info от ${chatId}`);
      
      const telegramId = user.id;
      
      // Получаем информацию о пользователе из базы данных
      const userData = await UserService.getUserByTelegramId(telegramId);
      
      if (userData) {
        // Формируем информационное сообщение
        const infoMessage = `
📊 <b>Информация о вашем аккаунте:</b>

🆔 ID пользователя: <code>${userData.id}</code>
👤 Имя: ${user.first_name || ''} ${user.last_name || ''}
🔑 Telegram ID: <code>${telegramId}</code>
${userData.wallet_address ? `💼 TON Кошелек: <code>${userData.wallet_address}</code>` : '💼 TON Кошелек: не подключен'}
💰 Баланс UNI: <b>${userData.balance_uni || '0'}</b>
🪙 Баланс TON: <b>${userData.balance_ton || '0'}</b>
        `;
        
        await TelegramController.sendMessage(chatId, infoMessage, { parse_mode: 'HTML' });
      } else {
        // Если пользователь не найден в базе данных
        const notFoundMessage = `
⚠️ <b>Вы еще не зарегистрированы в системе</b>

Пожалуйста, откройте наше приложение, чтобы зарегистрироваться.

🔽 Нажмите кнопку ниже, чтобы открыть приложение 🔽
        `;
        
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Открыть UniFarm 🚀',
                web_app: { url: APP_URL }
              }
            ]
          ]
        };
        
        await TelegramController.sendMessage(chatId, notFoundMessage, { 
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке команды /info:', error);
    }
  }

  /**
   * Обрабатывает команду /refcode
   */
  private static async handleRefCodeCommand(chatId: number, telegramId: number, messageId?: number): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка команды /refcode от ${chatId} (Telegram ID: ${telegramId})`);
      
      // Получаем информацию о пользователе из базы данных
      const userData = await UserService.getUserByTelegramId(telegramId);
      
      if (userData && userData.ref_code) {
        // Формируем сообщение с реферальным кодом
        const refMessage = `
🔗 <b>Ваш реферальный код:</b>

<code>${userData.ref_code}</code>

📱 <b>Ссылка для приглашения друзей:</b>
<code>https://t.me/${BOT_TOKEN?.split(':')[0]}?start=${userData.ref_code}</code>

Отправьте эту ссылку друзьям и получайте бонусы за каждого приглашенного пользователя!
        `;
        
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Открыть список рефералов',
                web_app: { url: `${APP_URL}/friends` }
              }
            ]
          ]
        };
        
        if (messageId) {
          // Если это ответ на нажатие кнопки, редактируем существующее сообщение
          await TelegramController.editMessage(chatId, messageId, refMessage, { 
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        } else {
          // Если это команда, отправляем новое сообщение
          await TelegramController.sendMessage(chatId, refMessage, { 
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      } else {
        // Если пользователь не найден или у него нет реферального кода
        const notFoundMessage = `
⚠️ <b>Реферальный код не найден</b>

Пожалуйста, откройте наше приложение, чтобы получить реферальный код.

🔽 Нажмите кнопку ниже, чтобы открыть приложение 🔽
        `;
        
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Открыть UniFarm 🚀',
                web_app: { url: APP_URL }
              }
            ]
          ]
        };
        
        if (messageId) {
          // Если это ответ на нажатие кнопки, редактируем существующее сообщение
          await TelegramController.editMessage(chatId, messageId, notFoundMessage, { 
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        } else {
          // Если это команда, отправляем новое сообщение
          await TelegramController.sendMessage(chatId, notFoundMessage, { 
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      }
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке команды /refcode:', error);
    }
  }

  /**
   * Обрабатывает команду /app
   */
  private static async handleAppCommand(chatId: number, messageId?: number): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка команды /app от ${chatId}`);
      
      // Формируем сообщение с кнопкой для открытия Mini App
      const appMessage = `
🚀 <b>UniFarm - ваш путь к крипто-фармингу!</b>

Открывайте приложение для заработка и управления вашим портфолио.
Следите за своими доходами и приглашайте друзей для увеличения прибыли!

🔽 Нажмите кнопку ниже, чтобы открыть Mini App 🔽
      `;
      
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: 'Открыть UniFarm 🚀',
              web_app: { url: APP_URL }
            }
          ]
        ]
      };
      
      if (messageId) {
        // Если это ответ на нажатие кнопки, редактируем существующее сообщение
        await TelegramController.editMessage(chatId, messageId, appMessage, { 
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        // Если это команда, отправляем новое сообщение
        await TelegramController.sendMessage(chatId, appMessage, { 
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке команды /app:', error);
    }
  }

  /**
   * Обрабатывает обычные текстовые сообщения
   */
  private static async handleRegularMessage(chatId: number, message: any): Promise<void> {
    try {
      console.log(`[TelegramController] Обработка обычного сообщения от ${chatId}`);
      
      // Тут можно добавить логику обработки обычных сообщений
      // Например, ответы на вопросы, обработка ключевых слов и т.д.
      
      // Пока просто отправляем стандартный ответ с предложением использовать команды
      const helpMessage = `
👋 Привет! Я бот UniFarm.

Для взаимодействия со мной используйте следующие команды:
/start - Начать работу с ботом
/app - Открыть UniFarm Mini App
/refcode - Получить ваш реферальный код
/info - Информация о вашем аккаунте
/ping - Проверить соединение с ботом

Или используйте кнопку меню для открытия приложения.
      `;
      
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: 'Открыть UniFarm 🚀',
              web_app: { url: APP_URL }
            }
          ]
        ]
      };
      
      await TelegramController.sendMessage(chatId, helpMessage, { reply_markup: keyboard });
    } catch (error) {
      console.error('[TelegramController] Ошибка при обработке обычного сообщения:', error);
    }
  }

  /**
   * Отправляет сообщение пользователю
   */
  private static async sendMessage(chatId: number, text: string, options: any = {}): Promise<any> {
    try {
      const response = await fetch(`${TelegramController.API_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          ...options
        }),
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        console.error(`[TelegramController] Ошибка при отправке сообщения: ${result.description}`);
        return null;
      }
      
      return result.result;
    } catch (error) {
      console.error('[TelegramController] Ошибка при отправке сообщения:', error);
      return null;
    }
  }

  /**
   * Редактирует существующее сообщение
   */
  private static async editMessage(chatId: number, messageId: number, text: string, options: any = {}): Promise<any> {
    try {
      const response = await fetch(`${TelegramController.API_URL}/editMessageText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          ...options
        }),
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        console.error(`[TelegramController] Ошибка при редактировании сообщения: ${result.description}`);
        return null;
      }
      
      return result.result;
    } catch (error) {
      console.error('[TelegramController] Ошибка при редактировании сообщения:', error);
      return null;
    }
  }

  /**
   * Отвечает на callback query
   */
  private static async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<any> {
    try {
      const response = await fetch(`${TelegramController.API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text
        }),
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        console.error(`[TelegramController] Ошибка при ответе на callback query: ${result.description}`);
        return null;
      }
      
      return result.result;
    } catch (error) {
      console.error('[TelegramController] Ошибка при ответе на callback query:', error);
      return null;
    }
  }
}