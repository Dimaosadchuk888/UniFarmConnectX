import { supabase } from '../core/supabase.js';

interface FieldAnalysis {
  fieldName: string;
  totalRecords: number;
  nonNullCount: number;
  nonZeroCount: number;
  uniqueValues: number;
  sampleValues: any[];
  isEmpty: boolean;
  recommendation: string;
}

interface DuplicateAnalysis {
  field1: string;
  field2: string;
  identicalCount: number;
  differentCount: number;
  canMerge: boolean;
  recommendation: string;
}

async function analyzeFieldDataPresence() {
  console.log('🔍 ПОЛНЫЙ АНАЛИЗ НАЛИЧИЯ ДАННЫХ В ПОЛЯХ БАЗЫ ДАННЫХ\n');
  console.log('================================================================================\n');

  try {
    // Получаем всех пользователей
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('id');

    if (error) throw error;
    
    const totalUsers = users?.length || 0;
    console.log(`✅ Найдено пользователей: ${totalUsers}\n`);

    // Анализируемые поля
    const fieldsToAnalyze = [
      // Балансы
      'balance_uni', 'uni_farming_balance',
      'balance_ton', 'ton_farming_balance',
      
      // Депозиты
      'uni_deposit_amount', 'uni_farming_deposit',
      
      // TON boost
      'ton_boost_package', 'ton_boost_package_id',
      
      // Ставки
      'uni_farming_rate', 'ton_farming_rate', 'ton_boost_rate',
      
      // Timestamps
      'uni_farming_start_timestamp', 'ton_farming_start_timestamp',
      
      // Адреса
      'wallet', 'ton_wallet_address',
      
      // Активность
      'uni_farming_active', 'ton_farming_active',
      
      // Другие поля
      'ref_code', 'inviter_ref_code',
      'level', 'xp', 'referrals_count',
      'referral_bonus_amount', 'referral_bonus_claimed'
    ];

    const fieldAnalysis: { [key: string]: FieldAnalysis } = {};

    // Анализируем каждое поле
    for (const field of fieldsToAnalyze) {
      if (field in (users?.[0] || {})) {
        const values = users!.map(u => u[field]);
        const nonNullValues = values.filter(v => v !== null && v !== undefined);
        const nonZeroValues = values.filter(v => v !== null && v !== undefined && v !== 0 && v !== '0' && v !== false);
        const uniqueValues = new Set(nonNullValues);
        
        fieldAnalysis[field] = {
          fieldName: field,
          totalRecords: totalUsers,
          nonNullCount: nonNullValues.length,
          nonZeroCount: nonZeroValues.length,
          uniqueValues: uniqueValues.size,
          sampleValues: Array.from(uniqueValues).slice(0, 5),
          isEmpty: nonZeroValues.length === 0,
          recommendation: ''
        };

        // Генерируем рекомендации
        if (fieldAnalysis[field].isEmpty) {
          fieldAnalysis[field].recommendation = '🗑️ УДАЛИТЬ - поле не содержит данных';
        } else if (fieldAnalysis[field].nonZeroCount < 5) {
          fieldAnalysis[field].recommendation = '⚠️ ПРОВЕРИТЬ - очень мало данных';
        } else {
          fieldAnalysis[field].recommendation = '✅ СОХРАНИТЬ - поле активно используется';
        }
      }
    }

    // Выводим результаты анализа полей
    console.log('📊 АНАЛИЗ НАЛИЧИЯ ДАННЫХ В ПОЛЯХ:\n');
    console.log('================================================================================\n');

    // Группируем поля по категориям
    console.log('🏦 БАЛАНСЫ:\n');
    ['balance_uni', 'uni_farming_balance', 'balance_ton', 'ton_farming_balance'].forEach(field => {
      if (fieldAnalysis[field]) {
        printFieldAnalysis(fieldAnalysis[field]);
      }
    });

    console.log('\n💰 ДЕПОЗИТЫ:\n');
    ['uni_deposit_amount', 'uni_farming_deposit'].forEach(field => {
      if (fieldAnalysis[field]) {
        printFieldAnalysis(fieldAnalysis[field]);
      }
    });

    console.log('\n🚀 TON BOOST:\n');
    ['ton_boost_package', 'ton_boost_package_id'].forEach(field => {
      if (fieldAnalysis[field]) {
        printFieldAnalysis(fieldAnalysis[field]);
      }
    });

    console.log('\n📈 СТАВКИ ФАРМИНГА:\n');
    ['uni_farming_rate', 'ton_farming_rate', 'ton_boost_rate'].forEach(field => {
      if (fieldAnalysis[field]) {
        printFieldAnalysis(fieldAnalysis[field]);
      }
    });

    console.log('\n🏠 АДРЕСА КОШЕЛЬКОВ:\n');
    ['wallet', 'ton_wallet_address'].forEach(field => {
      if (fieldAnalysis[field]) {
        printFieldAnalysis(fieldAnalysis[field]);
      }
    });

    // Анализ дубликатов
    console.log('\n\n🔄 АНАЛИЗ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ:\n');
    console.log('================================================================================\n');

    const duplicatePairs = [
      ['balance_uni', 'uni_farming_balance'],
      ['balance_ton', 'ton_farming_balance'],
      ['uni_deposit_amount', 'uni_farming_deposit'],
      ['ton_boost_package', 'ton_boost_package_id'],
      ['ton_farming_rate', 'ton_boost_rate'],
      ['wallet', 'ton_wallet_address']
    ];

    const duplicateAnalysis: DuplicateAnalysis[] = [];

    for (const [field1, field2] of duplicatePairs) {
      if (field1 in (users?.[0] || {}) && field2 in (users?.[0] || {})) {
        let identicalCount = 0;
        let differentCount = 0;

        users!.forEach(user => {
          const val1 = user[field1];
          const val2 = user[field2];
          
          // Приводим к числам для сравнения числовых полей
          const normalizedVal1 = typeof val1 === 'number' || !isNaN(Number(val1)) ? Number(val1) : val1;
          const normalizedVal2 = typeof val2 === 'number' || !isNaN(Number(val2)) ? Number(val2) : val2;

          if (normalizedVal1 === normalizedVal2) {
            identicalCount++;
          } else {
            differentCount++;
          }
        });

        const analysis: DuplicateAnalysis = {
          field1,
          field2,
          identicalCount,
          differentCount,
          canMerge: differentCount === 0,
          recommendation: ''
        };

        // Генерируем рекомендации по объединению
        if (fieldAnalysis[field1]?.isEmpty && !fieldAnalysis[field2]?.isEmpty) {
          analysis.recommendation = `🗑️ Удалить ${field1} (пустое) → использовать ${field2}`;
        } else if (!fieldAnalysis[field1]?.isEmpty && fieldAnalysis[field2]?.isEmpty) {
          analysis.recommendation = `🗑️ Удалить ${field2} (пустое) → использовать ${field1}`;
        } else if (analysis.canMerge) {
          analysis.recommendation = `✅ Можно объединить - данные идентичны`;
        } else {
          analysis.recommendation = `⚠️ Требуется синхронизация - есть расхождения`;
        }

        duplicateAnalysis.push(analysis);
      }
    }

    // Выводим анализ дубликатов
    duplicateAnalysis.forEach(analysis => {
      console.log(`📌 ${analysis.field1} vs ${analysis.field2}`);
      console.log(`   Идентичных значений: ${analysis.identicalCount}/${totalUsers}`);
      console.log(`   Расхождений: ${analysis.differentCount}`);
      console.log(`   Рекомендация: ${analysis.recommendation}\n`);
    });

    // Итоговые рекомендации
    console.log('\n\n📋 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:\n');
    console.log('================================================================================\n');

    console.log('🗑️ ПОЛЯ ДЛЯ УДАЛЕНИЯ (пустые, не используются):\n');
    Object.values(fieldAnalysis)
      .filter(f => f.isEmpty)
      .forEach(f => console.log(`   - ${f.fieldName}`));

    console.log('\n\n✅ ПОЛЯ ДЛЯ СИНХРОНИЗАЦИИ (содержат одинаковые данные):\n');
    duplicateAnalysis
      .filter(d => d.canMerge && !fieldAnalysis[d.field1]?.isEmpty && !fieldAnalysis[d.field2]?.isEmpty)
      .forEach(d => console.log(`   - ${d.field1} ← → ${d.field2}`));

    console.log('\n\n⚠️ ПОЛЯ ТРЕБУЮЩИЕ ВНИМАНИЯ (есть расхождения):\n');
    duplicateAnalysis
      .filter(d => !d.canMerge && d.differentCount > 0)
      .forEach(d => console.log(`   - ${d.field1} vs ${d.field2} (${d.differentCount} расхождений)`));

    // Проверяем старые таблицы
    console.log('\n\n📦 АНАЛИЗ СТАРЫХ ТАБЛИЦ:\n');
    console.log('================================================================================\n');

    const oldTables = ['uni_farming_data', 'ton_farming_data', 'userBalances'];
    
    for (const table of oldTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`${table}: ${count || 0} записей ${count === 0 ? '🗑️ (можно удалить)' : '⚠️ (содержит данные)'}`);
      } else {
        console.log(`${table}: недоступна или не существует ✅`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

function printFieldAnalysis(analysis: FieldAnalysis) {
  console.log(`${analysis.fieldName}:`);
  console.log(`   Непустых значений: ${analysis.nonNullCount}/${analysis.totalRecords}`);
  console.log(`   Ненулевых значений: ${analysis.nonZeroCount}/${analysis.totalRecords}`);
  console.log(`   Уникальных значений: ${analysis.uniqueValues}`);
  if (analysis.sampleValues.length > 0) {
    console.log(`   Примеры: ${analysis.sampleValues.slice(0, 3).join(', ')}`);
  }
  console.log(`   ${analysis.recommendation}\n`);
}

// Запускаем анализ
analyzeFieldDataPresence().then(() => {
  console.log('\n✅ Анализ завершен');
  process.exit(0);
}).catch(err => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});