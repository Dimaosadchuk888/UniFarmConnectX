import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function findDuplicateSource() {
  console.log('🔍 ПОИСК РЕАЛЬНОГО ИСТОЧНИКА СОЗДАНИЯ ДУБЛИКАТОВ');
  console.log('=' .repeat(80));

  try {
    // 1. Проверим все последние TON транзакции с детальной информацией
    console.log('\n1️⃣ АНАЛИЗ ВСЕХ TON ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentTx, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return;
    }

    console.log(`Найдено ${recentTx?.length || 0} TON транзакций за последние 2 часа:`);
    
    // Группируем по пользователям для анализа
    const userTransactions: { [key: string]: any[] } = {};
    recentTx?.forEach(tx => {
      const userId = tx.user_id.toString();
      if (!userTransactions[userId]) userTransactions[userId] = [];
      userTransactions[userId].push(tx);
    });

    // Анализируем каждого пользователя
    Object.entries(userTransactions).forEach(([userId, transactions]) => {
      if (transactions.length > 1) {
        console.log(`\n👤 Пользователь ${userId} (${transactions.length} транзакций):`);
        transactions.forEach((tx, i) => {
          console.log(`  ${i + 1}. ID: ${tx.id} | ${tx.amount || tx.amount_ton} TON | ${tx.created_at}`);
          console.log(`     Тип: ${tx.type} | Статус: ${tx.status} | Источник: ${tx.source || 'не указан'}`);
          console.log(`     Описание: ${tx.description}`);
          console.log(`     Метаданные: ${tx.metadata ? JSON.stringify(tx.metadata) : 'нет'}`);
          console.log(`     TX Hash: ${tx.tx_hash || 'NULL'} | BOC: ${tx.boc || 'NULL'}`);
          
          // Проверим поля дублирования
          console.log(`     Дубликат: ${tx.is_duplicate ? 'ДА' : 'НЕТ'} | Дубликат ID: ${tx.duplicate_of_id || 'нет'}`);
        });
      }
    });

    // 2. Проверим источники транзакций (поле source)
    console.log('\n2️⃣ АНАЛИЗ ИСТОЧНИКОВ ТРАНЗАКЦИЙ:');
    const sourceAnalysis: { [key: string]: number } = {};
    recentTx?.forEach(tx => {
      const source = tx.source || 'unknown';
      sourceAnalysis[source] = (sourceAnalysis[source] || 0) + 1;
    });

    console.log('Статистика источников:');
    Object.entries(sourceAnalysis).forEach(([source, count]) => {
      console.log(`  - ${source}: ${count} транзакций`);
    });

    // 3. Проверим время создания для поиска паттернов
    console.log('\n3️⃣ АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ:');
    const duplicatePairs: any[] = [];
    
    for (let i = 0; i < (recentTx?.length || 0) - 1; i++) {
      for (let j = i + 1; j < (recentTx?.length || 0); j++) {
        const tx1 = recentTx![i];
        const tx2 = recentTx![j];
        
        if (tx1.user_id === tx2.user_id && 
            (tx1.amount || tx1.amount_ton) === (tx2.amount || tx2.amount_ton)) {
          
          const timeDiff = Math.abs(new Date(tx1.created_at).getTime() - new Date(tx2.created_at).getTime()) / 1000;
          
          if (timeDiff < 300) { // Меньше 5 минут
            duplicatePairs.push({
              tx1: { id: tx1.id, time: tx1.created_at, source: tx1.source },
              tx2: { id: tx2.id, time: tx2.created_at, source: tx2.source },
              timeDiff,
              amount: tx1.amount || tx1.amount_ton,
              userId: tx1.user_id
            });
          }
        }
      }
    }

    if (duplicatePairs.length > 0) {
      console.log(`🚨 Найдено ${duplicatePairs.length} подозрительных дубликатов:`);
      duplicatePairs.forEach((pair, i) => {
        console.log(`  Дубликат ${i + 1}:`);
        console.log(`    Транзакции: ${pair.tx1.id} → ${pair.tx2.id}`);
        console.log(`    Пользователь: ${pair.userId} | Сумма: ${pair.amount} TON`);
        console.log(`    Разница во времени: ${pair.timeDiff} секунд`);
        console.log(`    Источники: ${pair.tx1.source || 'unknown'} → ${pair.tx2.source || 'unknown'}`);
      });
    }

    // 4. Проверим активность в логах создания транзакций
    console.log('\n4️⃣ ПОИСК СИСТЕМНЫХ ЛОГОВ СОЗДАНИЯ ТРАНЗАКЦИЙ:');
    
    // Проверим есть ли webhook endpoints или другие API
    console.log('Возможные источники дубликатов:');
    console.log('1. Webhook из блокчейн сканера (TonAPI, TON Center)');
    console.log('2. Cron job мониторинга блокчейна');
    console.log('3. Административные скрипты');
    console.log('4. Другие API endpoints (/api/wallet/ton-deposit без /v2)');
    console.log('5. Прямые вставки в БД через другие сервисы');

    // 5. Проверим метаданные транзакций для поиска источников
    console.log('\n5️⃣ АНАЛИЗ МЕТАДАННЫХ:');
    const metadataAnalysis: { [key: string]: number } = {};
    recentTx?.forEach(tx => {
      if (tx.metadata) {
        try {
          const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          Object.keys(meta).forEach(key => {
            metadataAnalysis[key] = (metadataAnalysis[key] || 0) + 1;
          });
        } catch (e) {
          console.log(`Не удалось разобрать метаданные транзакции ${tx.id}: ${tx.metadata}`);
        }
      }
    });

    if (Object.keys(metadataAnalysis).length > 0) {
      console.log('Найденные ключи в метаданных:');
      Object.entries(metadataAnalysis).forEach(([key, count]) => {
        console.log(`  - ${key}: ${count} раз`);
      });
    } else {
      console.log('Метаданные отсутствуют во всех транзакциях');
    }

    // 6. Проверим есть ли системные endpoints которые могут создавать транзакции
    console.log('\n6️⃣ КРИТИЧЕСКИЕ ВЫВОДЫ:');
    console.log('🔍 Для полного понимания источника дубликатов нужно:');
    console.log('1. Проверить server/ директорию на наличие webhook handlers');
    console.log('2. Найти cron jobs и scheduled tasks');
    console.log('3. Проверить все API endpoints на /api/wallet/*');
    console.log('4. Проверить direct database access из внешних сервисов');
    console.log('5. Проверить админ панель и ручные операции');

  } catch (error) {
    console.error('❌ Критическая ошибка поиска источника:', error);
  }
}

findDuplicateSource().catch(console.error);