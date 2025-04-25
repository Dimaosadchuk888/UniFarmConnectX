import { Request, Response } from 'express';
import { storage } from '../storage';
import { verifyTelegramWebAppData, logTelegramData } from '../utils/telegramUtils';

// Класс TelegramController для совместимости с существующим кодом
export class TelegramController {
  static async handleWebhook(req: Request, res: Response) {
    try {
      console.log('[TelegramController] Получен webhook от Telegram');
      
      // Расширенное логирование для отладки
      if (req.body) {
        console.log('[TelegramWebhook] Детали запроса:', {
          updateId: req.body?.update_id,
          hasMessage: !!req.body?.message,
          hasCallback: !!req.body?.callback_query,
          messageId: req.body?.message?.message_id,
          from: req.body?.message?.from ? 
                `${req.body.message.from.first_name || ''} ${req.body.message.from.last_name || ''} (@${req.body.message.from.username || 'нет_username'}) [ID: ${req.body.message.from.id}]` : 
                'нет_данных',
          text: req.body?.message?.text || 'нет_текста',
          chat: req.body?.message?.chat ? 
                `${req.body.message.chat.type} [ID: ${req.body.message.chat.id}]` : 
                'нет_данных_чата'
        });
        
        // Проверяем наличие команды
        if (req.body?.message?.entities) {
          const hasCommand = req.body.message.entities.some((e: any) => e.type === 'bot_command');
          if (hasCommand) {
            console.log('[TelegramWebhook] Обнаружена команда в сообщении:', req.body.message.text);
          }
        }
        
        // Полный вывод содержимого для отладки (только в режиме разработки)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[TelegramWebhook] Полное содержимое webhook:', JSON.stringify(req.body, null, 2));
        }
      } else {
        console.warn('[TelegramWebhook] Получен пустой запрос без тела');
      }
      
      // Ответим Telegram, что запрос получен
      res.status(200).send('OK');
      
      // Дополнительная обработка запроса может быть выполнена асинхронно
      // Например, вызов функций из telegramBot.js
      
    } catch (error) {
      console.error('[TelegramWebhook] Ошибка при обработке webhook:', error);
      // Даже при ошибке отправляем 200 OK, чтобы Telegram не пытался переотправить запрос
      res.status(200).send('Error processed');
    }
  }
}

/**
 * Контроллер для работы с Telegram API
 * Обрабатывает запросы, связанные с аутентификацией Telegram Mini App
 */
export async function validateInitData(req: Request, res: Response) {
  try {
    // Логирование входящего запроса для отладки
    console.log('[TelegramController] Получен запрос на валидацию initData:', {
      body: req.body,
      headers: {
        'telegram-data': req.headers['telegram-data'],
        'telegram-init-data': req.headers['telegram-init-data'],
        'user-agent': req.headers['user-agent'],
      }
    });

    const { initData } = req.body;

    if (!initData) {
      console.log('[TelegramController] Ошибка: отсутствует поле initData в запросе');
      return res.status(400).json({
        success: false,
        message: 'Отсутствует поле initData'
      });
    }

    // Проверяем данные от Telegram
    const validationResult = await verifyTelegramWebAppData(initData);

    // Расширенное логирование результата верификации
    console.log('[TelegramController] Результат верификации:', validationResult);

    // Если данные валидны, возвращаем информацию о пользователе
    if (validationResult.isValid && validationResult.userId) {
      // Пытаемся получить пользователя из БД
      const user = await storage.getUserByTelegramId(validationResult.userId);

      // Если пользователь существует в БД, возвращаем его данные
      if (user) {
        return res.json({
          success: true,
          data: {
            isValid: true,
            user: {
              id: user.id,
              telegramId: user.telegram_id,
              username: user.username,
              firstName: user.username || validationResult.firstName || null, // Используем username, т.к. first_name отсутствует
              walletAddress: user.ton_wallet_address,
              balance: user.balance_uni || "0",
              referralCode: user.ref_code
            }
          }
        });
      }

      // Если пользователя нет в БД, возвращаем только Telegram ID и признак валидности
      return res.json({
        success: true,
        data: {
          isValid: true,
          telegramId: validationResult.userId,
          needRegistration: true
        }
      });
    }

    // Если данные невалидны
    return res.json({
      success: false,
      message: 'Ошибка валидации данных Telegram',
      errors: validationResult.errors
    });
  } catch (error) {
    console.error('[TelegramController] Ошибка при валидации initData:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при валидации данных'
    });
  }
}

/**
 * Получение информации о мини-приложении
 */
export async function getMiniAppInfo(req: Request, res: Response) {
  try {
    // Информация о мини-приложении для отображения на стороне клиента
    const miniAppInfo = {
      name: "UniFarm",
      botUsername: "@UniFarming_Bot",
      appUrl: "https://t.me/UniFarming_Bot/UniFarm",
      version: "1.0.0",
      description: "Telegram Mini App для крипто-фарминга и реферальной программы",
      features: [
        "Фарминг UNI токенов",
        "Реферальная программа с 20 уровнями",
        "Интеграция с TON Blockchain",
        "Ежедневные бонусы"
      ]
    };

    return res.json({
      success: true,
      data: miniAppInfo
    });
  } catch (error) {
    console.error('[TelegramController] Ошибка при получении информации о мини-приложении:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении информации'
    });
  }
}

/**
 * Регистрация пользователя через Telegram
 */
export async function registerTelegramUser(req: Request, res: Response) {
  try {
    const { initData, referrer } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют данные для регистрации'
      });
    }

    // Проверяем данные от Telegram
    const validationResult = await verifyTelegramWebAppData(initData);

    if (!validationResult.isValid || !validationResult.userId) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных Telegram',
        errors: validationResult.errors
      });
    }

    // Получаем данные из initData
    const { userId, username, firstName, lastName } = validationResult;

    // Проверяем, существует ли пользователь
    let user = await storage.getUserByTelegramId(userId);

    if (user) {
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            telegramId: user.telegram_id,
            username: user.username,
            firstName: username || firstName || null, // Используем переданные данные
            walletAddress: user.ton_wallet_address,
            balance: user.balance_uni || "0",
            referralCode: user.ref_code
          },
          message: 'Пользователь уже зарегистрирован'
        }
      });
    }

    // Генерируем уникальный реферальный код
    const refCode = `ref_${Math.random().toString(36).substring(2, 10)}`;

    // Создаем нового пользователя
    user = await storage.createUserWithTelegram({
      telegram_id: userId,
      username: username || null,
      first_name: firstName || null,
      last_name: lastName || null,
      balance: 0,
      farming_rate: 1,
      wallet_address: null,
      ref_code: refCode,
      referrer_id: referrer ? parseInt(referrer) : null,
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: username || firstName || null, // Используем переданные данные
          walletAddress: user.ton_wallet_address,
          balance: user.balance_uni || "0",
          referralCode: user.ref_code
        },
        message: 'Пользователь успешно зарегистрирован'
      }
    });
  } catch (error) {
    console.error('[TelegramController] Ошибка при регистрации пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации пользователя'
    });
  }
}