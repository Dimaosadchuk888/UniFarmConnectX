#!/usr/bin/env node
/**
 * АНАЛИЗ ЛОГОВ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Поиск доказательств работы исправлений в существующих логах
 */

const { exec } = require('child_process');
const fs = require('fs');

console.log('📊 АНАЛИЗ ЛОГОВ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('==================================\n');

// Функция для поиска паттернов в файлах
function searchInFiles(pattern, description) {
    return new Promise((resolve) => {
        exec(`grep -r "${pattern}" . --include="*.log" --include="*.ts" --include="*.js" 2>/dev/null | head -10`, 
        (error, stdout, stderr) => {
            console.log(`🔍 ${description}:`);
            if (stdout && stdout.trim()) {
                stdout.split('\n').forEach(line => {
                    if (line.trim()) {
                        console.log(`   ✅ ${line.substring(0, 100)}...`);
                    }
                });
            } else {
                console.log(`   ⚪ Записей не найдено`);
            }
            console.log();
            resolve(stdout);
        });
    });
}

// Функция для анализа структуры проекта
function analyzeProjectStructure() {
    console.log('📁 АНАЛИЗ СТРУКТУРЫ ПРОЕКТА:');
    
    const keyFiles = [
        'utils/telegram.ts',
        'modules/auth/service.ts', 
        'modules/referral/service.ts',
        'server/index.ts'
    ];
    
    keyFiles.forEach(file => {
        try {
            const stats = fs.statSync(file);
            console.log(`   ✅ ${file} - размер: ${stats.size} байт, изменен: ${stats.mtime.toISOString()}`);
        } catch (error) {
            console.log(`   ❌ ${file} - не найден`);
        }
    });
    console.log();
}

// Главная функция анализа
async function main() {
    analyzeProjectStructure();
    
    // Поиск доказательств исправлений
    await searchInFiles('start_param', 'Использование start_param в коде');
    await searchInFiles('validation.start_param', 'Обращения к validation.start_param');
    await searchInFiles('РЕФЕРАЛЬНАЯ СВЯЗЬ', 'Логи создания реферальных связей');
    await searchInFiles('processReferral', 'Вызовы функции processReferral');
    await searchInFiles('referred_by', 'Работа с полем referred_by');
    
    // Поиск в логах сервера
    console.log('📋 АНАЛИЗ АКТИВНОСТИ СЕРВЕРА:');
    
    exec('ps aux | grep tsx | grep -v grep', (error, stdout) => {
        if (stdout) {
            console.log('   ✅ Сервер запущен (tsx процесс найден)');
            console.log(`   📊 Процессы: ${stdout.trim()}`);
        } else {
            console.log('   ⚪ tsx процесс не найден');
        }
        console.log();
    });
    
    // Проверка доступности API
    exec('curl -s http://localhost:3000/api/health', (error, stdout) => {
        console.log('🌐 ПРОВЕРКА API:');
        if (error) {
            console.log('   ❌ API недоступен:', error.message);
        } else {
            try {
                const health = JSON.parse(stdout);
                console.log('   ✅ API доступен');
                console.log(`   📊 Статус: ${health.status}`);
                console.log(`   📊 Время: ${health.timestamp}`);
            } catch (e) {
                console.log('   ⚠️  API отвечает, но формат неожиданный:', stdout.substring(0, 100));
            }
        }
        console.log();
    });
    
    // Анализ недавних изменений в коде
    console.log('⏰ АНАЛИЗ НЕДАВНИХ ИЗМЕНЕНИЙ:');
    exec('find . -name "*.ts" -mtime -1 | head -10', (error, stdout) => {
        if (stdout && stdout.trim()) {
            console.log('   📁 Файлы изменённые за последние 24 часа:');
            stdout.split('\n').forEach(file => {
                if (file.trim()) {
                    console.log(`      - ${file.trim()}`);
                }
            });
        } else {
            console.log('   ⚪ Недавних изменений не найдено');
        }
        console.log();
    });
    
    // Рекомендации по дальнейшему тестированию
    console.log('🎯 РЕКОМЕНДАЦИИ ДЛЯ ПРОВЕРКИ РАБОТОСПОСОБНОСТИ:');
    console.log('   1. Мониторинг логов в реальном времени:');
    console.log('      tail -f logs/server.log (если есть)');
    console.log('   2. Проверка запросов в консоли браузера');
    console.log('   3. Создание тестового Telegram бота для полной проверки');
    console.log('   4. Анализ ответов API с различными типами initData');
    
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН');
}

main().catch(console.error);