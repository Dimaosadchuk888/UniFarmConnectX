#!/usr/bin/env tsx

/**
 * Тест внешнего webhook для диагностики проблемы
 */

async function testExternalWebhook() {
    console.log('🔍 Тестируем внешний webhook...');
    
    const webhookUrl = 'https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook';
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TelegramBot (like Telegram Bot SDK)',
            },
            body: JSON.stringify({
                "update_id": 123456789,
                "message": {
                    "message_id": 1,
                    "from": {
                        "id": 184,
                        "is_bot": false,
                        "first_name": "Test",
                        "username": "testuser"
                    },
                    "chat": {
                        "id": 184,
                        "first_name": "Test",
                        "username": "testuser",
                        "type": "private"
                    },
                    "date": Math.floor(Date.now() / 1000),
                    "text": "/start"
                }
            })
        });
        
        console.log('📊 Статус ответа:', response.status);
        console.log('📊 Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📊 Тело ответа:', responseText);
        
        if (response.status === 200) {
            console.log('✅ Webhook отвечает корректно');
        } else {
            console.log('🔴 Webhook возвращает ошибку:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании webhook:', error);
    }
}

testExternalWebhook();