import { supabase } from '../core/supabase.js';

async function analyzeDuplicateFields() {
  console.log('🔍 АНАЛИЗ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ В ТАБЛИЦЕ USERS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Получаем пример данных для анализа
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(10);

    if (!users || users.length === 0) {
      console.log('Нет данных для анализа');
      return;
    }

    // Анализируем дублирующиеся поля
    const duplicates = [
      {
        group: 'UNI Deposit',
        fields: ['uni_deposit_amount', 'uni_farming_deposit'],
        description: 'Сумма UNI депозита'
      },
      {
        group: 'UNI Balance',
        fields: ['balance_uni', 'uni_farming_balance'],
        description: 'UNI баланс/накопления от фарминга'
      },
      {
        group: 'TON Boost Package',
        fields: ['ton_boost_package', 'ton_boost_package_id'],
        description: 'ID пакета TON Boost'
      },
      {
        group: 'Wallet Address',
        fields: ['wallet', 'ton_wallet_address'],
        description: 'TON адрес кошелька'
      }
    ];

    console.log('📊 НАЙДЕННЫЕ ДУБЛИРУЮЩИЕСЯ ПОЛЯ:\n');

    for (const dup of duplicates) {
      console.log(`${dup.group}: ${dup.description}`);
      console.log(`Поля: ${dup.fields.join(' vs ')}`);
      
      // Проверяем есть ли различия в данных
      let hasDifferences = false;
      let diffCount = 0;
      
      for (const user of users) {
        const values = dup.fields.map(f => user[f]);
        
        // Проверяем если значения отличаются (игнорируя null)
        const nonNullValues = values.filter(v => v !== null && v !== undefined);
        if (nonNullValues.length > 1) {
          const firstValue = String(nonNullValues[0]);
          const allSame = nonNullValues.every(v => String(v) === firstValue);
          
          if (!allSame) {
            hasDifferences = true;
            diffCount++;
          }
        }
      }
      
      if (hasDifferences) {
        console.log(`⚠️  Найдены различия в ${diffCount} записях из ${users.length}`);
      } else {
        console.log(`✅ Значения идентичны во всех записях`);
      }
      console.log('');
    }

    // Анализ использования в коде
    console.log('\n📝 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ:\n');

    console.log('1. БЕЗОПАСНЫЕ ДЛЯ УДАЛЕНИЯ (дубликаты с идентичными данными):');
    console.log('   - wallet (использовать ton_wallet_address)');
    console.log('   - Но сначала нужно обновить код, использующий эти поля');

    console.log('\n2. ТРЕБУЮТ СИНХРОНИЗАЦИИ ДАННЫХ:');
    console.log('   - uni_deposit_amount vs uni_farming_deposit');
    console.log('   - ton_boost_package vs ton_boost_package_id (разные типы!)');

    console.log('\n3. РАЗНОЕ НАЗНАЧЕНИЕ (не удалять):');
    console.log('   - balance_uni (общий баланс) vs uni_farming_balance (накопления от фарминга)');

    // Проверяем количество NULL значений
    console.log('\n\n📊 СТАТИСТИКА NULL ЗНАЧЕНИЙ:\n');

    const allFields = [...new Set(duplicates.flatMap(d => d.fields))];
    
    for (const field of allFields) {
      const { count: totalCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: nonNullCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not(field, 'is', null);

      const nullCount = (totalCount || 0) - (nonNullCount || 0);
      const nullPercent = totalCount ? (nullCount / totalCount * 100).toFixed(1) : 0;
      
      console.log(`${field}: ${nonNullCount}/${totalCount} заполнено (${nullPercent}% NULL)`);
    }

    console.log('\n\n⚡ ПЛАН ОПТИМИЗАЦИИ:\n');
    console.log('Фаза 1 (сейчас): ✅ Выполнено - Views обеспечивают совместимость');
    console.log('Фаза 2 (текущая): Постепенное обновление кода');
    console.log('Фаза 3 (будущее): Удаление дублирующихся полей после полного перехода');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Анализирую дублирующиеся поля...\n');
analyzeDuplicateFields();