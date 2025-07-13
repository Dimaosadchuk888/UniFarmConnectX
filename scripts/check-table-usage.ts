import fs from 'fs';
import path from 'path';

// Таблицы которые предложено удалить
const tablesToCheck = [
  'referrals',
  'farming_sessions', 
  'user_sessions',
  'wallet',
  'farming_deposits',
  'boosts',
  'airdrop_claims',
  'airdrop_missions',
  'auth_logs',
  'mission_progress',
  'mission_templates',
  'referral_analytics',
  'referral_earnings',
  'system_metrics',
  'ton_boost_schedules',
  'user_mission_claims',
  'user_mission_completions',
  'wallet_logs',
  'webhook_logs',
  'daily_bonus_history'
];

// Папки для поиска
const searchDirs = ['modules', 'core', 'server', 'shared', 'utils', 'config'];

function searchInFile(filePath: string, table: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches: string[] = [];
  
  // Различные паттерны использования таблиц
  const patterns = [
    `from('${table}')`,
    `from("${table}")`,
    `from(\`${table}\`)`,
    `table: '${table}'`,
    `table: "${table}"`,
    `tableName: '${table}'`,
    `tableName: "${table}"`,
    `${table} table`,
    `CREATE TABLE ${table}`,
    `DROP TABLE ${table}`,
    `ALTER TABLE ${table}`,
    `INSERT INTO ${table}`,
    `UPDATE ${table}`,
    `DELETE FROM ${table}`,
    `SELECT .* FROM ${table}`
  ];
  
  patterns.forEach(pattern => {
    if (content.includes(pattern)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(pattern)) {
          matches.push(`  ${filePath}:${index + 1} - ${line.trim()}`);
        }
      });
    }
  });
  
  return matches;
}

function searchTableUsage(table: string): { found: boolean; usage: string[] } {
  const usage: string[] = [];
  
  searchDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath, { recursive: true });
    files.forEach(file => {
      if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.js'))) {
        const filePath = path.join(dirPath, file);
        const matches = searchInFile(filePath, table);
        usage.push(...matches);
      }
    });
  });
  
  return { found: usage.length > 0, usage };
}

console.log('🔍 Проверка использования таблиц в коде\n');

const safeToDelete: string[] = [];
const notSafeToDelete: string[] = [];

tablesToCheck.forEach((table, index) => {
  console.log(`${index + 1}/${tablesToCheck.length} Проверяю таблицу: ${table}`);
  const result = searchTableUsage(table);
  
  if (result.found) {
    console.log(`  ❌ ИСПОЛЬЗУЕТСЯ В КОДЕ!`);
    result.usage.slice(0, 3).forEach(u => console.log(u));
    if (result.usage.length > 3) {
      console.log(`  ... и еще ${result.usage.length - 3} мест`);
    }
    notSafeToDelete.push(table);
  } else {
    console.log(`  ✅ Не найдено использований`);
    safeToDelete.push(table);
  }
  console.log('');
});

console.log('\n📊 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:\n');

if (safeToDelete.length > 0) {
  console.log('✅ МОЖНО БЕЗОПАСНО УДАЛИТЬ:');
  safeToDelete.forEach(table => console.log(`  - ${table}`));
}

if (notSafeToDelete.length > 0) {
  console.log('\n❌ НЕ УДАЛЯТЬ (используются в коде):');
  notSafeToDelete.forEach(table => console.log(`  - ${table}`));
}

console.log('\n🛡️ БЕЗОПАСНЫЙ ПОДХОД:');
console.log('1. Сначала переименуйте таблицы вместо удаления:');
console.log('   ALTER TABLE table_name RENAME TO _archived_table_name;');
console.log('2. Подождите 1-2 недели');
console.log('3. Если проблем не возникло - удалите архивные таблицы');