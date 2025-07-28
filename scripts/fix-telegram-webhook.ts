#!/usr/bin/env tsx

import { telegramService } from '../modules/telegram/service';

async function fixTelegramWebhook() {
  console.log('🔍 Проверяем текущий webhook...');
  
  try {
    // Получаем информацию о текущем webhook
    const webhookInfo = await telegramService.getWebhookInfo();
    console.log('📊 Текущий webhook:', JSON.stringify(webhookInfo, null, 2));

    // Удаляем старый webhook
    console.log('🗑️ Удаляем старый webhook...');
    const deleteResult = await telegramService.deleteWebhook();
    console.log('❌ Результат удаления:', deleteResult);

    // Ждем 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Устанавливаем новый webhook
    const newWebhookUrl = `https://uni-farm-connect-unifarm01010101.replit.app/api/v2/telegram/webhook`;
    console.log('🔗 Устанавливаем новый webhook:', newWebhookUrl);
    
    const setResult = await telegramService.setWebhook(newWebhookUrl);
    console.log('✅ Результат установки:', setResult);

    // Проверяем финальное состояние
    console.log('🔍 Проверяем финальное состояние...');
    const finalInfo = await telegramService.getWebhookInfo();
    console.log('📊 Финальный webhook:', JSON.stringify(finalInfo, null, 2));

    // Очищаем команды (оставляем только /start)
    console.log('🧹 Очищаем команды бота...');
    const commandsResult = await telegramService.setCommands([]);
    console.log('📝 Результат очистки команд:', commandsResult);

    console.log('✅ Webhook обновлен и готов к работе!');
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении webhook:', error);
  }
  
  process.exit(0);
}

fixTelegramWebhook();