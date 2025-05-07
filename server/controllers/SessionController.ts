/**
 * Контроллер для управления сессиями пользователей
 * 
 * Реализация согласно новой архитектуре: контроллер → сервис → хранилище
 */

import { Request, Response } from "express";
import { sessionService } from "../services";
import { StorageErrorType } from "../storage-interface";
import { generateRandomString } from "../utils/string-utils";

// Для корректной работы с сессией расширяем интерфейс Request
// Это временное решение, обходящее проблему с типизацией express-session
type RequestWithSession = Request & {
  session?: {
    userId?: number;
    user?: {
      id: number;
      username: string;
      ref_code?: string;
      guest_id?: string;
    };
  };
};

/**
 * Восстанавливает сессию пользователя по guest_id
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function restoreSession(req: RequestWithSession, res: Response) {
  try {
    // Получаем guest_id из тела запроса
    const { guest_id, telegram_id } = req.body;
    
    // Логирование всех заголовков запроса для диагностики
    console.log('[SessionController] Входящий запрос восстановления сессии. guest_id:', guest_id || 'отсутствует');
    console.log('[SessionController] Headers:', 
      Object.keys(req.headers)
        .filter(key => !key.includes('sec-') && !key.includes('accept'))  // Фильтруем технические заголовки
        .reduce((obj, key) => ({...obj, [key]: req.headers[key]}), {})
    );
    console.log('[SessionController] Session:', req.session ? 'доступна' : 'недоступна');
    if (req.session) {
      console.log('[SessionController] Session user:', req.session.user ? 'установлен' : 'не установлен');
      console.log('[SessionController] Session userId:', req.session.userId);
    }
    
    // Проверяем наличие guest_id
    if (!guest_id) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствует guest_id в запросе'
      });
    }
    
    console.log(`[SessionController] Этап 5: Попытка безопасного восстановления сессии для guest_id: ${guest_id}`);
    
    // Используем сервис для восстановления сессии
    const telegramIdNumber = telegram_id ? parseInt(telegram_id, 10) : undefined;
    const updatedUser = await sessionService.restoreSessionByGuestId(guest_id, telegramIdNumber);
    
    // Сохраняем данные пользователя в Express-сессии для последующих запросов
    if (req.session) {
      req.session.userId = updatedUser.id;
      req.session.user = {
        id: updatedUser.id,
        username: updatedUser.username || '',
        ref_code: updatedUser.ref_code || undefined,
        guest_id: updatedUser.guest_id || undefined
      };
      console.log(`[SessionController] ✅ Данные пользователя сохранены в Express-сессии: userId=${updatedUser.id}, ref_code=${updatedUser.ref_code || 'не указан'}`);
    } else {
      console.warn(`[SessionController] ⚠️ Express-сессия недоступна, нельзя сохранить данные пользователя`);
    }
    
    // Возвращаем данные пользователя
    return res.json({
      success: true,
      message: 'Сессия успешно восстановлена',
      data: {
        user_id: updatedUser.id,
        username: updatedUser.username,
        telegram_id: updatedUser.telegram_id, 
        balance_uni: updatedUser.balance_uni,
        balance_ton: updatedUser.balance_ton,
        ref_code: updatedUser.ref_code,
        guest_id: updatedUser.guest_id,
        created_at: updatedUser.created_at,
        parent_ref_code: updatedUser.parent_ref_code
      }
    });
  } catch (error: any) {
    console.error('[SessionController] Ошибка при восстановлении сессии:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    if (error.type === StorageErrorType.VALIDATION) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Ошибка валидации данных'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при восстановлении сессии'
    });
  }
}

/**
 * Создаёт гостевой ID для нового пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function generateGuestId(req: Request, res: Response) {
  try {
    // Генерируем новый уникальный guest_id
    const guestId = generateRandomString(36);
    
    return res.json({
      success: true,
      data: { guest_id: guestId }
    });
  } catch (error) {
    console.error('[SessionController] Ошибка при генерации guest_id:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при генерации guest_id'
    });
  }
}