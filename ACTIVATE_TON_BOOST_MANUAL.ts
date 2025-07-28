#!/usr/bin/env tsx
/**
 * Безопасная активация TON Boost для пользователей 251 и 255
 * Использует API методы приложения напрямую
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

async function makeApiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<ApiResponse> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manual-Activation-Script'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    return data as ApiResponse;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    return { success: false, error: String(error) };
  }
}

async function getUserInfo(userId: number): Promise<any> {
  console.log(`\n🔍 Получение информации о пользователе ${userId}...`);
  
  const response = await makeApiRequest(`/api/v2/users/${userId}`);
  if (response.success) {
    console.log(`✅ Пользователь ${userId} найден:`, {
      id: response.data?.id,
      username: response.data?.username,
      tonBalance: response.data?.balance_ton,
      uniBalance: response.data?.balance_uni,
      currentBoostActive: response.data?.ton_boost_active
    });
    return response.data;
  } else {
    console.error(`❌ Ошибка получения пользователя ${userId}:`, response.error);
    return null;
  }
}

async function getAvailablePackages(): Promise<any[]> {
  console.log('\n📦 Получение доступных TON Boost пакетов...');
  
  const response = await makeApiRequest('/api/v2/boost/packages');
  if (response.success && response.data) {
    console.log(`✅ Найдено ${response.data.length} пакетов`);
    response.data.forEach((pkg: any) => {
      console.log(`  - ${pkg.name}: ${pkg.min_amount} TON, ставка: ${pkg.daily_rate}`);
    });
    return response.data;
  } else {
    console.error('❌ Ошибка получения пакетов:', response.error);
    return [];
  }
}

async function addBalanceToUser(userId: number, amount: number): Promise<boolean> {
  console.log(`\n💰 Добавление ${amount} TON пользователю ${userId}...`);
  
  const response = await makeApiRequest(`/api/v2/wallet/add-balance`, 'POST', {
    userId,
    amount,
    currency: 'TON',
    reason: 'Manual TON Boost activation preparation'
  });
  
  if (response.success) {
    console.log(`✅ Баланс успешно добавлен пользователю ${userId}`);
    return true;
  } else {
    console.error(`❌ Ошибка добавления баланса пользователю ${userId}:`, response.error);
    return false;
  }
}

async function purchaseBoostPackage(userId: number, packageId: number): Promise<boolean> {
  console.log(`\n🚀 Покупка TON Boost пакета ${packageId} для пользователя ${userId}...`);
  
  const response = await makeApiRequest(`/api/v2/boost/purchase`, 'POST', {
    userId: userId.toString(),
    boostId: packageId.toString(),
    paymentMethod: 'internal_balance'
  });
  
  if (response.success) {
    console.log(`✅ TON Boost пакет успешно куплен для пользователя ${userId}`);
    console.log('📊 Результат покупки:', {
      message: response.message,
      hasBalanceUpdate: !!response.data?.balanceUpdate
    });
    return true;
  } else {
    console.error(`❌ Ошибка покупки пакета для пользователя ${userId}:`, response.error || response.message);
    return false;
  }
}

async function verifyActivation(userId: number): Promise<void> {
  console.log(`\n🔍 Проверка активации для пользователя ${userId}...`);
  
  // Проверяем статус через API
  const userInfo = await getUserInfo(userId);
  if (!userInfo) return;
  
  // Проверяем активные бусты
  const boostResponse = await makeApiRequest(`/api/v2/boost/user/${userId}/active`);
  
  console.log(`📊 Результаты проверки для пользователя ${userId}:`);
  console.log(`  TON Boost активен: ${userInfo.ton_boost_active}`);
  console.log(`  Текущий пакет: ${userInfo.ton_boost_package || 'Нет'}`);
  console.log(`  Ставка: ${userInfo.ton_boost_rate || 'Нет'}`);
  console.log(`  Активные бусты через API: ${boostResponse.success ? 'Найдены' : 'Не найдены'}`);
  
  const isActivated = userInfo.ton_boost_active === true && userInfo.ton_boost_package;
  console.log(`${isActivated ? '✅' : '❌'} Статус активации: ${isActivated ? 'УСПЕШНО' : 'НЕПОЛНАЯ'}`);
}

async function processUser(userId: number, targetPackageId: number): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 ОБРАБОТКА ПОЛЬЗОВАТЕЛЯ ${userId}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // 1. Получаем информацию о пользователе
    const userInfo = await getUserInfo(userId);
    if (!userInfo) return false;
    
    // 2. Проверяем, нужно ли добавить баланс
    const currentBalance = parseFloat(userInfo.balance_ton || '0');
    const requiredBalance = 2; // 2 TON для пакета
    
    if (currentBalance < requiredBalance) {
      const needToAdd = requiredBalance - currentBalance + 0.1; // Небольшой запас
      console.log(`💳 У пользователя ${userId} недостаточно TON (${currentBalance}), добавляем ${needToAdd}`);
      
      const balanceAdded = await addBalanceToUser(userId, needToAdd);
      if (!balanceAdded) return false;
    } else {
      console.log(`💰 У пользователя ${userId} достаточно TON (${currentBalance})`);
    }
    
    // 3. Покупаем буст пакет
    const purchaseSuccess = await purchaseBoostPackage(userId, targetPackageId);
    if (!purchaseSuccess) return false;
    
    // 4. Проверяем результат
    await verifyActivation(userId);
    
    console.log(`✅ Пользователь ${userId} успешно обработан`);
    return true;
    
  } catch (error) {
    console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 === АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  
  // Проверяем доступность API
  console.log('\n🔌 Проверка подключения к API...');
  const healthCheck = await makeApiRequest('/api/v2/');
  if (!healthCheck.success) {
    console.error('❌ API недоступен. Убедитесь что сервер запущен на localhost:3000');
    return;
  }
  console.log('✅ API доступен');
  
  // Получаем доступные пакеты
  const packages = await getAvailablePackages();
  if (packages.length === 0) {
    console.error('❌ Нет доступных пакетов');
    return;
  }
  
  // Находим подходящий пакет для 2 TON
  const suitablePackage = packages.find(pkg => pkg.min_amount <= 2);
  if (!suitablePackage) {
    console.error('❌ Нет пакетов подходящих для 2 TON');
    return;
  }
  
  console.log(`\n📦 Будет использован пакет: ${suitablePackage.name} (ID: ${suitablePackage.id})`);
  
  const targetUsers = [251, 255];
  const results: { userId: number; success: boolean }[] = [];
  
  // Обрабатываем каждого пользователя
  for (const userId of targetUsers) {
    const success = await processUser(userId, suitablePackage.id);
    results.push({ userId, success });
  }
  
  // Итоговый отчет
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
  console.log(`${'='.repeat(60)}`);
  
  results.forEach(({ userId, success }) => {
    console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : 'ОШИБКА'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Результат: ${successCount}/${results.length} пользователей активированы`);
  
  if (successCount === results.length) {
    console.log('🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!');
  } else {
    console.log('⚠️ Некоторые активации не удались');
  }
}

main().catch(console.error);