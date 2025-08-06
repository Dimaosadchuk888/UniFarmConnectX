#!/usr/bin/env tsx
/**
 * Скрипт верификации TON депозитов в блокчейне
 * Опциональная проверка существования транзакций
 */

import { supabase } from '../core/supabase';
import { logger } from '../server/logger';
import { Api, HttpClient } from 'tonapi-sdk-js';

// Инициализация TonAPI (использует бесплатный публичный ключ если нет своего)
const TONAPI_KEY = process.env.TONAPI_KEY || 'AF3VKVIYB27V32AAAANH3TJXYXPK3GY6OQXE32MFXMADBWNLYVNNPAFPPRMKUOS7X55TH3Y';
const tonApiClient = new Api(new HttpClient({
  baseUrl: 'https://tonapi.io',
  baseApiParams: {
    headers: {
      'X-API-Key': TONAPI_KEY,
      'Content-Type': 'application/json'
    }
  }
}));

interface UnverifiedDeposit {
  id: number;
  user_id: number;
  amount_ton: string;
  tx_hash_unique: string;
  created_at: string;
  metadata: any;
}

async function verifyDeposits(): Promise<void> {
  console.log('🔍 Начинаем верификацию TON депозитов в блокчейне...\n');

  try {
    // Получаем последние 100 TON депозитов для проверки
    const { data: deposits, error: depositsError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, tx_hash_unique, created_at, metadata')
      .eq('type', 'TON_DEPOSIT')
      .not('tx_hash_unique', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (depositsError) {
      throw new Error(`Ошибка получения депозитов: ${depositsError.message}`);
    }

    if (!deposits || deposits.length === 0) {
      console.log('✅ Нет депозитов для верификации');
      return;
    }

    console.log(`📊 Проверяем ${deposits.length} последних депозитов\n`);

    const unverified: UnverifiedDeposit[] = [];
    const verified: UnverifiedDeposit[] = [];
    const suspicious: UnverifiedDeposit[] = [];
    let skipped = 0;

    for (const deposit of deposits) {
      const hash = deposit.tx_hash_unique;
      
      // Пропускаем хэши длиной 64 символа (вероятно SHA256)
      if (hash.length === 64) {
        suspicious.push(deposit);
        continue;
      }

      // Пропускаем старые транзакции (старше 7 дней)
      const txDate = new Date(deposit.created_at);
      const daysSinceCreation = (Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        skipped++;
        continue;
      }

      try {
        // Пытаемся найти транзакцию в блокчейне
        // Примечание: это упрощенная проверка, в реальности нужно учитывать адрес кошелька
        const response = await tonApiClient.blockchain.getBlockchainRawTransaction(hash);
        
        if (response) {
          verified.push(deposit);
        } else {
          unverified.push(deposit);
        }
      } catch (error) {
        // Если транзакция не найдена, API вернет ошибку
        if (error instanceof Error && error.message.includes('404')) {
          unverified.push(deposit);
        } else {
          console.warn(`⚠️ Ошибка проверки транзакции ${deposit.id}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Задержка чтобы не перегружать API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Выводим результаты
    console.log('\n📈 РЕЗУЛЬТАТЫ ВЕРИФИКАЦИИ:\n');
    console.log(`✅ Подтверждено в блокчейне: ${verified.length}`);
    console.log(`❌ НЕ найдено в блокчейне: ${unverified.length}`);
    console.log(`⚠️ Подозрительные хэши (SHA256): ${suspicious.length}`);
    console.log(`⏭️ Пропущено (старые): ${skipped}`);

    if (unverified.length > 0) {
      console.log('\n❌ Депозиты НЕ найденные в блокчейне:');
      console.table(unverified.slice(0, 10).map(d => ({
        'ID': d.id,
        'User ID': d.user_id,
        'Amount': d.amount_ton,
        'Hash': d.tx_hash_unique.substring(0, 16) + '...',
        'Date': new Date(d.created_at).toLocaleDateString(),
        'Manual Review': d.metadata?.requires_manual_review || false
      })));

      if (unverified.length > 10) {
        console.log(`... и еще ${unverified.length - 10} транзакций`);
      }

      // Логируем для последующего анализа
      logger.warn('[DepositVerification] Найдены неверифицированные депозиты:', {
        count: unverified.length,
        total_amount: unverified.reduce((sum, d) => sum + parseFloat(d.amount_ton), 0),
        deposit_ids: unverified.map(d => d.id)
      });
    }

    if (suspicious.length > 0) {
      console.log('\n⚠️ Депозиты с подозрительными SHA256 хэшами:');
      console.table(suspicious.slice(0, 10).map(d => ({
        'ID': d.id,
        'User ID': d.user_id,
        'Amount': d.amount_ton,
        'Hash': d.tx_hash_unique.substring(0, 16) + '...',
        'Date': new Date(d.created_at).toLocaleDateString()
      })));

      if (suspicious.length > 10) {
        console.log(`... и еще ${suspicious.length - 10} транзакций`);
      }
    }

    // Рекомендации
    if (unverified.length > 0 || suspicious.length > 0) {
      console.log('\n📝 РЕКОМЕНДАЦИИ:');
      if (unverified.length > 0) {
        console.log('1. Проверьте депозиты с пометкой requires_manual_review');
        console.log('2. Убедитесь что хэши корректно извлекаются из BOC');
      }
      if (suspicious.length > 0) {
        console.log('3. SHA256 хэши указывают на использование fallback - эти депозиты требуют ручной проверки');
        console.log('4. Рекомендуется восстановить правильные хэши из BOC данных если они сохранены');
      }
    } else {
      console.log('✅ Все проверенные депозиты корректны!');
    }

    console.log('\n✅ Верификация завершена');

  } catch (error) {
    console.error('❌ Критическая ошибка при верификации:', error);
    logger.error('[DepositVerification] Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск верификации
verifyDeposits()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Неожиданная ошибка:', error);
    process.exit(1);
  });