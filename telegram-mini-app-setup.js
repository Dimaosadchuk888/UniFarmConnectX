/**
 * T10: Автоматическая публикация Telegram Mini App UniFarm
 * Настройка бота через BotFather API для production запуска
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

class TelegramMiniAppPublisher {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.productionUrl = 'https://979d1bb5-d322-410b-9bb8-41ff6d7f2cc5-00-16l4whe1y4mgv.pike.replit.dev';
    this.botUsername = '@UniFarming_Bot';
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
    
    console.log('🚀 Публикация Telegram Mini App UniFarm');
    console.log(`Bot: ${this.botUsername}`);
    console.log(`Production URL: ${this.productionUrl}\n`);
  }

  /**
   * 1. Проверка статуса бота
   */
  async checkBotStatus() {
    console.log('📋 Проверка статуса бота...');
    
    try {
      const response = await fetch(`${this.apiBase}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Bot активен: @${data.result.username}`);
        console.log(`   ID: ${data.result.id}`);
        console.log(`   Name: ${data.result.first_name}`);
        return true;
      } else {
        console.log('❌ Ошибка получения информации о боте:', data.description);
        return false;
      }
    } catch (error) {
      console.log('❌ Ошибка подключения к Telegram API:', error.message);
      return false;
    }
  }

  /**
   * 2. Настройка webhook для production
   */
  async setupWebhook() {
    console.log('🔗 Настройка production webhook...');
    
    try {
      const webhookUrl = `${this.productionUrl}/webhook`;
      const response = await fetch(`${this.apiBase}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query", "web_app_data"]
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Webhook установлен:', webhookUrl);
        return true;
      } else {
        console.log('❌ Ошибка установки webhook:', data.description);
        return false;
      }
    } catch (error) {
      console.log('❌ Ошибка настройки webhook:', error.message);
      return false;
    }
  }

  /**
   * 3. Настройка команд бота
   */
  async setupBotCommands() {
    console.log('⚙️ Настройка команд бота...');
    
    try {
      const commands = [
        {
          command: "start",
          description: "🚀 Запустить UniFarm Mini App"
        },
        {
          command: "app",
          description: "📱 Открыть приложение"
        },
        {
          command: "help",
          description: "❓ Помощь и поддержка"
        }
      ];
      
      const response = await fetch(`${this.apiBase}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Команды бота настроены');
        commands.forEach(cmd => {
          console.log(`   /${cmd.command} - ${cmd.description}`);
        });
        return true;
      } else {
        console.log('❌ Ошибка настройки команд:', data.description);
        return false;
      }
    } catch (error) {
      console.log('❌ Ошибка настройки команд:', error.message);
      return false;
    }
  }

  /**
   * 4. Настройка Menu Button для Mini App
   */
  async setupMenuButton() {
    console.log('🔘 Настройка Menu Button...');
    
    try {
      const response = await fetch(`${this.apiBase}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "🌾 UniFarm",
            web_app: {
              url: this.productionUrl
            }
          }
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Menu Button настроен');
        console.log(`   Текст: "🌾 UniFarm"`);
        console.log(`   URL: ${this.productionUrl}`);
        return true;
      } else {
        console.log('❌ Ошибка настройки Menu Button:', data.description);
        return false;
      }
    } catch (error) {
      console.log('❌ Ошибка настройки Menu Button:', error.message);
      return false;
    }
  }

  /**
   * 5. Проверка доступности Mini App
   */
  async testMiniAppAccess() {
    console.log('🧪 Проверка доступности Mini App...');
    
    try {
      // Проверка главной страницы
      const mainResponse = await fetch(this.productionUrl);
      const mainPageOk = mainResponse.status === 200;
      
      // Проверка manifest.json
      const manifestResponse = await fetch(`${this.productionUrl}/manifest.json`);
      const manifestOk = manifestResponse.status === 200;
      
      // Проверка health endpoint
      const healthResponse = await fetch(`${this.productionUrl}/health`);
      const healthOk = healthResponse.status === 200;
      
      console.log(`   Главная страница: ${mainPageOk ? '✅' : '❌'}`);
      console.log(`   Manifest.json: ${manifestOk ? '✅' : '❌'}`);
      console.log(`   Health endpoint: ${healthOk ? '✅' : '❌'}`);
      
      const allOk = mainPageOk && manifestOk && healthOk;
      
      if (allOk) {
        console.log('✅ Mini App полностью доступен');
      } else {
        console.log('⚠️ Некоторые компоненты Mini App недоступны');
      }
      
      return allOk;
    } catch (error) {
      console.log('❌ Ошибка проверки доступности:', error.message);
      return false;
    }
  }

  /**
   * 6. Проверка размера manifest.json
   */
  async validateManifest() {
    console.log('📄 Проверка manifest.json...');
    
    try {
      const response = await fetch(`${this.productionUrl}/manifest.json`);
      const manifestText = await response.text();
      const manifestSize = Buffer.byteLength(manifestText, 'utf8');
      
      console.log(`   Размер: ${manifestSize} байт (лимит: 1MB)`);
      
      if (manifestSize > 1048576) { // 1MB
        console.log('❌ Manifest превышает лимит 1MB');
        return false;
      }
      
      try {
        const manifest = JSON.parse(manifestText);
        console.log(`   Название: ${manifest.name}`);
        console.log(`   Start URL: ${manifest.start_url}`);
        console.log(`   Scope: ${manifest.scope}`);
        console.log('✅ Manifest корректен');
        return true;
      } catch (parseError) {
        console.log('❌ Ошибка парсинга manifest.json');
        return false;
      }
    } catch (error) {
      console.log('❌ Ошибка загрузки manifest:', error.message);
      return false;
    }
  }

  /**
   * Основной метод публикации
   */
  async publishMiniApp() {
    console.log('🎯 Начинаем публикацию Mini App...\n');
    
    const steps = [
      { name: 'Проверка бота', method: () => this.checkBotStatus() },
      { name: 'Валидация manifest', method: () => this.validateManifest() },
      { name: 'Проверка доступности', method: () => this.testMiniAppAccess() },
      { name: 'Настройка webhook', method: () => this.setupWebhook() },
      { name: 'Настройка команд', method: () => this.setupBotCommands() },
      { name: 'Настройка Menu Button', method: () => this.setupMenuButton() }
    ];
    
    let successCount = 0;
    
    for (const step of steps) {
      try {
        const result = await step.method();
        if (result) {
          successCount++;
        }
        console.log(''); // Пустая строка между шагами
      } catch (error) {
        console.log(`❌ Критическая ошибка в шаге "${step.name}":`, error.message);
        console.log('');
      }
    }
    
    // Результат публикации
    console.log('📊 РЕЗУЛЬТАТ ПУБЛИКАЦИИ');
    console.log('=' .repeat(50));
    console.log(`Успешных шагов: ${successCount}/${steps.length}`);
    
    if (successCount === steps.length) {
      console.log('🎉 ПУБЛИКАЦИЯ УСПЕШНА!');
      console.log('');
      console.log('🔗 Mini App доступен по ссылкам:');
      console.log(`   Прямая ссылка: https://t.me/UniFarming_Bot/app`);
      console.log(`   Через бота: https://t.me/UniFarming_Bot`);
      console.log('');
      console.log('✅ Пользователи могут:');
      console.log('   • Открыть @UniFarming_Bot в Telegram');
      console.log('   • Нажать кнопку "🌾 UniFarm" в меню');
      console.log('   • Использовать команду /start');
      console.log('   • Авторизоваться через initData');
      console.log('   • Использовать все функции: фарминг, баланс, рефералы');
    } else {
      console.log('⚠️ ПУБЛИКАЦИЯ ЧАСТИЧНО УСПЕШНА');
      console.log('Требуется проверка и исправление ошибок');
    }
    
    return successCount === steps.length;
  }
}

async function main() {
  const publisher = new TelegramMiniAppPublisher();
  await publisher.publishMiniApp();
}

main().catch(console.error);