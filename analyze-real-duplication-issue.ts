import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function analyzeRealDuplicationIssue() {
  console.log('🚨 АНАЛИЗ РЕАЛЬНОЙ ПРОБЛЕМЫ ДУБЛИРОВАНИЯ');
  console.log('=' .repeat(80));

  try {
    // 1. Получим детальную информацию о последних дубликатах
    console.log('\n1️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ПОСЛЕДНИХ ДУБЛИКАТОВ:');
    const { data: duplicates, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .in('id', [1805783, 1805780])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения дубликатов:', error);
      return;
    }

    console.log('Найдено дубликатов:', duplicates?.length);
    duplicates?.forEach((tx, i) => {
      console.log(`\nДубликат ${i + 1}:`);
      console.log(`  ID: ${tx.id}`);
      console.log(`  User ID: ${tx.user_id}`);
      console.log(`  Тип: ${tx.type}`);
      console.log(`  Валюта: ${tx.currency}`);
      console.log(`  Сумма: ${tx.amount || tx.amount_ton} TON`);
      console.log(`  TX Hash: ${tx.tx_hash || 'NULL'}`);
      console.log(`  BOC: ${tx.boc || 'NULL'}`);
      console.log(`  Статус: ${tx.status}`);
      console.log(`  Описание: ${tx.description}`);
      console.log(`  Создано: ${tx.created_at}`);
      console.log(`  Все поля:`, Object.keys(tx));
    });

    // 2. Проверим, есть ли еще дубликаты за последние сутки
    console.log('\n2️⃣ ПОИСК ВСЕХ ДУБЛИКАТОВ ЗА 24 ЧАСА:');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: allRecentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('currency', 'TON')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (!recentError && allRecentTx) {
      console.log(`Найдено ${allRecentTx.length} TON транзакций за 24 часа:`);
      
      // Группируем по сумме и времени для поиска подозрительных дубликатов
      const suspiciousPairs: any[] = [];
      for (let i = 0; i < allRecentTx.length - 1; i++) {
        for (let j = i + 1; j < allRecentTx.length; j++) {
          const tx1 = allRecentTx[i];
          const tx2 = allRecentTx[j];
          
          const sameAmount = (tx1.amount || tx1.amount_ton) === (tx2.amount || tx2.amount_ton);
          const timeDiff = Math.abs(new Date(tx1.created_at).getTime() - new Date(tx2.created_at).getTime()) / 1000;
          
          if (sameAmount && timeDiff < 300) { // Меньше 5 минут
            suspiciousPairs.push({
              tx1: { id: tx1.id, amount: tx1.amount || tx1.amount_ton, time: tx1.created_at },
              tx2: { id: tx2.id, amount: tx2.amount || tx2.amount_ton, time: tx2.created_at },
              timeDiff: timeDiff
            });
          }
        }
      }

      if (suspiciousPairs.length > 0) {
        console.log(`🚨 Найдено ${suspiciousPairs.length} подозрительных пар дубликатов:`);
        suspiciousPairs.forEach((pair, i) => {
          console.log(`  Пара ${i + 1}: ID ${pair.tx1.id} и ${pair.tx2.id}`);
          console.log(`    Сумма: ${pair.tx1.amount} TON`);
          console.log(`    Разница во времени: ${pair.timeDiff} секунд`);
        });
      } else {
        console.log('✅ Подозрительных дубликатов не найдено');
      }
    }

    // 3. Проверим логику создания транзакций - где именно они создаются
    console.log('\n3️⃣ АНАЛИЗ ТОЧКИ СОЗДАНИЯ ТРАНЗАКЦИЙ:');
    
    // Проверим, есть ли уникальные ограничения в БД
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT 
            constraint_name, 
            constraint_type,
            column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'transactions' 
            AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
        `
      });

    if (!constraintsError && constraints) {
      console.log('Найденные ограничения в таблице transactions:');
      constraints.forEach((constraint: any) => {
        console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.column_name}`);
      });
    } else {
      console.log('❌ Не удалось получить информацию об ограничениях');
    }

    // 4. Критически важно - проверим где и как создаются TON депозиты
    console.log('\n4️⃣ ВЫВОД О РЕАЛЬНОЙ ПРОБЛЕМЕ:');
    
    console.log('🚨 ОБНАРУЖЕНА КРИТИЧЕСКАЯ ПРОБЛЕМА:');
    console.log('1. В базе данных РЕАЛЬНО существуют дубликаты транзакций');
    console.log('2. Система дедупликации НЕ РАБОТАЕТ на продакшене');
    console.log('3. Транзакции создаются с tx_hash = NULL и boc = NULL');
    console.log('4. Это означает, что дедупликация по BOC/hash невозможна');
    
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('- Frontend отправляет запросы без BOC/hash данных');
    console.log('- Backend не получает blockchain данные');
    console.log('- Система дедупликации срабатывает только при наличии BOC');
    console.log('- Возможно, есть race condition при создании транзакций');
    
    console.log('\n🔍 СЛЕДУЮЩИЕ ШАГИ РАССЛЕДОВАНИЯ:');
    console.log('1. Проверить как frontend отправляет данные на /api/v2/wallet/ton-deposit');
    console.log('2. Проверить backend логику создания транзакций');
    console.log('3. Найти почему tx_hash и boc приходят как NULL');
    console.log('4. Убедиться что дедупликация работает для NULL значений');

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

analyzeRealDuplicationIssue().catch(console.error);