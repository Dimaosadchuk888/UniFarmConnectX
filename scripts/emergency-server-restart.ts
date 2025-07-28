#!/usr/bin/env tsx

/**
 * ЭКСТРЕННАЯ ПЕРЕЗАГРУЗКА СЕРВЕРА
 * Принудительное завершение всех процессов и чистый запуск
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function emergencyRestart() {
    console.log('🚨 ЭКСТРЕННАЯ ПЕРЕЗАГРУЗКА СЕРВЕРА НАЧАТА');
    
    try {
        // 1. Принудительно убиваем все Node процессы
        console.log('🔥 Завершаем все Node процессы...');
        try {
            await execAsync('pkill -9 -f "tsx server/index.ts"');
            await execAsync('pkill -9 -f "npm run dev"');
            await execAsync('pkill -9 -f "node.*tsx.*server"');
        } catch (e) {
            console.log('   (Некоторые процессы уже завершены)');
        }
        
        // 2. Ждем 3 секунды
        console.log('⏱️  Ожидание 3 секунды...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. Проверяем что процессы убиты
        try {
            const { stdout } = await execAsync('ps aux | grep -E "(tsx|npm).*server" | grep -v grep');
            if (stdout.trim()) {
                console.log('⚠️  Остались процессы:', stdout);
            } else {
                console.log('✅ Все процессы завершены');
            }
        } catch (e) {
            console.log('✅ Все процессы завершены');
        }
        
        // 4. Запускаем новый сервер
        console.log('🚀 Запускаем новый сервер...');
        const serverProcess = exec('npm run dev', { cwd: process.cwd() });
        
        serverProcess.stdout?.on('data', (data) => {
            console.log('[SERVER]', data.toString().trim());
        });
        
        serverProcess.stderr?.on('data', (data) => {
            console.error('[SERVER ERROR]', data.toString().trim());
        });
        
        // 5. Ждем запуска сервера
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('✅ ЭКСТРЕННАЯ ПЕРЕЗАГРУЗКА ЗАВЕРШЕНА');
        console.log('🔍 Проверьте https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook');
        
    } catch (error) {
        console.error('❌ Ошибка при экстренной перезагрузке:', error);
    }
}

emergencyRestart();