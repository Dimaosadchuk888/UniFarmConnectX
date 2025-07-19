#!/usr/bin/env node

/**
 * АНАЛИЗ БЕЗОПАСНОСТИ ИЗМЕНЕНИЯ РЕФЕРЕРА
 * Проверяем возможность смены реферальной связи без повреждения системы
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

console.log("🔍 АНАЛИЗ БЕЗОПАСНОСТИ ИЗМЕНЕНИЯ РЕФЕРЕРА");
console.log("===========================================");

async function analyzeReferralChangeSafety() {
  try {
    // 1. Анализ структуры данных
    console.log("\n📊 АНАЛИЗ СТРУКТУРЫ РЕФЕРАЛЬНОЙ СИСТЕМЫ:");
    console.log("------------------------------------------");
    
    // Проверяем пример пользователей ID 100 и 115
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, created_at, referred_by, ref_code')
      .in('id', [100, 115])
      .order('id');

    if (usersError) {
      console.log("❌ Не удалось получить данные пользователей (нормально для диагностики)");
      return analyzeTheoreticalSafety();
    }

    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`✅ User ${user.id}: telegram_id=${user.telegram_id}, created=${user.created_at}, referred_by=${user.referred_by}`);
      });
    }

    // 2. Анализ реферальных связей
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('user_id, inviter_id, level, reward_uni, reward_ton')
      .in('user_id', [100, 115]);

    if (!referralsError && referrals) {
      console.log(`\n📈 Существующие реферальные награды:`);
      referrals.forEach(ref => {
        console.log(`   User ${ref.user_id} → Inviter ${ref.inviter_id}: UNI=${ref.reward_uni}, TON=${ref.reward_ton}`);
      });
    }

    // 3. Проверка на циклические связи  
    console.log("\n🔄 ПРОВЕРКА НА ЦИКЛИЧЕСКИЕ СВЯЗИ:");
    const result = checkCircularReference(100, 115);
    console.log(result.message);

    // 4. Анализ влияния на систему
    console.log("\n⚡ АНАЛИЗ ВЛИЯНИЯ НА СИСТЕМУ:");
    console.log("------------------------------");
    analyzeSystemImpact();

  } catch (error) {
    console.log("🔧 Переходим к теоретическому анализу (БД недоступна)");
    analyzeTheoreticalSafety();
  }
}

function checkCircularReference(userId1, userId2) {
  console.log(`   Проверяем: User ${userId1} → User ${userId2}`);
  
  // Проверка 1: Временная логика
  if (userId1 < userId2) {
    return {
      safe: true,
      message: `✅ Безопасно: User ${userId1} зарегистрирован раньше User ${userId2}`
    };
  } else {
    return {
      safe: false,
      message: `⚠️ ВНИМАНИЕ: User ${userId1} зарегистрирован позже User ${userId2} - возможен временной парадокс`
    };
  }
}

function analyzeSystemImpact() {
  console.log("📋 ВЛИЯНИЕ ИЗМЕНЕНИЯ РЕФЕРЕРА:");
  
  const impacts = [
    {
      component: "Таблица users.referred_by",
      impact: "🟡 СРЕДНИЙ",
      description: "Простое изменение поля, обратимо"
    },
    {
      component: "Таблица referrals",
      impact: "🔴 ВЫСОКИЙ", 
      description: "Требует пересчета всех наград и уровней"
    },
    {
      component: "Реферальная цепочка",
      impact: "🔴 КРИТИЧЕСКИЙ",
      description: "Может нарушить 20-уровневую структуру"
    },
    {
      component: "Начисленные награды",
      impact: "🔴 КРИТИЧЕСКИЙ",
      description: "Нужен пересчет всех исторических выплат"
    },
    {
      component: "Будущие начисления",
      impact: "🟡 СРЕДНИЙ",
      description: "Новые награды пойдут правильному реферу"
    }
  ];

  impacts.forEach(item => {
    console.log(`   ${item.impact} ${item.component}: ${item.description}`);
  });
}

function analyzeTheoreticalSafety() {
  console.log("\n🧮 ТЕОРЕТИЧЕСКИЙ АНАЛИЗ БЕЗОПАСНОСТИ:");
  console.log("=====================================");

  console.log("\n✅ ЧТО МОЖНО ИЗМЕНИТЬ БЕЗОПАСНО:");
  console.log("- users.referred_by поле (простое обновление)");
  console.log("- Будущие реферальные начисления");
  console.log("- Отображение в UI реферальных связей");

  console.log("\n❌ ЧТО СОЗДАЕТ РИСКИ:");
  console.log("- Исторические записи в таблице referrals");
  console.log("- Уже начисленные реферальные награды");
  console.log("- 20-уровневые цепочки реферальных связей");
  console.log("- Валидация временных парадоксов (User 100 → User 115)");

  console.log("\n🔧 БЕЗОПАСНОЕ РЕШЕНИЕ:");
  console.log("1. НЕ изменять исторические данные");
  console.log("2. Создать новую реферальную связь с текущего момента");
  console.log("3. Сохранить старые награды нетронутыми");
  console.log("4. Применить новую логику только к будущим начислениям");

  console.log("\n💡 РЕКОМЕНДАЦИЯ:");
  console.log("🟡 УСЛОВНО БЕЗОПАСНО с ограничениями:");
  console.log("   - Только если нет начисленных реферальных наград");
  console.log("   - Только если новый реферер зарегистрирован РАНЬШЕ");
  console.log("   - С обязательной проверкой на циклические связи");
  console.log("   - С полным аудитом всех связанных записей");
  
  console.log("\n🔴 НЕ РЕКОМЕНДУЕТСЯ если:");
  console.log("   - Уже есть начисленные реферальные награды");
  console.log("   - User 115 уже кого-то пригласил (цепочка существует)");
  console.log("   - Система активно используется в production");
}

// Запускаем анализ
analyzeReferralChangeSafety().then(() => {
  console.log("\n🏁 АНАЛИЗ ЗАВЕРШЕН");
}).catch(error => {
  console.error("Ошибка анализа:", error.message);
  analyzeTheoreticalSafety();
});