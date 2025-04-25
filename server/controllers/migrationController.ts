import { Request, Response } from 'express';
import { addGuestIdColumn } from '../migrations/add_guest_id_column';

/**
 * Запускает миграцию для добавления поля guest_id
 * Только для внутреннего использования и разработки
 */
export async function runAddGuestIdMigration(req: Request, res: Response) {
  console.log('[MigrationController] Запрос на выполнение миграции добавления guest_id');
  
  try {
    // Запускаем миграцию
    await addGuestIdColumn();
    
    // Отправляем успешный ответ
    res.status(200).json({ 
      success: true, 
      message: 'Миграция для добавления поля guest_id успешно выполнена'
    });
  } catch (error) {
    console.error('[MigrationController] Ошибка при выполнении миграции:', error);
    
    // Отправляем ответ с ошибкой
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при выполнении миграции', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}