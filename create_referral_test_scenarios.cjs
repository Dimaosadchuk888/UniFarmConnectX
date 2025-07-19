#!/usr/bin/env node
/**
 * СОЗДАНИЕ ТЕСТОВЫХ СЦЕНАРИЕВ ДЛЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Безопасное тестирование без изменения реальных данных
 */

console.log('🧪 СОЗДАНИЕ ТЕСТОВЫХ СЦЕНАРИЕВ ДЛЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('====================================================\n');

// Генерация различных типов Telegram initData для тестирования
function generateTestScenarios() {
    const baseTimestamp = Math.floor(Date.now() / 1000);
    
    const scenarios = [
        {
            name: 'Стандартная реферальная ссылка',
            description: 'Пользователь переходит по ссылке с start_param',
            user_id: 999999001,
            username: 'test_user_1',
            referral_code: 'REF001',
            initData: null // будет сгенерирован
        },
        {
            name: 'Ссылка через startapp',
            description: 'Пользователь использует startapp параметр',
            user_id: 999999002, 
            username: 'test_user_2',
            referral_code: 'PROMO123',
            param_type: 'startapp'
        },
        {
            name: 'Пользователь без реферала',
            description: 'Обычный переход без реферального кода',
            user_id: 999999003,
            username: 'test_user_3',
            referral_code: null
        },
        {
            name: 'Длинный реферальный код',
            description: 'Тест с длинным реферальным кодом',
            user_id: 999999004,
            username: 'test_user_4',
            referral_code: 'SUPER_LONG_REFERRAL_CODE_12345'
        },
        {
            name: 'Специальные символы в коде',
            description: 'Тест с символами в реферальном коде',
            user_id: 999999005,
            username: 'test_user_5',
            referral_code: 'REF-123_SPECIAL'
        }
    ];
    
    // Генерируем initData для каждого сценария
    scenarios.forEach(scenario => {
        const user = {
            id: scenario.user_id,
            first_name: 'Test',
            username: scenario.username
        };
        
        let params = `user=${encodeURIComponent(JSON.stringify(user))}&auth_date=${baseTimestamp}`;
        
        if (scenario.referral_code) {
            const paramName = scenario.param_type || 'start_param';
            params += `&${paramName}=${scenario.referral_code}`;
        }
        
        params += '&hash=test_hash_' + scenario.user_id;
        
        scenario.initData = params;
        scenario.expectedResult = {
            valid: true, // (при игнорировании HMAC проверки)
            user: user,
            start_param: scenario.param_type === 'startapp' ? null : scenario.referral_code,
            referral_extracted: scenario.referral_code
        };
    });
    
    return scenarios;
}

// Создание cURL команд для тестирования
function generateCurlCommands(scenarios) {
    console.log('📋 CURL КОМАНДЫ ДЛЯ ТЕСТИРОВАНИЯ API:');
    console.log('=====================================\n');
    
    scenarios.forEach((scenario, index) => {
        console.log(`${index + 1}. ${scenario.name}:`);
        console.log(`   Описание: ${scenario.description}`);
        
        const curlCommand = `curl -X POST http://localhost:3000/api/auth/telegram \\
  -H "Content-Type: application/json" \\
  -d '{"initData":"${scenario.initData}"}'`;
        
        console.log('   Команда:');
        console.log(`   ${curlCommand}`);
        
        console.log('   Ожидаемое в логах:');
        if (scenario.referral_code) {
            console.log(`   - "start_param: ${scenario.referral_code}"`);
            console.log(`   - "ref_by: ${scenario.referral_code}"`);
            console.log('   - "validation.start_param" в AuthService');
        } else {
            console.log('   - "start_param: none" или null');
            console.log('   - реферальная обработка пропущена');
        }
        console.log();
    });
}

// Создание JavaScript тестов для браузера
function generateBrowserTests(scenarios) {
    console.log('🌐 JAVASCRIPT ТЕСТЫ ДЛЯ БРАУЗЕРА:');
    console.log('=================================\n');
    
    console.log('// Скопируйте в DevTools Console браузера:');
    console.log('async function testReferralSystem() {');
    console.log('  const results = [];');
    console.log();
    
    scenarios.forEach((scenario, index) => {
        console.log(`  // Тест ${index + 1}: ${scenario.name}`);
        console.log(`  console.log('🧪 Тестируем: ${scenario.name}');`);
        console.log('  try {');
        console.log(`    const response${index} = await fetch('/api/auth/telegram', {`);
        console.log('      method: "POST",');
        console.log('      headers: { "Content-Type": "application/json" },');
        console.log(`      body: JSON.stringify({ initData: "${scenario.initData}" })`);
        console.log('    });');
        console.log(`    const data${index} = await response${index}.json();`);
        console.log(`    results.push({ test: '${scenario.name}', result: data${index} });`);
        console.log(`    console.log('📊 Результат ${index + 1}:', data${index});`);
        console.log('  } catch (error) {');
        console.log(`    console.error('❌ Ошибка теста ${index + 1}:', error);`);
        console.log(`    results.push({ test: '${scenario.name}', error: error.message });`);
        console.log('  }');
        console.log();
    });
    
    console.log('  return results;');
    console.log('}');
    console.log();
    console.log('// Запуск всех тестов:');
    console.log('testReferralSystem().then(results => {');
    console.log('  console.log("🎯 ВСЕ РЕЗУЛЬТАТЫ ТЕСТОВ:", results);');
    console.log('});');
    console.log();
}

// Анализ паттернов в логах
function generateLogAnalysisPatterns() {
    console.log('📊 ПАТТЕРНЫ ДЛЯ АНАЛИЗА ЛОГОВ:');
    console.log('==============================\n');
    
    const patterns = [
        {
            pattern: 'start_param:',
            meaning: 'Извлечение реферального кода из initData',
            expectation: 'Должно появляться для каждого запроса с реферальным кодом'
        },
        {
            pattern: 'validation.start_param',
            meaning: 'Использование start_param в AuthService',
            expectation: 'Доказательство что исправления работают'
        },
        {
            pattern: 'РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА',
            meaning: 'Успешное создание реферальной связи',
            expectation: 'Должно появляться для новых пользователей с рефералом'
        },
        {
            pattern: 'referred_by:',
            meaning: 'Заполнение поля referred_by',
            expectation: 'Не должно быть null для пользователей с рефералом'
        },
        {
            pattern: 'processReferral',
            meaning: 'Вызов функции обработки реферала',
            expectation: 'Должна вызываться при наличии реферального кода'
        }
    ];
    
    patterns.forEach((p, index) => {
        console.log(`${index + 1}. Паттерн: "${p.pattern}"`);
        console.log(`   Значение: ${p.meaning}`);
        console.log(`   Ожидание: ${p.expectation}`);
        console.log();
    });
    
    console.log('🔍 КОМАНДЫ ДЛЯ ПОИСКА В ЛОГАХ:');
    patterns.forEach(p => {
        console.log(`grep -i "${p.pattern}" logs/* 2>/dev/null || echo "Паттерн '${p.pattern}' не найден"`);
    });
    console.log();
}

// Создание чеклиста проверки
function generateVerificationChecklist() {
    console.log('✅ ЧЕКЛИСТ ПРОВЕРКИ ИСПРАВЛЕНИЙ:');
    console.log('================================\n');
    
    const checklist = [
        {
            category: 'КОД',
            items: [
                'ValidationResult интерфейс содержит start_param?: string',
                'validateTelegramInitData извлекает start_param из URL параметров',
                'validateTelegramInitData возвращает { valid, user, start_param }',
                'AuthService использует validation.start_param',
                'Логирование start_param добавлено в AuthService'
            ]
        },
        {
            category: 'ФУНКЦИОНАЛЬНОСТЬ',
            items: [
                'API endpoint /api/auth/telegram принимает запросы',
                'initData корректно парсится',
                'start_param извлекается из initData',
                'Реферальный код передается в processReferral',
                'Новые пользователи создаются с referred_by != null'
            ]
        },
        {
            category: 'ЛОГИ',
            items: [
                'В логах появляются записи "start_param: <код>"',
                'В логах появляются записи "validation.start_param"',
                'В логах появляются записи "РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА"',
                'Нет ошибок валидации для корректных initData',
                'Детальные логи показывают поток данных'
            ]
        }
    ];
    
    checklist.forEach(category => {
        console.log(`📋 ${category.category}:`);
        category.items.forEach((item, index) => {
            console.log(`   ${index + 1}. ☐ ${item}`);
        });
        console.log();
    });
}

// Главная функция
function main() {
    const scenarios = generateTestScenarios();
    
    console.log('📊 СГЕНЕРИРОВАННЫЕ ТЕСТОВЫЕ СЦЕНАРИИ:');
    console.log('====================================\n');
    
    scenarios.forEach((scenario, index) => {
        console.log(`${index + 1}. ${scenario.name}`);
        console.log(`   User ID: ${scenario.user_id}`);
        console.log(`   Username: ${scenario.username}`);
        console.log(`   Referral Code: ${scenario.referral_code || 'нет'}`);
        console.log(`   InitData: ${scenario.initData.substring(0, 60)}...`);
        console.log();
    });
    
    generateCurlCommands(scenarios);
    generateBrowserTests(scenarios);
    generateLogAnalysisPatterns();
    generateVerificationChecklist();
    
    console.log('🎯 ЗАКЛЮЧЕНИЕ:');
    console.log('==============');
    console.log('✅ Создано 5 тестовых сценариев');
    console.log('✅ Сгенерированы cURL команды для API тестирования');
    console.log('✅ Подготовлены JavaScript тесты для браузера');  
    console.log('✅ Определены паттерны для анализа логов');
    console.log('✅ Создан чеклист для проверки исправлений');
    console.log('\n⚠️  Все тесты безопасны и не изменяют код системы!');
}

main();