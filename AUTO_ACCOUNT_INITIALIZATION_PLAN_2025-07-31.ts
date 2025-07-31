#!/usr/bin/env tsx
/**
 * 🔧 ПЛАН АВТОМАТИЧЕСКОЙ ИНИЦИАЛИЗАЦИИ АККАУНТОВ
 * Предотвращение проблем различий между пользователями
 * Дата: 31.07.2025
 */

console.log('🔧 ПЛАН АВТОМАТИЧЕСКОЙ ИНИЦИАЛИЗАЦИИ АККАУНТОВ');
console.log('='.repeat(80));

const implementationPlan = `
🎯 ЦЕЛЬ: Обеспечить единую структуру для всех новых пользователей

📋 ПРОБЛЕМЫ, КОТОРЫЕ РЕШАЕМ:
1. Неполная инициализация при регистрации
2. Отсутствующие связанные записи
3. Нулевые или NULL балансы
4. Отсутствие базовых транзакций
5. Несинхронизированные статусы

🛠️ ПЛАН РЕАЛИЗАЦИИ:

═══════════════════════════════════════════════════════════════════════════════
1. МОДИФИКАЦИЯ СЕРВИСА АУТЕНТИФИКАЦИИ
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: modules/auth/service.ts

ТЕКУЩАЯ ПРОБЛЕМА:
- Создается только основная запись в users
- Нет проверок на полноту инициализации
- Отсутствует создание связанных записей

РЕШЕНИЕ:
async function createUserWithFullInitialization(telegramData: any) {
  const transaction = await db.transaction();
  
  try {
    // 1. Генерируем уникальный ref_code
    const refCode = await generateUniqueRefCode();
    
    // 2. Создаем основного пользователя
    const [user] = await transaction.insert(users).values({
      telegram_id: telegramData.id,
      username: telegramData.username,
      first_name: telegramData.first_name,
      last_name: telegramData.last_name,
      ref_code: refCode,
      parent_ref_code: telegramData.start_param || null,
      balance_uni: "0.01", // Стартовый баланс
      balance_ton: "0.01", // Стартовый баланс
      uni_farming_active: false,
      ton_boost_active: false,
      created_at: new Date()
    }).returning();
    
    // 3. Создаем приветственную транзакцию
    await transaction.insert(transactions).values({
      user_id: user.id,
      transaction_type: 'SYSTEM_INITIALIZATION',
      currency: 'UNI',
      amount: "0.01",
      status: 'confirmed',
      description: 'Welcome to UniFarm - initial balance',
      created_at: new Date(),
      data: JSON.stringify({
        initialization: true,
        version: '2025.07.31',
        reference_user: 25
      })
    });
    
    // 4. Создаем пассивную запись farming data
    await transaction.insert(ton_farming_data).values({
      user_id: user.id,
      farming_balance: "0",
      farming_rate: "0",
      boost_active: false,
      last_update: new Date(),
      created_at: new Date()
    });
    
    // 5. Создаем первую сессию
    const sessionToken = generateSecureToken();
    await transaction.insert(user_sessions).values({
      user_id: user.id,
      session_token: sessionToken,
      telegram_init_data: JSON.stringify(telegramData),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
      created_at: new Date()
    });
    
    // 6. Обрабатываем реферальную систему
    if (telegramData.start_param) {
      await processReferralConnection(transaction, user.id, telegramData.start_param);
    }
    
    await transaction.commit();
    
    // 7. Логируем успешную инициализацию
    console.log(\`[AUTO_INIT] User \${user.id} fully initialized\`, {
      telegram_id: user.telegram_id,
      ref_code: user.ref_code,
      has_transactions: true,
      has_farming_data: true,
      has_session: true
    });
    
    return { user, sessionToken };
    
  } catch (error) {
    await transaction.rollback();
    console.error('[AUTO_INIT] Failed to initialize user:', error);
    throw new Error('User initialization failed');
  }
}

═══════════════════════════════════════════════════════════════════════════════
2. MIDDLEWARE ДЛЯ ПРОВЕРКИ ЦЕЛОСТНОСТИ АККАУНТА
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: core/middleware/accountIntegrityCheck.ts

export async function validateAccountIntegrity(userId: number): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Получаем основные данные пользователя
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) {
    return { isValid: false, issues: ['User not found'], recommendations: [] };
  }
  
  const userData = user[0];
  
  // 1. Проверяем критические поля
  if (!userData.telegram_id) {
    issues.push('Missing telegram_id');
    recommendations.push('Re-authenticate with Telegram');
  }
  
  if (!userData.ref_code) {
    issues.push('Missing ref_code');
    recommendations.push('Generate unique referral code');
  }
  
  if (!userData.balance_uni || parseFloat(userData.balance_uni) < 0.01) {
    issues.push('Invalid UNI balance');
    recommendations.push('Initialize minimum UNI balance');
  }
  
  if (!userData.balance_ton || parseFloat(userData.balance_ton) < 0.01) {
    issues.push('Invalid TON balance');
    recommendations.push('Initialize minimum TON balance');
  }
  
  // 2. Проверяем транзакции
  const transactionCount = await db
    .select({ count: sql\`count(*)\` })
    .from(transactions)
    .where(eq(transactions.user_id, userId));
    
  if (transactionCount[0].count === 0) {
    issues.push('No transaction history');
    recommendations.push('Create initialization transaction');
  }
  
  // 3. Проверяем farming data для TON Boost
  if (userData.ton_boost_active) {
    const farmingData = await db
      .select()
      .from(ton_farming_data)
      .where(eq(ton_farming_data.user_id, userId))
      .limit(1);
      
    if (!farmingData.length) {
      issues.push('TON Boost active but no farming data');
      recommendations.push('Create farming data record');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

export async function repairAccountIntegrity(userId: number): Promise<boolean> {
  const validation = await validateAccountIntegrity(userId);
  
  if (validation.isValid) {
    return true; // Аккаунт уже в порядке
  }
  
  console.log(\`[REPAIR] Fixing account \${userId}\`, validation.issues);
  
  const transaction = await db.transaction();
  
  try {
    // Исправляем ref_code
    if (validation.issues.includes('Missing ref_code')) {
      const refCode = \`REF\${userId.toString().padStart(6, '0')}\`;
      await transaction
        .update(users)
        .set({ ref_code: refCode })
        .where(eq(users.id, userId));
    }
    
    // Исправляем балансы
    if (validation.issues.includes('Invalid UNI balance') || 
        validation.issues.includes('Invalid TON balance')) {
      await transaction
        .update(users)
        .set({ 
          balance_uni: "0.01",
          balance_ton: "0.01"
        })
        .where(eq(users.id, userId));
    }
    
    // Создаем недостающие транзакции
    if (validation.issues.includes('No transaction history')) {
      await transaction.insert(transactions).values({
        user_id: userId,
        transaction_type: 'ACCOUNT_REPAIR',
        currency: 'UNI',
        amount: "0.01",
        status: 'confirmed',
        description: 'Account integrity repair - initialization',
        created_at: new Date(),
        data: JSON.stringify({
          repair: true,
          issues_fixed: validation.issues,
          timestamp: new Date().toISOString()
        })
      });
    }
    
    // Создаем farming data если нужно
    if (validation.issues.includes('TON Boost active but no farming data')) {
      await transaction.insert(ton_farming_data).values({
        user_id: userId,
        farming_balance: "0",
        farming_rate: "0",
        boost_active: false,
        last_update: new Date(),
        created_at: new Date()
      });
    }
    
    await transaction.commit();
    
    console.log(\`[REPAIR] Account \${userId} successfully repaired\`);
    return true;
    
  } catch (error) {
    await transaction.rollback();
    console.error(\`[REPAIR] Failed to repair account \${userId}:\`, error);
    return false;
  }
}

═══════════════════════════════════════════════════════════════════════════════
3. MIDDLEWARE ИНТЕГРАЦИЯ В API
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: core/middleware/telegramAuth.ts

// Добавить в существующий middleware:
export async function requireTelegramAuthWithIntegrityCheck(req: Request, res: Response, next: NextFunction) {
  try {
    // Существующая логика аутентификации...
    const user = await authenticateUser(req);
    
    // НОВОЕ: Проверка целостности аккаунта
    const integrityCheck = await validateAccountIntegrity(user.id);
    
    if (!integrityCheck.isValid) {
      console.log(\`[INTEGRITY] User \${user.id} has issues:\`, integrityCheck.issues);
      
      // Пытаемся автоматически исправить
      const repaired = await repairAccountIntegrity(user.id);
      
      if (!repaired) {
        return res.status(400).json({
          error: 'Account integrity issues detected',
          issues: integrityCheck.issues,
          recommendations: integrityCheck.recommendations,
          need_manual_review: true
        });
      }
      
      console.log(\`[INTEGRITY] User \${user.id} auto-repaired successfully\`);
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('[AUTH] Authentication failed:', error);
    res.status(401).json({ error: 'Authentication required' });
  }
}

═══════════════════════════════════════════════════════════════════════════════
4. АВТОМАТИЧЕСКАЯ ПРОВЕРКА ПРИ ВХОДЕ ПОЛЬЗОВАТЕЛЯ
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: client/src/hooks/useAutoAccountValidation.ts

import { useEffect, useState } from 'react';
import { correctApiRequest } from '@/lib/correctApiRequest';

interface AccountValidation {
  isValid: boolean;
  issues: string[];
  autoRepaired: boolean;
}

export function useAutoAccountValidation() {
  const [validation, setValidation] = useState<AccountValidation | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  useEffect(() => {
    checkAccountIntegrity();
  }, []);
  
  async function checkAccountIntegrity() {
    setIsChecking(true);
    
    try {
      const response = await correctApiRequest('/api/v2/account/integrity-check');
      
      if (response.success) {
        setValidation(response.data);
        
        if (!response.data.isValid && response.data.autoRepaired) {
          console.log('[ACCOUNT] Integrity issues auto-repaired:', response.data.issues);
          // Можно показать toast уведомление
        }
      }
    } catch (error) {
      console.error('[ACCOUNT] Integrity check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }
  
  return {
    validation,
    isChecking,
    recheckIntegrity: checkAccountIntegrity
  };
}

═══════════════════════════════════════════════════════════════════════════════
5. API ENDPOINT ДЛЯ ПРОВЕРКИ ЦЕЛОСТНОСТИ
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: modules/account/controller.ts

export async function checkAccountIntegrity(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    
    const validation = await validateAccountIntegrity(userId);
    
    if (!validation.isValid) {
      // Пытаемся автоматически исправить
      const repaired = await repairAccountIntegrity(userId);
      
      return res.json({
        success: true,
        data: {
          isValid: repaired,
          issues: validation.issues,
          autoRepaired: repaired,
          recommendations: repaired ? [] : validation.recommendations
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        isValid: true,
        issues: [],
        autoRepaired: false,
        recommendations: []
      }
    });
    
  } catch (error) {
    console.error('[API] Account integrity check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check account integrity'
    });
  }
}

═══════════════════════════════════════════════════════════════════════════════
6. МОНИТОРИНГ И АЛЕРТИНГ
═══════════════════════════════════════════════════════════════════════════════

📁 Файл: modules/monitoring/accountHealthMonitor.ts

export class AccountHealthMonitor {
  private static instance: AccountHealthMonitor;
  
  public static getInstance(): AccountHealthMonitor {
    if (!AccountHealthMonitor.instance) {
      AccountHealthMonitor.instance = new AccountHealthMonitor();
    }
    return AccountHealthMonitor.instance;
  }
  
  async dailyHealthCheck(): Promise<void> {
    console.log('[MONITOR] Starting daily account health check...');
    
    // Проверяем аккаунты, созданные за последние 24 часа
    const recentUsers = await db
      .select()
      .from(users)
      .where(gte(users.created_at, new Date(Date.now() - 24 * 60 * 60 * 1000)));
    
    let healthyCount = 0;
    let issuesCount = 0;
    let repairedCount = 0;
    
    for (const user of recentUsers) {
      const validation = await validateAccountIntegrity(user.id);
      
      if (validation.isValid) {
        healthyCount++;
      } else {
        issuesCount++;
        
        // Пытаемся автоматически исправить
        const repaired = await repairAccountIntegrity(user.id);
        if (repaired) {
          repairedCount++;
        }
      }
    }
    
    console.log('[MONITOR] Daily health check completed:', {
      total: recentUsers.length,
      healthy: healthyCount,
      issues: issuesCount,
      autoRepaired: repairedCount,
      needsAttention: issuesCount - repairedCount
    });
    
    // Отправляем алерт если много проблем
    if (issuesCount > recentUsers.length * 0.1) { // Более 10% проблемных
      await this.sendHealthAlert({
        total: recentUsers.length,
        issues: issuesCount,
        autoRepaired: repairedCount
      });
    }
  }
  
  private async sendHealthAlert(stats: any): Promise<void> {
    // Здесь можно интегрировать с системой алертов
    console.warn('[ALERT] High number of account integrity issues detected:', stats);
  }
}

// Запускаем ежедневную проверку
setInterval(() => {
  AccountHealthMonitor.getInstance().dailyHealthCheck();
}, 24 * 60 * 60 * 1000); // Каждые 24 часа

═══════════════════════════════════════════════════════════════════════════════
7. ПЛАН ВНЕДРЕНИЯ
═══════════════════════════════════════════════════════════════════════════════

🚀 ПОЭТАПНОЕ ВНЕДРЕНИЕ:

ЭТАП 1 - СОЗДАНИЕ ИНФРАСТРУКТУРЫ:
□ Создать middleware validateAccountIntegrity
□ Создать функцию repairAccountIntegrity  
□ Добавить API endpoint /api/v2/account/integrity-check
□ Протестировать на тестовых аккаунтах

ЭТАП 2 - ИНТЕГРАЦИЯ В АУТЕНТИФИКАЦИЮ:
□ Модифицировать requireTelegramAuth middleware
□ Добавить автоматические проверки при входе
□ Создать frontend hook useAutoAccountValidation
□ Тестировать с существующими пользователями

ЭТАП 3 - ОБНОВЛЕНИЕ РЕГИСТРАЦИИ:
□ Модифицировать createUser в auth service
□ Добавить полную инициализацию новых пользователей
□ Протестировать процесс регистрации
□ Убедиться что User ID 25 остается эталоном

ЭТАП 4 - МОНИТОРИНГ:
□ Запустить AccountHealthMonitor
□ Настроить ежедневные проверки
□ Создать дашборд для отслеживания здоровья аккаунтов
□ Настроить алерты при высоком проценте проблем

⚠️ МЕРЫ БЕЗОПАСНОСТИ:
• Все автоматические исправления логируются
• User ID 25 исключен из всех автоматических изменений
• Возможность отключить автоматические исправления
• Ручная проверка критических изменений

🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
• Все новые пользователи имеют полную структуру данных
• Существующие пользователи автоматически исправляются при входе
• Мониторинг предотвращает накопление проблем
• Единообразное поведение системы для всех пользователей
`;

console.log(implementationPlan);

export default implementationPlan;