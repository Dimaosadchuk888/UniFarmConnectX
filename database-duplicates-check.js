/**
 * Проверка дубликатов в базе данных UniFarm
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Определяем URL базы данных
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

let client;
try {
  const { Client } = require('pg');
  client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });
} catch (error) {
  console.error('Ошибка импорта pg:', error.message);
  process.exit(1);
}

const dbDuplicates = {
  users: [],
  missions: [],
  transactions: [],
  referrals: [],
  wallets: [],
  summary: {}
};

/**
 * Проверка дубликатов пользователей
 */
async function checkUserDuplicates() {
  console.log('🔍 Проверка дубликатов пользователей...');
  
  try {
    // Дубликаты по telegram_id
    const telegramDuplicates = await client.query(`
      SELECT telegram_id, COUNT(*) as count, array_agg(id) as user_ids
      FROM users 
      WHERE telegram_id IS NOT NULL
      GROUP BY telegram_id 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Дубликаты по username
    const usernameDuplicates = await client.query(`
      SELECT username, COUNT(*) as count, array_agg(id) as user_ids
      FROM users 
      WHERE username IS NOT NULL
      GROUP BY username 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Дубликаты по guest_id
    const guestIdDuplicates = await client.query(`
      SELECT guest_id, COUNT(*) as count, array_agg(id) as user_ids
      FROM users 
      WHERE guest_id IS NOT NULL
      GROUP BY guest_id 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    dbDuplicates.users = {
      telegramDuplicates: telegramDuplicates.rows,
      usernameDuplicates: usernameDuplicates.rows,
      guestIdDuplicates: guestIdDuplicates.rows
    };
    
    console.log(`✓ Найдено ${telegramDuplicates.rows.length} дубликатов по telegram_id`);
    console.log(`✓ Найдено ${usernameDuplicates.rows.length} дубликатов по username`);
    console.log(`✓ Найдено ${guestIdDuplicates.rows.length} дубликатов по guest_id`);
    
  } catch (error) {
    console.error('Ошибка проверки пользователей:', error.message);
  }
}

/**
 * Проверка дубликатов миссий
 */
async function checkMissionDuplicates() {
  console.log('🔍 Проверка дубликатов миссий...');
  
  try {
    // Дубликаты по названию
    const titleDuplicates = await client.query(`
      SELECT title, COUNT(*) as count, array_agg(id) as mission_ids
      FROM missions 
      WHERE title IS NOT NULL
      GROUP BY title 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Дубликаты по описанию
    const descriptionDuplicates = await client.query(`
      SELECT description, COUNT(*) as count, array_agg(id) as mission_ids
      FROM missions 
      WHERE description IS NOT NULL AND LENGTH(description) > 10
      GROUP BY description 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    dbDuplicates.missions = {
      titleDuplicates: titleDuplicates.rows,
      descriptionDuplicates: descriptionDuplicates.rows
    };
    
    console.log(`✓ Найдено ${titleDuplicates.rows.length} дубликатов по названию миссий`);
    console.log(`✓ Найдено ${descriptionDuplicates.rows.length} дубликатов по описанию миссий`);
    
  } catch (error) {
    console.error('Ошибка проверки миссий:', error.message);
  }
}

/**
 * Проверка дубликатов транзакций
 */
async function checkTransactionDuplicates() {
  console.log('🔍 Проверка дубликатов транзакций...');
  
  try {
    // Одинаковые транзакции
    const duplicateTransactions = await client.query(`
      SELECT user_id, amount, type, created_at::date, COUNT(*) as count, array_agg(id) as transaction_ids
      FROM transactions 
      GROUP BY user_id, amount, type, created_at::date
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 50
    `);
    
    // Подозрительные транзакции (одинаковые суммы в одно время)
    const suspiciousTransactions = await client.query(`
      SELECT user_id, amount, COUNT(*) as count, array_agg(id) as transaction_ids
      FROM transactions 
      WHERE created_at > NOW() - INTERVAL '1 day'
      GROUP BY user_id, amount
      HAVING COUNT(*) > 3
      ORDER BY count DESC
    `);
    
    dbDuplicates.transactions = {
      duplicateTransactions: duplicateTransactions.rows,
      suspiciousTransactions: suspiciousTransactions.rows
    };
    
    console.log(`✓ Найдено ${duplicateTransactions.rows.length} групп дублирующихся транзакций`);
    console.log(`✓ Найдено ${suspiciousTransactions.rows.length} подозрительных групп транзакций`);
    
  } catch (error) {
    console.error('Ошибка проверки транзакций:', error.message);
  }
}

/**
 * Проверка дубликатов в реферальной системе
 */
async function checkReferralDuplicates() {
  console.log('🔍 Проверка дубликатов реферальной системы...');
  
  try {
    // Дубликаты реферальных кодов
    const refCodeDuplicates = await client.query(`
      SELECT ref_code, COUNT(*) as count, array_agg(id) as user_ids
      FROM users 
      WHERE ref_code IS NOT NULL
      GROUP BY ref_code 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Циклические рефералы (пользователь ссылается сам на себя через цепочку)
    const cyclicReferrals = await client.query(`
      WITH RECURSIVE referral_chain AS (
        SELECT id, referrer_id, ARRAY[id] as path
        FROM users
        WHERE referrer_id IS NOT NULL
        
        UNION ALL
        
        SELECT u.id, u.referrer_id, rc.path || u.id
        FROM users u
        JOIN referral_chain rc ON u.referrer_id = rc.id
        WHERE NOT u.id = ANY(rc.path)
        AND array_length(rc.path, 1) < 10
      )
      SELECT * FROM referral_chain 
      WHERE id = ANY(path[2:])
      LIMIT 10
    `);
    
    dbDuplicates.referrals = {
      refCodeDuplicates: refCodeDuplicates.rows,
      cyclicReferrals: cyclicReferrals.rows
    };
    
    console.log(`✓ Найдено ${refCodeDuplicates.rows.length} дубликатов реферальных кодов`);
    console.log(`✓ Найдено ${cyclicReferrals.rows.length} циклических рефералов`);
    
  } catch (error) {
    console.error('Ошибка проверки рефералов:', error.message);
  }
}

/**
 * Проверка дубликатов кошельков
 */
async function checkWalletDuplicates() {
  console.log('🔍 Проверка дубликатов кошельков...');
  
  try {
    // Дубликаты по wallet_address
    const walletDuplicates = await client.query(`
      SELECT wallet_address, COUNT(*) as count, array_agg(user_id) as user_ids
      FROM users 
      WHERE wallet_address IS NOT NULL AND wallet_address != ''
      GROUP BY wallet_address 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    dbDuplicates.wallets = {
      walletDuplicates: walletDuplicates.rows
    };
    
    console.log(`✓ Найдено ${walletDuplicates.rows.length} дубликатов кошельков`);
    
  } catch (error) {
    console.error('Ошибка проверки кошельков:', error.message);
  }
}

/**
 * Генерация отчета по базе данных
 */
async function generateDBReport() {
  console.log('📊 Генерация отчета по базе данных...');
  
  dbDuplicates.summary = {
    timestamp: new Date().toISOString(),
    telegramDuplicates: dbDuplicates.users?.telegramDuplicates?.length || 0,
    usernameDuplicates: dbDuplicates.users?.usernameDuplicates?.length || 0,
    guestIdDuplicates: dbDuplicates.users?.guestIdDuplicates?.length || 0,
    missionTitleDuplicates: dbDuplicates.missions?.titleDuplicates?.length || 0,
    transactionDuplicates: dbDuplicates.transactions?.duplicateTransactions?.length || 0,
    refCodeDuplicates: dbDuplicates.referrals?.refCodeDuplicates?.length || 0,
    walletDuplicates: dbDuplicates.wallets?.walletDuplicates?.length || 0
  };
  
  // Сохранение отчета
  const reportContent = JSON.stringify(dbDuplicates, null, 2);
  const fs = await import('fs');
  fs.default.writeFileSync('database-duplicates-report.json', reportContent);
  
  console.log('\n📋 ОТЧЕТ О ДУБЛИКАТАХ В БАЗЕ ДАННЫХ:');
  console.log('═══════════════════════════════════════');
  console.log(`👥 Дубликаты по telegram_id: ${dbDuplicates.summary.telegramDuplicates}`);
  console.log(`📝 Дубликаты по username: ${dbDuplicates.summary.usernameDuplicates}`);
  console.log(`🔗 Дубликаты по guest_id: ${dbDuplicates.summary.guestIdDuplicates}`);
  console.log(`🎯 Дубликаты названий миссий: ${dbDuplicates.summary.missionTitleDuplicates}`);
  console.log(`💰 Дубликаты транзакций: ${dbDuplicates.summary.transactionDuplicates}`);
  console.log(`🔄 Дубликаты реферальных кодов: ${dbDuplicates.summary.refCodeDuplicates}`);
  console.log(`💳 Дубликаты кошельков: ${dbDuplicates.summary.walletDuplicates}`);
  
  // Показать первые несколько критичных дубликатов
  if (dbDuplicates.users?.telegramDuplicates?.length > 0) {
    console.log('\n🚨 КРИТИЧНЫЕ ДУБЛИКАТЫ TELEGRAM_ID:');
    dbDuplicates.users.telegramDuplicates.slice(0, 3).forEach(dup => {
      console.log(`  • telegram_id: ${dup.telegram_id} (${dup.count} пользователей: ${dup.user_ids.join(', ')})`);
    });
  }
  
  if (dbDuplicates.referrals?.refCodeDuplicates?.length > 0) {
    console.log('\n🔄 ДУБЛИКАТЫ РЕФЕРАЛЬНЫХ КОДОВ:');
    dbDuplicates.referrals.refCodeDuplicates.slice(0, 3).forEach(dup => {
      console.log(`  • ref_code: ${dup.ref_code} (${dup.count} пользователей: ${dup.user_ids.join(', ')})`);
    });
  }
  
  console.log('\n✅ Отчет по БД сохранен в database-duplicates-report.json');
}

/**
 * Запуск проверки базы данных
 */
async function runDatabaseCheck() {
  try {
    console.log('🔍 Запуск проверки дубликатов в базе данных...\n');
    
    await client.connect();
    console.log('✅ Подключение к базе данных установлено');
    
    await checkUserDuplicates();
    await checkMissionDuplicates();
    await checkTransactionDuplicates();
    await checkReferralDuplicates();
    await checkWalletDuplicates();
    await generateDBReport();
    
    console.log('\n🎉 Проверка базы данных завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке БД:', error.message);
  } finally {
    await client.end();
  }
}

// Запуск проверки
runDatabaseCheck().catch(console.error);