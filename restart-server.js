#!/usr/bin/env node

/**
 * Скрипт для полного перезапуска сервера UniFarm
 */

import { exec } from 'child_process';

console.log('🔄 ПЕРЕЗАПУСК СЕРВЕРА UNIFARM');
console.log('============================');
console.log('');

// Завершение всех процессов
console.log('1. Остановка всех процессов...');
exec('pkill -f "npm run dev" && pkill -f "tsx server" && pkill -f "node.*server"', (error) => {
    if (error) {
        console.log('⚠️  Процессы уже остановлены или не найдены');
    } else {
        console.log('✅ Все процессы остановлены');
    }
    
    console.log('');
    console.log('2. Очистка портов...');
    
    // Очистка портов
    exec('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', (error) => {
        if (error) {
            console.log('⚠️  Порт 3000 уже свободен');
        } else {
            console.log('✅ Порт 3000 очищен');
        }
        
        console.log('');
        console.log('3. Запуск нового сервера...');
        
        // Запуск нового процесса
        const server = exec('npm run dev', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Ошибка запуска сервера:', error);
                return;
            }
        });
        
        server.stdout.on('data', (data) => {
            console.log('📊 SERVER:', data.toString().trim());
        });
        
        server.stderr.on('data', (data) => {
            console.error('⚠️  SERVER ERROR:', data.toString().trim());
        });
        
        console.log('✅ Сервер запускается...');
        console.log('');
        console.log('🎯 СЛЕДУЮЩИЕ ШАГИ:');
        console.log('- Подождите 10-15 секунд для полного запуска');
        console.log('- Откройте Telegram WebApp заново');
        console.log('- Проверьте отсутствие перезагрузок');
        console.log('');
        console.log('📱 ДОМЕН ДЛЯ TELEGRAM:');
        console.log('https://uni-farm-connect-aab49267.replit.app');
    });
});