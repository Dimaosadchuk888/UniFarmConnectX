/**
 * simpleTonTransaction.ts
 * Упрощенная служба для работы с TON транзакциями без использования Buffer
 */

import {
  TonConnectUI,
  UserRejectsError,
  WalletNotConnectedError
} from '@tonconnect/ui-react';

import { 
  createSimpleBase64Payload,
  createSimpleTextCellPayload
} from './simplePayloadService';

// Добавляем импорт BigNumber для конвертации сумм TON
import BigNumber from 'bignumber.js';

// Для отладки
const DEBUG_ENABLED = true;
function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    console.log('[TON_CONNECT_DEBUG]', ...args);
  }
}

// Адрес TON кошелька проекта
export const TON_PROJECT_ADDRESS = 'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';

/**
 * Проверяет, подключен ли в данный момент TON кошелек
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export function isTonWalletConnected(tonConnectUI: TonConnectUI): boolean {
  if (!tonConnectUI) {
    console.error('TonConnectUI is not provided to isTonWalletConnected');
    return false;
  }
  return tonConnectUI.connected;
}

/**
 * Подключает TON кошелек, если он не подключен
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export async function connectTonWallet(tonConnectUI: TonConnectUI): Promise<boolean> {
  try {
    debugLog('connectTonWallet called with', { tonConnectUI: !!tonConnectUI });
    
    if (!tonConnectUI) {
      console.error('Error: tonConnectUI is undefined in connectTonWallet');
      return false;
    }
    
    // Проверяем, доступен ли метод connectWallet
    if (typeof tonConnectUI.connectWallet !== 'function') {
      console.error('Error: tonConnectUI.connectWallet is not a function');
      return false;
    }
    
    // Проверяем текущее состояние подключения
    debugLog('Current connection state:', { connected: tonConnectUI.connected });
    
    if (!tonConnectUI.connected) {
      debugLog('Attempting to connect wallet...');
      // Вызываем соединение с кошельком
      await tonConnectUI.connectWallet();
      
      // Проверяем состояние после попытки подключения
      debugLog('Connection result:', { connected: tonConnectUI.connected, wallet: tonConnectUI.wallet });
      
      return tonConnectUI.connected;
    }
    
    debugLog('Wallet already connected');
    return true;
  } catch (error) {
    console.error('Error connecting TON wallet:', error);
    return false;
  }
}

/**
 * Отключает TON кошелек
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export async function disconnectTonWallet(tonConnectUI: TonConnectUI): Promise<void> {
  if (tonConnectUI && tonConnectUI.connected) {
    await tonConnectUI.disconnect();
  }
}

/**
 * Получает адрес подключенного TON кошелька
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export function getTonWalletAddress(tonConnectUI: TonConnectUI): string | null {
  if (tonConnectUI && tonConnectUI.connected && tonConnectUI.account) {
    return tonConnectUI.account.address;
  }
  
  return null;
}

/**
 * Создает строку комментария для TON транзакции в формате UniFarmBoost:userId:boostId
 */
export function createTonTransactionComment(userId: number, boostId: number): string {
  return `UniFarmBoost:${userId}:${boostId}`;
}

/**
 * Отправляет TON транзакцию без использования Buffer
 * Использует упрощенный метод кодирования для совместимости с Telegram Mini App
 * 
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @param amount Сумма TON (в базовых единицах, 1 TON = 10^9 nanoTON)
 * @param comment Комментарий к транзакции
 * @returns Результат транзакции или null в случае ошибки
 */
export async function sendTonTransaction(
  tonConnectUI: TonConnectUI,
  amount: string,
  comment: string
): Promise<{txHash: string; status: 'success' | 'error'} | null> {
  try {
    // Извлекаем userId и boostId из комментария (примем что комментарий в формате UniFarmBoost:userId:boostId)
    const parts = comment.split(':');
    const userId = parts.length > 1 ? parts[1] : '1';
    const boostId = parts.length > 2 ? parts[2] : '1';
    
    // Добавляем максимально заметный лог для отладки
    console.log("===============================================================");
    console.log("🔴 ВЫЗОВ sendTonTransaction ПО НОВОМУ ТЗ");
    console.log("🔴 СУММА:", amount, "TON");
    console.log("🔴 КОММЕНТАРИЙ:", comment);
    console.log("🔴 tonConnectUI:", tonConnectUI ? "ПРИСУТСТВУЕТ" : "ОТСУТСТВУЕТ");
    console.log("🔴 ПОДКЛЮЧЕН:", tonConnectUI?.connected ? "ДА" : "НЕТ");
    console.log("🔴 АДРЕС КОШЕЛЬКА:", tonConnectUI?.account?.address || "НЕТ АДРЕСА");
    console.log("🔴 ФУНКЦИЯ sendTransaction:", typeof tonConnectUI?.sendTransaction === 'function' ? "ДОСТУПНА" : "НЕДОСТУПНА");
    console.log("===============================================================");
    
    // Проверяем наличие tonConnectUI
    if (!tonConnectUI) {
      console.error('[ERROR] tonConnectUI is null or undefined');
      throw new Error('TonConnectUI is not initialized');
    }
    
    // Проверяем подключение кошелька
    if (!tonConnectUI.connected) {
      console.log('[INFO] Кошелек не подключен, пытаемся подключить...');
      await connectTonWallet(tonConnectUI);
      
      if (!tonConnectUI.connected) {
        console.error('[ERROR] Не удалось подключить кошелек');
        throw new WalletNotConnectedError();
      }
    }
    
    // ИСПРАВЛЕНИЕ ПО ТЗ: Конвертируем TON в nanoTON
    // Сначала проверяем, что amount является строкой с десятичным числом
    const tonAmount = parseFloat(amount);
    if (isNaN(tonAmount)) {
      console.error('[ERROR] Невалидная сумма TON:', amount);
      throw new Error('Невалидная сумма TON');
    }
    
    // ПО ТЗ: Умножаем на 1e9 и преобразуем в строку через BigInt для точности
    const nanoTonAmount = (BigInt(tonAmount * 1e9)).toString();
    
    // Добавляем логирование по ТЗ
    console.log("[TON] Сумма в TON:", amount);
    console.log("[TON] Сумма в nanoTON:", nanoTonAmount);
    
    // Генерируем простой комментарий без бинарного форматирования
    // Форма: UniFarmBoost:userId:boostId
    const commentText = `UniFarmBoost:${userId}:${boostId}`;
    
    // Создаем транзакцию без использования payload
    // В этой версии просто передаем адрес и сумму, без комментария,
    // чтобы минимизировать потенциальные проблемы с Buffer
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут
      messages: [
        {
          address: TON_PROJECT_ADDRESS, // UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8
          amount: nanoTonAmount, // ПО ТЗ: Используем nanoTonAmount вместо tonAmount
          // Убираем payload для тестирования базовой функциональности
        }
      ]
    };
    
    // ПО ТЗ: Добавляем дополнительный лог для проверки значения amount перед отправкой
    console.log("[TON] Сумма в nanoTON перед отправкой:", nanoTonAmount);
    
    console.log("[DEBUG] Sending simplified transaction without payload:", transaction);
    
    try {
      // Двойная проверка подключения перед отправкой
      if (!tonConnectUI.connected) {
        console.log('[INFO] Кошелек не подключен непосредственно перед транзакцией, пытаемся подключить...');
        await connectTonWallet(tonConnectUI);
        
        if (!tonConnectUI.connected) {
          console.error('[ERROR] Не удалось подключить кошелек перед отправкой транзакции');
          throw new WalletNotConnectedError('Не удалось подключить кошелёк перед транзакцией');
        }
      }
      
      // Отправляем упрощенную транзакцию без payload
      console.log("[TON] Отправляем упрощенную транзакцию через TonConnect...");
      
      const result = await tonConnectUI.sendTransaction(transaction);
      debugLog('*** РЕЗУЛЬТАТ sendTransaction ***', result);
      
      // Добавляем лог результата транзакции
      console.log("✅ Transaction result:", result);
      
      return {
        txHash: result.boc || '',
        status: 'success'
      };
    } catch (error) {
      const txError = error as Error; // Типизируем ошибку как Error для доступа к свойствам
      
      console.error('ОШИБКА при вызове sendTransaction:', { 
        errorType: typeof error,
        errorName: txError.name,
        errorMessage: txError.message,
        errorStack: txError.stack?.substring(0, 100) // Показываем только начало стека
      });
      
      // Классифицируем ошибку для более детального логирования
      if (error instanceof UserRejectsError) {
        console.log('Пользователь отклонил транзакцию в кошельке');
      }
      else if (error instanceof WalletNotConnectedError) {
        console.log('Ошибка: кошелек не подключен');
      }
      else {
        console.log('Неизвестная ошибка при отправке транзакции', {
          errorToString: String(error),
          errorJSON: JSON.stringify(error)
        });
      }
      
      throw error;  // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Error sending TON transaction:', error);
    
    if (error instanceof UserRejectsError) {
      return {
        txHash: '',
        status: 'error'
      };
    }
    
    return null;
  }
}

/**
 * Проверка, все ли готово для отправки TON транзакции
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @returns true если TonConnect готов к использованию
 */
export function isTonPaymentReady(tonConnectUI: TonConnectUI): boolean {
  // Подробное логирование для отладки
  const hasConnectUI = !!tonConnectUI;
  const hasSendTransaction = hasConnectUI && typeof tonConnectUI.sendTransaction === 'function';
  const isConnected = hasConnectUI && !!tonConnectUI.connected;
  const hasWallet = hasConnectUI && !!tonConnectUI.wallet;
  const hasAccount = hasConnectUI && !!tonConnectUI.account;
  const hasAddress = hasAccount && !!tonConnectUI.account?.address;
  
  // Более строгая проверка - требуем наличие подключенного кошелька и аккаунта
  const isReady = hasConnectUI && hasSendTransaction && isConnected && hasWallet && hasAccount && hasAddress;
  
  // По ТЗ временно отключаем проверку и принудительно возвращаем true
  // для диагностики проблемы с вызовом sendTransaction
  console.log('[DEBUG] ⚠️ ПРОВЕРКА isTonPaymentReady ОТКЛЮЧЕНА ПО ТЗ, ВОЗВРАЩАЕМ TRUE ДЛЯ ДИАГНОСТИКИ');
  return true; // Всегда возвращаем true для тестирования sendTransaction
}

// Для совместимости со старым кодом
export const isWalletConnected = isTonWalletConnected;
export const getWalletAddress = getTonWalletAddress;
export const connectWallet = connectTonWallet;
export const disconnectWallet = disconnectTonWallet;