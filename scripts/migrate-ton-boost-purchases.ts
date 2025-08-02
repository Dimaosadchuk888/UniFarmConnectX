import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTonBoostPurchases() {
  console.log('🚀 Начинаем миграцию TON Boost покупок...');
  
  try {
    // Получаем все транзакции типа BOOST_PURCHASE
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BOOST_PURCHASE')
      .eq('currency', 'TON')
      .order('created_at', { ascending: true });

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
      return;
    }

    console.log(`📊 Найдено ${transactions?.length || 0} транзакций BOOST_PURCHASE`);

    if (!transactions || transactions.length === 0) {
      console.log('✅ Нет транзакций для миграции');
      return;
    }

    // Группируем транзакции по пользователям
    const userTransactions = new Map<number, any[]>();
    for (const tx of transactions) {
      const userId = tx.user_id;
      if (!userTransactions.has(userId)) {
        userTransactions.set(userId, []);
      }
      userTransactions.get(userId)!.push(tx);
    }

    console.log(`👥 Найдено пользователей с покупками: ${userTransactions.size}`);

    // Обрабатываем каждого пользователя
    for (const [userId, userTxs] of userTransactions) {
      console.log(`\n🔄 Обработка пользователя ${userId}: ${userTxs.length} транзакций`);
      
      // Получаем текущие данные пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('ton_boost_package, ton_farming_balance')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error(`❌ Ошибка получения данных пользователя ${userId}:`, userError);
        continue;
      }

      // Обрабатываем каждую транзакцию
      for (const tx of userTxs) {
        const amount = Math.abs(parseFloat(tx.amount || '0'));
        if (amount === 0) continue;

        // Определяем пакет на основе суммы или описания
        let packageId = 1;
        let packageName = 'Starter Boost';
        let rate = 0.01; // 1%

        // Пытаемся извлечь информацию из описания
        const description = tx.description || '';
        if (description.includes('Standard Boost') || amount >= 300) {
          packageId = 2;
          packageName = 'Standard Boost';
          rate = 0.015; // 1.5%
        } else if (description.includes('Premium Boost') || amount >= 1000) {
          packageId = 3;
          packageName = 'Premium Boost';
          rate = 0.02; // 2%
        } else if (description.includes('Elite Boost') || amount >= 5000) {
          packageId = 4;
          packageName = 'Elite Boost';
          rate = 0.025; // 2.5%
        }

        const dailyIncome = amount * rate;
        const expiresAt = new Date(tx.created_at);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // +1 год

        // Проверяем, нет ли уже такой записи
        const { data: existing } = await supabase
          .from('ton_boost_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('amount', amount.toString())
          .eq('created_at', tx.created_at)
          .single();

        if (existing) {
          console.log(`⚠️  Пропускаем дубликат для пользователя ${userId}, сумма: ${amount}`);
          continue;
        }

        // Создаем запись в ton_boost_purchases
        const { error: insertError } = await supabase
          .from('ton_boost_purchases')
          .insert({
            user_id: userId,
            package_id: packageId,
            package_name: packageName,
            amount: amount.toString(),
            rate: rate.toString(),
            daily_income: dailyIncome.toString(),
            payment_method: 'wallet',
            tx_hash: tx.tx_hash,
            status: 'active',
            purchased_at: tx.created_at,
            expires_at: expiresAt.toISOString(),
            created_at: tx.created_at
          });

        if (insertError) {
          console.error(`❌ Ошибка создания записи для пользователя ${userId}:`, insertError);
        } else {
          console.log(`✅ Создана запись: пользователь ${userId}, пакет "${packageName}", сумма ${amount} TON`);
        }
      }
    }

    // Проверяем результаты миграции
    const { count } = await supabase
      .from('ton_boost_purchases')
      .select('*', { count: 'exact', head: true });

    console.log(`\n✨ Миграция завершена! Всего записей в ton_boost_purchases: ${count}`);

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
  }
}

// Запускаем миграцию
migrateTonBoostPurchases().catch(console.error);