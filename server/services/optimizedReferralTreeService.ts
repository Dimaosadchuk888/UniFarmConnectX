/**
 * Оптимизированный сервис для работы с реферальными деревьями
 * 
 * Этот сервис предоставляет методы для эффективной работы с глубокими реферальными цепочками,
 * используя рекурсивные CTE (Common Table Expressions) для повышения производительности при больших объемах данных.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { users, referrals } from '@shared/schema';

/**
 * Интерфейс структуры реферального уровня с агрегированными данными
 */
export interface ReferralLevel {
  level: number;
  count: number;
  user_ids: number[];
}

/**
 * Интерфейс структуры реферала для отображения в дереве
 */
export interface ReferralTreeNode {
  id: number;
  username: string;
  ref_code: string;
  level: number;
  children?: ReferralTreeNode[];
}

/**
 * Интерфейс для расширенной информации о реферальной структуре
 */
export interface ReferralStructureInfo {
  total_referrals: number;
  levels: ReferralLevel[];
  max_depth: number;
}

/**
 * Оптимизированный сервис для работы с глубокими реферальными структурами
 */
export class OptimizedReferralTreeService {
  /**
   * Максимальная глубина для выборки реферальной структуры
   */
  private readonly MAX_DEPTH = 20;

  /**
   * Получает агрегированную информацию о реферальной структуре пользователя по уровням
   * Использует рекурсивный CTE для эффективного построения дерева с любой глубиной
   * 
   * @param userId ID пользователя, для которого строится структура
   * @param maxDepth Максимальная глубина дерева, по умолчанию MAX_DEPTH (20)
   * @returns Агрегированные данные о реферальной структуре
   */
  async getReferralStructureInfo(userId: number, maxDepth: number = this.MAX_DEPTH): Promise<ReferralStructureInfo> {
    try {
      // Получаем код пользователя для построения дерева
      const [userInfo] = await db
        .select({ ref_code: users.ref_code })
        .from(users)
        .where(sql`${users.id} = ${userId}`);

      if (!userInfo || !userInfo.ref_code) {
        console.error(`[OptimizedReferralTreeService] User ${userId} not found or has no ref_code`);
        return { total_referrals: 0, levels: [], max_depth: 0 };
      }

      // Строим рекурсивный CTE для эффективного построения дерева
      const result = await db.execute(sql`
        WITH RECURSIVE referral_chain AS (
          -- Начальный запрос: выбираем прямых рефералов (уровень 1)
          SELECT 
            u.id, 
            u.username, 
            u.ref_code, 
            u.parent_ref_code,
            1 AS level
          FROM 
            users u
          WHERE 
            u.parent_ref_code = ${userInfo.ref_code}
          
          UNION ALL
          
          -- Рекурсивный запрос: находим всех рефералов на следующих уровнях
          SELECT 
            u.id, 
            u.username, 
            u.ref_code, 
            u.parent_ref_code, 
            rc.level + 1 AS level
          FROM 
            users u
          INNER JOIN 
            referral_chain rc ON u.parent_ref_code = rc.ref_code
          WHERE 
            rc.level < ${maxDepth}  -- Ограничиваем глубину
        )
        -- Финальный запрос: группируем результаты по уровням для агрегации
        SELECT 
          level,
          COUNT(*) AS count,
          ARRAY_AGG(id) AS user_ids
        FROM 
          referral_chain
        GROUP BY 
          level
        ORDER BY 
          level
      `);

      // Преобразуем результат в нужный формат
      const levels: ReferralLevel[] = result.rows.map(row => ({
        level: Number(row.level),
        count: Number(row.count),
        user_ids: Array.isArray(row.user_ids) ? row.user_ids.map(Number) : []
      }));

      // Вычисляем общее количество рефералов и максимальную глубину
      const total_referrals = levels.reduce((sum, level) => sum + level.count, 0);
      const max_depth = levels.length > 0 ? levels[levels.length - 1].level : 0;

      return {
        total_referrals,
        levels,
        max_depth
      };
    } catch (error) {
      console.error('[OptimizedReferralTreeService] Error getting referral structure:', error);
      return { total_referrals: 0, levels: [], max_depth: 0 };
    }
  }

  /**
   * Получает полное дерево рефералов для пользователя, включая вложенную структуру
   * Эффективная замена старого метода с множественными запросами
   * 
   * @param userId ID пользователя, для которого строится дерево
   * @param maxDepth Максимальная глубина дерева, по умолчанию 5
   * @returns Многоуровневое дерево рефералов
   */
  async getReferralTree(userId: number, maxDepth: number = 5): Promise<ReferralTreeNode[]> {
    try {
      // Получаем код пользователя для построения дерева
      const [userInfo] = await db
        .select({ ref_code: users.ref_code })
        .from(users)
        .where(sql`${users.id} = ${userId}`);

      if (!userInfo || !userInfo.ref_code) {
        console.error(`[OptimizedReferralTreeService] User ${userId} not found or has no ref_code`);
        return [];
      }

      // Получаем плоский список всех рефералов с рекурсивным CTE
      const result = await db.execute(sql`
        WITH RECURSIVE referral_chain AS (
          -- Находим всех прямых рефералов
          SELECT 
            u.id, 
            u.username, 
            u.ref_code, 
            u.parent_ref_code,
            1 AS level,
            u.ref_code AS path
          FROM 
            users u
          WHERE 
            u.parent_ref_code = ${userInfo.ref_code}
          
          UNION ALL
          
          -- Рекурсивно находим всех рефералов на следующих уровнях
          SELECT 
            u.id, 
            u.username, 
            u.ref_code, 
            u.parent_ref_code, 
            rc.level + 1 AS level,
            rc.path || ',' || u.ref_code AS path
          FROM 
            users u
          INNER JOIN 
            referral_chain rc ON u.parent_ref_code = rc.ref_code
          WHERE 
            rc.level < ${maxDepth}
        )
        -- Основной запрос: выбираем все данные для построения дерева
        SELECT 
          id,
          username,
          ref_code,
          parent_ref_code,
          level,
          path
        FROM 
          referral_chain
        ORDER BY 
          path, level
      `);

      // Преобразуем плоский список в иерархическое дерево
      const flatNodes: any[] = result.rows;
      const rootNodes: ReferralTreeNode[] = [];
      const nodeMap = new Map<string, ReferralTreeNode>();

      // Сначала создаем все узлы
      flatNodes.forEach(node => {
        const treeNode: ReferralTreeNode = {
          id: node.id,
          username: node.username,
          ref_code: node.ref_code,
          level: node.level,
          children: []
        };
        nodeMap.set(node.ref_code, treeNode);
      });

      // Затем устанавливаем иерархические связи
      flatNodes.forEach(node => {
        const treeNode = nodeMap.get(node.ref_code);
        if (node.level === 1) {
          // Узлы первого уровня добавляем в корневой массив
          rootNodes.push(treeNode!);
        } else {
          // Остальные узлы добавляем как дочерние к соответствующим родителям
          const parentNode = nodeMap.get(node.parent_ref_code);
          if (parentNode) {
            if (!parentNode.children) {
              parentNode.children = [];
            }
            parentNode.children.push(treeNode!);
          }
        }
      });

      return rootNodes;
    } catch (error) {
      console.error('[OptimizedReferralTreeService] Error building referral tree:', error);
      return [];
    }
  }

  /**
   * Получает всех пригласителей пользователя с использованием рекурсивного CTE
   * Эффективная замена запросов в цикле для получения цепочки пригласителей
   * 
   * @param userId ID пользователя, для которого ищутся пригласители
   * @param maxLevels Максимальное количество уровней вверх
   * @returns Массив пригласителей с указанием уровня
   */
  async getUserInviters(userId: number, maxLevels: number = this.MAX_DEPTH): Promise<{ id: number, level: number }[]> {
    try {
      // Получаем информацию о пользователе
      const [userInfo] = await db
        .select({ parent_ref_code: users.parent_ref_code })
        .from(users)
        .where(sql`${users.id} = ${userId}`);

      if (!userInfo || !userInfo.parent_ref_code) {
        // У пользователя нет пригласителя
        return [];
      }

      // Выполняем запрос с рекурсивным CTE для получения всей цепочки пригласителей
      const result = await db.execute(sql`
        WITH RECURSIVE inviter_chain AS (
          -- Начальный запрос: находим прямого пригласителя
          SELECT 
            u.id, 
            u.ref_code, 
            u.parent_ref_code,
            1 AS level
          FROM 
            users u
          WHERE 
            u.ref_code = ${userInfo.parent_ref_code}
          
          UNION ALL
          
          -- Рекурсивный запрос: находим пригласителей более высоких уровней
          SELECT 
            u.id, 
            u.ref_code, 
            u.parent_ref_code, 
            ic.level + 1 AS level
          FROM 
            users u
          INNER JOIN 
            inviter_chain ic ON u.ref_code = ic.parent_ref_code
          WHERE 
            u.parent_ref_code IS NOT NULL AND
            ic.level < ${maxLevels}
        )
        -- Финальный запрос
        SELECT 
          id,
          level
        FROM 
          inviter_chain
        ORDER BY 
          level
      `);

      // Преобразуем результат в требуемый формат
      return result.rows.map(row => ({
        id: Number(row.id),
        level: Number(row.level)
      }));
    } catch (error) {
      console.error('[OptimizedReferralTreeService] Error getting user inviters:', error);
      return [];
    }
  }

  /**
   * Создает индексы для оптимизации запросов к реферальной структуре
   * Должен вызываться при инициализации приложения
   */
  async createOptimalIndexes(): Promise<void> {
    try {
      console.log('[OptimizedReferralTreeService] Creating optimal indexes for referral queries...');
      
      // Создаем индекс для parent_ref_code для быстрого поиска прямых рефералов
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code 
        ON users (parent_ref_code)
      `);
      
      // Создаем индекс для ref_code для быстрого поиска по реферальным кодам
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_users_ref_code 
        ON users (ref_code)
      `);

      // Индекс для быстрого поиска реферальных связей по user_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_referrals_user_id 
        ON referrals (user_id)
      `);

      // Индекс для быстрого поиска реферальных связей по inviter_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id 
        ON referrals (inviter_id)
      `);

      console.log('[OptimizedReferralTreeService] Optimal indexes created successfully');
    } catch (error) {
      console.error('[OptimizedReferralTreeService] Error creating indexes:', error);
    }
  }
}

// Создаем и экспортируем единственный экземпляр сервиса
export const optimizedReferralTreeService = new OptimizedReferralTreeService();