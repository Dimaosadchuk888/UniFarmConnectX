#!/usr/bin/env tsx

/**
 * ТЕСТ ПОДКЛЮЧЕНИЯ TELEGRAM БОТОВ
 * Проверяет webhook connectivity, bot tokens и создание тестовых транзакций
 */

import { config } from 'dotenv';
import { logger } from './core/logger';
import { supabase } from './core/supabase';

config();

interface BotTestResult {
  botName: string;
  tokenValid: boolean;
  webhookSet: boolean;
  webhookUrl?: string;
  lastError?: string;
  testMessageSent?: boolean;
}

class TelegramBotTester {
  private mainBotToken: string;
  private adminBotToken: string;
  private baseUrl: string;

  constructor() {
    this.mainBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.adminBotToken = process.env.ADMIN_BOT_TOKEN || '';
    this.baseUrl = process.env.APP_DOMAIN || 'https://uni-farm-connect-unifarm01010101.replit.app';
  }

  async testBotAPI(token: string, botName: string): Promise<BotTestResult> {
    const result: BotTestResult = {
      botName,
      tokenValid: false,
      webhookSet: false
    };

    try {
      // Test bot token validity
      console.log(`\n🔍 Тестируем ${botName}...`);
      
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const botInfo = await botInfoResponse.json();
      
      if (botInfo.ok) {
        result.tokenValid = true;
        console.log(`✅ ${botName} token действителен: @${botInfo.result.username}`);
      } else {
        result.lastError = botInfo.description;
        console.log(`❌ ${botName} token недействителен: ${botInfo.description}`);
        return result;
      }

      // Check webhook info
      const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const webhookInfo = await webhookInfoResponse.json();
      
      if (webhookInfo.ok) {
        const info = webhookInfo.result;
        result.webhookUrl = info.url;
        result.webhookSet = !!info.url;
        
        console.log(`📡 Webhook info for ${botName}:`);
        console.log(`   URL: ${info.url || 'НЕ УСТАНОВЛЕН'}`);
        console.log(`   Pending updates: ${info.pending_update_count}`);
        console.log(`   Last error: ${info.last_error_message || 'Нет ошибок'}`);
        console.log(`   Last error date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'Никогда'}`);
        
        if (info.last_error_message) {
          result.lastError = info.last_error_message;
        }
      }

      // Set webhook if needed
      const expectedWebhookUrl = botName === 'MainBot' 
        ? `${this.baseUrl}/api/v2/telegram/webhook`
        : `${this.baseUrl}/api/v2/admin-bot/webhook`;

      if (!result.webhookSet || result.webhookUrl !== expectedWebhookUrl) {
        console.log(`🔧 Устанавливаем webhook для ${botName}: ${expectedWebhookUrl}`);
        
        const setWebhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: expectedWebhookUrl,
            allowed_updates: ['message', 'callback_query']
          })
        });
        
        const setWebhookResult = await setWebhookResponse.json();
        
        if (setWebhookResult.ok) {
          result.webhookSet = true;
          result.webhookUrl = expectedWebhookUrl;
          console.log(`✅ Webhook установлен для ${botName}`);
        } else {
          result.lastError = setWebhookResult.description;
          console.log(`❌ Ошибка установки webhook для ${botName}: ${setWebhookResult.description}`);
        }
      } else {
        console.log(`✅ Webhook уже установлен корректно для ${botName}`);
      }

      return result;

    } catch (error) {
      result.lastError = error instanceof Error ? error.message : String(error);
      console.log(`❌ Критическая ошибка тестирования ${botName}: ${result.lastError}`);
      return result;
    }
  }

  async testWebhookConnectivity(webhookUrl: string, botName: string): Promise<boolean> {
    try {
      console.log(`\n🌐 Тестируем подключение к webhook: ${webhookUrl}`);
      
      // Test webhook endpoint availability
      const testPayload = {
        update_id: 999999,
        message: {
          message_id: 1,
          from: { id: 12345, username: 'test_user', first_name: 'Test' },
          chat: { id: 12345, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      
      console.log(`📊 Webhook ${botName} ответ:`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${responseText.substring(0, 200)}`);
      
      return response.ok;

    } catch (error) {
      console.log(`❌ Ошибка подключения к webhook ${botName}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async testWithdrawalTransactionCreation(): Promise<boolean> {
    try {
      console.log('\n💳 Тестируем создание транзакций для заявок на вывод...');
      
      // Get a test user
      const { data: testUser, error: userError } = await supabase
        .from('users')
        .select('id, telegram_id, username, balance_ton, balance_uni')
        .gt('balance_ton', 1)
        .limit(1)
        .single();

      if (userError || !testUser) {
        console.log('❌ Не найден пользователь для тестирования транзакций');
        return false;
      }

      console.log(`👤 Тестовый пользователь: ID ${testUser.id}, @${testUser.username}, TON: ${testUser.balance_ton}`);

      // Test transaction creation without actually processing withdrawal
      const testTransactionData = {
        user_id: testUser.id,
        type: 'WITHDRAWAL', // Используем WITHDRAWAL вместо lowercase withdrawal
        amount_uni: '0',
        amount_ton: '0.001', // Минимальная тестовая сумма
        currency: 'TON',
        status: 'test_only', // Специальный статус для тестирования
        description: 'Тест создания транзакции для заявки на вывод',
        created_at: new Date().toISOString()
      };

      const { data: transactionResult, error: transactionError } = await supabase
        .from('transactions')
        .insert(testTransactionData)
        .select()
        .single();

      if (transactionError) {
        console.log('❌ Ошибка создания тестовой транзакции:', transactionError.message);
        console.log('   Code:', transactionError.code);
        console.log('   Details:', transactionError.details);
        return false;
      }

      console.log('✅ Тестовая транзакция создана успешно:', {
        id: transactionResult.id,
        user_id: transactionResult.user_id,
        type: transactionResult.type,
        status: transactionResult.status
      });

      // Clean up test transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionResult.id);

      console.log('🧹 Тестовая транзакция удалена');
      return true;

    } catch (error) {
      console.log('❌ Критическая ошибка тестирования транзакций:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async runFullTest(): Promise<void> {
    console.log('🚀 ЗАПУСК ПОЛНОГО ТЕСТА TELEGRAM БОТОВ');
    console.log('==========================================');

    if (!this.mainBotToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN не найден в environment variables');
      return;
    }

    if (!this.adminBotToken) {
      console.log('❌ ADMIN_BOT_TOKEN не найден в environment variables');
      return;
    }

    // Test main bot
    const mainBotResult = await this.testBotAPI(this.mainBotToken, 'MainBot (@UniFarming_Bot)');
    
    // Test admin bot
    const adminBotResult = await this.testBotAPI(this.adminBotToken, 'AdminBot (@unifarm_admin_bot)');

    // Test webhook connectivity
    if (mainBotResult.webhookSet && mainBotResult.webhookUrl) {
      await this.testWebhookConnectivity(mainBotResult.webhookUrl, 'MainBot');
    }

    if (adminBotResult.webhookSet && adminBotResult.webhookUrl) {
      await this.testWebhookConnectivity(adminBotResult.webhookUrl, 'AdminBot');
    }

    // Test withdrawal transaction creation
    await this.testWithdrawalTransactionCreation();

    // Summary
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ');
    console.log('==================');
    console.log(`MainBot Token: ${mainBotResult.tokenValid ? '✅' : '❌'}`);
    console.log(`MainBot Webhook: ${mainBotResult.webhookSet ? '✅' : '❌'}`);
    console.log(`AdminBot Token: ${adminBotResult.tokenValid ? '✅' : '❌'}`);
    console.log(`AdminBot Webhook: ${adminBotResult.webhookSet ? '✅' : '❌'}`);

    if (mainBotResult.lastError || adminBotResult.lastError) {
      console.log('\n🚨 ОБНАРУЖЕННЫЕ ОШИБКИ:');
      if (mainBotResult.lastError) {
        console.log(`   MainBot: ${mainBotResult.lastError}`);
      }
      if (adminBotResult.lastError) {
        console.log(`   AdminBot: ${adminBotResult.lastError}`);
      }
    }

    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    if (!mainBotResult.tokenValid) {
      console.log('   • Проверить TELEGRAM_BOT_TOKEN в переменных окружения');
    }
    if (!adminBotResult.tokenValid) {
      console.log('   • Проверить ADMIN_BOT_TOKEN в переменных окружения');
    }
    if (!mainBotResult.webhookSet || !adminBotResult.webhookSet) {
      console.log('   • Убедиться что application доступен по HTTPS');
      console.log('   • Проверить маршруты webhook в server/routes.ts');
    }
  }
}

// Запуск тестирования
const tester = new TelegramBotTester();
tester.runFullTest().catch(console.error);