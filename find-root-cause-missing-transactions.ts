import { supabase } from './core/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function findRootCauseMissingTransactions() {
  console.log('🔍 ПОИСК КОРНЕВОЙ ПРИЧИНЫ ОТСУТСТВУЮЩИХ ТРАНЗАКЦИЙ');
  console.log('='.repeat(80));

  try {
    // 1. ПОИСК ВСЕХ СПОСОБОВ ОБНОВЛЕНИЯ balance_ton
    console.log('\n1️⃣ ПОИСК ВСЕХ ПУТЕЙ ОБНОВЛЕНИЯ balance_ton:');
    
    const searchDirs = ['./modules', './core', './server', './scripts'];
    const balanceUpdatePaths: string[] = [];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true });
        
        files.forEach(file => {
          if (typeof file === 'string' && file.endsWith('.ts')) {
            const filePath = path.join(dir, file);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Ищем обновления balance_ton
              const lines = content.split('\n');
              lines.forEach((line, idx) => {
                if (line.includes('balance_ton') && 
                    (line.includes('+=') || line.includes('UPDATE') || 
                     line.includes('update') || line.includes('SET') ||
                     line.includes('increment') || line.includes('add'))) {
                  balanceUpdatePaths.push(`${file}:${idx + 1} - ${line.trim()}`);
                }
              });
            }
          }
        });
      }
    });
    
    console.log(`📊 Найдено путей обновления balance_ton: ${balanceUpdatePaths.length}`);
    balanceUpdatePaths.slice(0, 15).forEach(path => {
      console.log(`   🔍 ${path}`);
    });

    // 2. ПОИСК SCHEDULER ОПЕРАЦИЙ
    console.log('\n2️⃣ ПОИСК SCHEDULER/CRON ЗАДАЧ:');
    
    const schedulerFiles = [
      './core/scheduler.ts',
      './modules/farming/scheduler.ts', 
      './server/scheduler.ts',
      './core/cronJobs.ts',
      './modules/blockchain/scheduler.ts'
    ];
    
    schedulerFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`   ✅ ${filePath}: НАЙДЕН`);
        
        // Ищем TON-связанные операции
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('TON') || line.includes('balance_ton') || line.includes('blockchain')) {
            console.log(`     Line ${idx + 1}: ${line.trim()}`);
          }
        });
      } else {
        console.log(`   ❌ ${filePath}: НЕ НАЙДЕН`);
      }
    });

    // 3. ПОИСК WEBHOOK ОБРАБОТЧИКОВ
    console.log('\n3️⃣ ПОИСК WEBHOOK ОБРАБОТЧИКОВ:');
    
    const webhookPaths = [
      './server/webhooks',
      './modules/blockchain/webhooks',
      './core/webhooks.ts',
      './server/index.ts'
    ];
    
    webhookPaths.forEach(webhookPath => {
      if (fs.existsSync(webhookPath)) {
        console.log(`   ✅ ${webhookPath}: НАЙДЕН`);
        
        if (fs.statSync(webhookPath).isFile()) {
          const content = fs.readFileSync(webhookPath, 'utf8');
          
          // Ищем webhook маршруты
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('/webhook') || line.includes('webhook') || 
                line.includes('TON') || line.includes('blockchain')) {
              console.log(`     Line ${idx + 1}: ${line.trim()}`);
            }
          });
        } else {
          // Это директория
          const files = fs.readdirSync(webhookPath);
          console.log(`     Файлы: ${files.join(', ')}`);
        }
      } else {
        console.log(`   ❌ ${webhookPath}: НЕ НАЙДЕН`);
      }
    });

    // 4. АНАЛИЗ BATCH PROCESSOR
    console.log('\n4️⃣ АНАЛИЗ BatchBalanceProcessor:');
    
    const batchProcessorPath = './core/BatchBalanceProcessor.ts';
    if (fs.existsSync(batchProcessorPath)) {
      const content = fs.readFileSync(batchProcessorPath, 'utf8');
      
      console.log('   ✅ BatchBalanceProcessor НАЙДЕН');
      
      // Ищем TON операции
      const lines = content.split('\n');
      let tonOperations = 0;
      
      lines.forEach((line, idx) => {
        if (line.includes('ton_increment') || line.includes('balance_ton')) {
          tonOperations++;
          console.log(`     Line ${idx + 1}: ${line.trim()}`);
        }
      });
      
      console.log(`   📊 TON операций в BatchProcessor: ${tonOperations}`);
    } else {
      console.log('   ❌ BatchBalanceProcessor НЕ НАЙДЕН');
    }

    // 5. ПОИСК АЛЬТЕРНАТИВНЫХ API ЭНДПОИНТОВ
    console.log('\n5️⃣ ПОИСК АЛЬТЕРНАТИВНЫХ API ДЛЯ ДЕПОЗИТОВ:');
    
    // Проверяем server/index.ts на прямые API
    const serverIndexPath = './server/index.ts';
    if (fs.existsSync(serverIndexPath)) {
      const content = fs.readFileSync(serverIndexPath, 'utf8');
      
      console.log('   📁 Анализ server/index.ts:');
      
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if ((line.includes('app.post') || line.includes('router.post')) && 
            (line.includes('deposit') || line.includes('ton') || line.includes('TON'))) {
          console.log(`     Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }

    // 6. ПРОВЕРКА ЛОГОВ НА РЕАЛЬНЫЕ ОБНОВЛЕНИЯ БАЛАНСА
    console.log('\n6️⃣ ПОИСК РЕАЛЬНЫХ ОБНОВЛЕНИЙ БАЛАНСА В ЛОГАХ:');
    
    // Ищем недавние обновления пользователей с TON балансом
    const { data: recentUpdates, error: updatesError } = await supabase
      .from('users')
      .select('id, balance_ton, updated_at')
      .gt('balance_ton', 0)
      .gte('id', 191)
      .lte('id', 303)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!updatesError && recentUpdates) {
      console.log(`📊 Последние обновления balance_ton: ${recentUpdates.length}`);
      
      recentUpdates.forEach(user => {
        console.log(`   User ${user.id}: ${user.balance_ton} TON [${user.updated_at.split('T')[0]}]`);
      });
      
      // Для каждого пользователя ищем когда последний раз обновлялся баланс
      if (recentUpdates.length > 0) {
        const latestUpdate = recentUpdates[0];
        const updateDate = new Date(latestUpdate.updated_at);
        const daysSinceUpdate = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`\n   📅 Последнее обновление: ${daysSinceUpdate} дней назад`);
        
        if (daysSinceUpdate < 7) {
          console.log('   ✅ Балансы обновляются АКТИВНО');
        } else {
          console.log('   ⚠️ Балансы НЕ обновлялись долго');
        }
      }
    }

    // 7. ФИНАЛЬНЫЙ АНАЛИЗ - ОТКУДА БЕРУТСЯ БАЛАНСЫ
    console.log('\n7️⃣ ФИНАЛЬНЫЙ АНАЛИЗ ИСТОЧНИКОВ БАЛАНСОВ:');
    
    // Проверяем есть ли прямые SQL операции в коде
    const directSqlPaths: string[] = [];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true });
        
        files.forEach(file => {
          if (typeof file === 'string' && file.endsWith('.ts')) {
            const filePath = path.join(dir, file);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              
              if (content.includes('supabase') && content.includes('update') && 
                  content.includes('balance_ton')) {
                directSqlPaths.push(file);
              }
            }
          }
        });
      }
    });
    
    console.log(`📊 Файлы с прямыми SQL обновлениями balance_ton: ${directSqlPaths.length}`);
    directSqlPaths.slice(0, 10).forEach(file => {
      console.log(`   🔍 ${file}`);
    });

    // 8. ВЫВОДЫ И ГИПОТЕЗЫ
    console.log('\n8️⃣ ВЫВОДЫ И СЛЕДУЮЩИЕ ШАГИ:');
    
    console.log('\n🎯 ВОЗМОЖНЫЕ ИСТОЧНИКИ TON БАЛАНСОВ:');
    console.log('   1. BatchBalanceProcessor - пакетная обработка');
    console.log('   2. Scheduler - периодическое сканирование блокчейна');
    console.log('   3. Webhook - уведомления из блокчейна');
    console.log('   4. Прямые SQL операции в коде');
    console.log('   5. Старый API в server/index.ts');
    
    console.log('\n🔍 ЧТО НУЖНО ПРОВЕРИТЬ ДАЛЬШЕ:');
    console.log('   1. Работу BatchBalanceProcessor');
    console.log('   2. Активность scheduler задач');
    console.log('   3. Существование webhook эндпоинтов');
    console.log('   4. Старые API в server/index.ts');
    console.log('   5. Логи реальных обновлений баланса');

  } catch (error) {
    console.error('❌ ОШИБКА РАССЛЕДОВАНИЯ:', error);
  }
}

findRootCauseMissingTransactions().catch(console.error);