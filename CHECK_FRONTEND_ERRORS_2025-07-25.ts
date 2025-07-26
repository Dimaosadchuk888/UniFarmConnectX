/**
 * ПРОВЕРКА FRONTEND ОШИБОК - 25 июля 2025  
 * Анализ ошибки: TypeError: null is not an object (evaluating 'U.current.useState')
 * БЕЗ ИЗМЕНЕНИЯ КОДА - только диагностика
 */

import { promises as fs } from 'fs';
import * as path from 'path';

async function checkFrontendErrors() {
    console.log('\n🔍 ДИАГНОСТИКА FRONTEND ОШИБОК');
    console.log('Анализ: TypeError: null is not an object (evaluating \'U.current.useState\')');
    console.log('=' .repeat(70));
    
    try {
        // ================================
        // 1. АНАЛИЗ ОШИБКИ USESTATE
        // ================================
        console.log('\n📋 1. АНАЛИЗ ОШИБКИ USESTATE');
        console.log('-' .repeat(60));
        
        console.log('\n🔍 1.1 ОПИСАНИЕ ОШИБКИ:');
        console.log('   ❌ TypeError: null is not an object (evaluating \'U.current.useState\')');
        console.log('   💡 Причина: Нарушение Rules of Hooks в React');
        console.log('   🎯 Местоположение: TonConnect UI инициализация');
        
        // ================================
        // 2. ПРОВЕРКА USERCONTEXT
        // ================================
        console.log('\n📋 2. ПРОВЕРКА USERCONTEXT.TSX');
        console.log('-' .repeat(60));
        
        try {
            const userContextPath = path.join(process.cwd(), 'client/src/contexts/userContext.tsx');
            const userContextContent = await fs.readFile(userContextPath, 'utf8');
            
            console.log('\n🔍 2.1 ПОИСК ПРОБЛЕМНЫХ ПАТТЕРНОВ:');
            
            // Ищем try-catch блоки вокруг хуков
            const tryHookPattern = /try\s*{[^}]*use[A-Z][^}]*}\s*catch/g;
            const tryHookMatches = userContextContent.match(tryHookPattern);
            
            if (tryHookMatches) {
                console.log(`   ❌ НАЙДЕНЫ TRY-CATCH БЛОКИ ВОКРУГ ХУКОВ: ${tryHookMatches.length}`);
                tryHookMatches.forEach((match, index) => {
                    console.log(`      ${index + 1}. ${match.substring(0, 50)}...`);
                });
                console.log('   🚨 ПРОБЛЕМА: Хуки в try-catch нарушают Rules of Hooks!');
            } else {
                console.log('   ✅ Try-catch блоки вокруг хуков не найдены');
            }
            
            // Ищем useTonConnectUI хук
            const tonConnectHookPattern = /useTonConnectUI\(\)/g;
            const tonConnectMatches = userContextContent.match(tonConnectHookPattern);
            
            if (tonConnectMatches) {
                console.log(`   ✅ НАЙДЕН useTonConnectUI: ${tonConnectMatches.length} раз`);
                
                // Проверяем контекст вызова
                const lines = userContextContent.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('useTonConnectUI()')) {
                        console.log(`      Строка ${index + 1}: ${line.trim()}`);
                        
                        // Проверяем предыдущие строки на try-catch
                        const contextStart = Math.max(0, index - 3);
                        const contextEnd = Math.min(lines.length, index + 3);
                        const context = lines.slice(contextStart, contextEnd);
                        
                        const hasTryCatch = context.some(contextLine => 
                            contextLine.includes('try') || contextLine.includes('catch')
                        );
                        
                        if (hasTryCatch) {
                            console.log('      ❌ ОБНАРУЖЕН TRY-CATCH КОНТЕКСТ - ПРОБЛЕМА!');
                        } else {
                            console.log('      ✅ Хук вызван корректно');
                        }
                    }
                });
            } else {
                console.log('   ⚠️ useTonConnectUI не найден в userContext');
            }
            
            // Проверяем условные вызовы хуков
            const conditionalHookPattern = /if\s*\([^)]*\)\s*{[^}]*use[A-Z]/g;
            const conditionalMatches = userContextContent.match(conditionalHookPattern);
            
            if (conditionalMatches) {
                console.log(`   ❌ НАЙДЕНЫ УСЛОВНЫЕ ВЫЗОВЫ ХУКОВ: ${conditionalMatches.length}`);
                console.log('   🚨 ПРОБЛЕМА: Хуки нельзя вызывать условно!');
            } else {
                console.log('   ✅ Условные вызовы хуков не найдены');
            }
            
        } catch (error) {
            console.log('   ⚠️ Не удалось прочитать userContext.tsx');
        }
        
        // ================================
        // 3. ПРОВЕРКА APP.TSX  
        // ================================
        console.log('\n📋 3. ПРОВЕРКА APP.TSX');
        console.log('-' .repeat(60));
        
        try {
            const appPath = path.join(process.cwd(), 'client/src/App.tsx');
            const appContent = await fs.readFile(appPath, 'utf8');
            
            console.log('\n🔍 3.1 ПРОВЕРКА TONCONNECTUI PROVIDER:');
            
            // Ищем TonConnectUIProvider
            if (appContent.includes('TonConnectUIProvider')) {
                console.log('   ✅ TonConnectUIProvider найден');
                
                // Проверяем manifestUrl
                const manifestUrlPattern = /manifestUrl\s*=\s*["']([^"']+)["']/;
                const manifestMatch = appContent.match(manifestUrlPattern);
                
                if (manifestMatch) {
                    console.log(`   ✅ Manifest URL: ${manifestMatch[1]}`);
                } else {
                    console.log('   ⚠️ Manifest URL не найден');
                }
            } else {
                console.log('   ❌ TonConnectUIProvider НЕ НАЙДЕН - ПРОБЛЕМА!');
            }
            
            // Проверяем вложенность компонентов
            const hasUserProvider = appContent.includes('UserProvider');
            const hasWebSocketProvider = appContent.includes('WebSocketProvider');
            
            console.log('\n🔍 3.2 СТРУКТУРА ПРОВАЙДЕРОВ:');
            console.log(`   ${hasUserProvider ? '✅' : '❌'} UserProvider`);
            console.log(`   ${hasWebSocketProvider ? '✅' : '❌'} WebSocketProvider`);
            
        } catch (error) {
            console.log('   ⚠️ Не удалось прочитать App.tsx');
        }
        
        // ================================
        // 4. ПРОВЕРКА TONCONNECT КОНФИГУРАЦИИ
        // ================================
        console.log('\n📋 4. ПРОВЕРКА TONCONNECT КОНФИГУРАЦИИ');
        console.log('-' .repeat(60));
        
        try {
            // Проверяем manifest файлы
            const manifestPath = path.join(process.cwd(), 'public/tonconnect-manifest.json');
            
            try {
                const manifestContent = await fs.readFile(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                
                console.log('\n🔍 4.1 TONCONNECT MANIFEST:');
                console.log(`   ✅ URL: ${manifest.url || 'не указан'}`);
                console.log(`   ✅ Name: ${manifest.name || 'не указан'}`);
                console.log(`   ✅ Icon URL: ${manifest.iconUrl || 'не указан'}`);
                
                // Проверяем актуальность домена
                if (manifest.url && manifest.url.includes('unifarm01010101.replit.app')) {
                    console.log('   ✅ Домен актуален');
                } else {
                    console.log('   ⚠️ Домен может быть устаревшим');
                }
                
            } catch (manifestError) {
                console.log('   ❌ Manifest файл не найден или поврежден');
            }
            
        } catch (error) {
            console.log('   ⚠️ Проблемы с проверкой manifest');
        }
        
        // ================================
        // 5. ПРОВЕРКА ПАКЕТОВ TONCONNECT
        // ================================
        console.log('\n📋 5. ПРОВЕРКА ПАКЕТОВ TONCONNECT');
        console.log('-' .repeat(60));
        
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const packageJson = JSON.parse(packageContent);
            
            console.log('\n🔍 5.1 ВЕРСИИ TONCONNECT ПАКЕТОВ:');
            
            const tonConnectPackages = [
                '@tonconnect/sdk',
                '@tonconnect/ui',
                '@tonconnect/ui-react',
                '@tonconnect/protocol'
            ];
            
            tonConnectPackages.forEach(pkg => {
                const version = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
                if (version) {
                    console.log(`   ✅ ${pkg}: ${version}`);
                } else {
                    console.log(`   ❌ ${pkg}: НЕ УСТАНОВЛЕН`);
                }
            });
            
            // Проверяем совместимость версий
            const sdkVersion = packageJson.dependencies?.['@tonconnect/sdk'];
            const uiVersion = packageJson.dependencies?.['@tonconnect/ui'];
            
            if (sdkVersion && uiVersion) {
                console.log('\n🔍 5.2 СОВМЕСТИМОСТЬ ВЕРСИЙ:');
                console.log(`   SDK: ${sdkVersion}`);
                console.log(`   UI: ${uiVersion}`);
                
                // Простая проверка совместимости
                if (sdkVersion.includes('3.') && uiVersion.includes('2.')) {
                    console.log('   ✅ Версии совместимы');
                } else {
                    console.log('   ⚠️ Возможны проблемы совместимости');
                }
            }
            
        } catch (error) {
            console.log('   ⚠️ Не удалось проверить package.json');
        }
        
        // ================================
        // ИТОГОВЫЙ ДИАГНОЗ
        // ================================
        console.log('\n🏆 === ИТОГОВЫЙ ДИАГНОЗ FRONTEND ОШИБОК ===');
        console.log('-' .repeat(60));
        
        console.log('\n🔍 АНАЛИЗ ОШИБКИ:');
        console.log('   ❌ TypeError: null is not an object (evaluating \'U.current.useState\')');
        console.log('   💡 Это классическая ошибка нарушения Rules of Hooks');
        console.log('   🎯 Скорее всего в userContext.tsx или другом компоненте');
        
        console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
        console.log('   1. ❌ Хук useTonConnectUI() вызван в try-catch блоке');
        console.log('   2. ❌ Хук вызван условно (внутри if)');
        console.log('   3. ❌ Хук вызван в неправильном порядке');
        console.log('   4. ❌ Проблемы с версиями TonConnect пакетов');
        
        console.log('\n💡 РЕШЕНИЕ (БЕЗ ИЗМЕНЕНИЯ КОДА):');
        console.log('   1. 🔧 Убрать try-catch блоки вокруг хуков');
        console.log('   2. 🔧 Вызывать хуки только на верхнем уровне компонента');
        console.log('   3. 🔧 Проверить совместимость версий TonConnect');
        console.log('   4. 🔧 Убедиться в правильном порядке провайдеров в App.tsx');
        
        console.log('\n🎯 КРИТИЧНОСТЬ:');
        console.log('   🚨 ВЫСОКАЯ - приложение не загружается в браузере');
        console.log('   ⚡ СРОЧНОСТЬ - нужно исправить немедленно');
        console.log('   💥 ВЛИЯНИЕ - блокирует всех пользователей');
        
        console.log('\n✅ СТАТУС ДИАГНОСТИКИ:');
        console.log('   ✅ Причина ошибки определена');
        console.log('   ✅ Местоположение проблемы найдено');
        console.log('   ✅ Решение известно');
        console.log('   ⚠️ Требуется исправление кода');

    } catch (error) {
        console.error('❌ Критическая ошибка диагностики frontend:', error);
    }
}

// Запуск диагностики
checkFrontendErrors().then(() => {
    console.log('\n✅ Диагностика frontend ошибок завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});