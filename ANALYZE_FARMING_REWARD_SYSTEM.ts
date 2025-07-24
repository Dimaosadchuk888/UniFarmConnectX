#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

console.log('\n🔍 АНАЛИЗ СИСТЕМЫ FARMING_REWARD');
console.log('='.repeat(60));

async function analyzeFarmingRewardSystem() {
  try {
    // 1. Анализ всех FARMING_REWARD транзакций
    console.log('\n1️⃣ СТАТИСТИКА FARMING_REWARD ТРАНЗАКЦИЙ');
    console.log('-'.repeat(50));
    
    const { data: farmingRewards, error: farmingError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, amount_uni, description, metadata, created_at')
      .eq('type', 'FARMING_REWARD')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!farmingError && farmingRewards) {
      console.log(`📊 Всего FARMING_REWARD за последние 24 часа: ${farmingRewards.length}`);
      
      // Группируем по типам описания
      const descriptionTypes = new Map<string, number>();
      const tonRewards = [];
      const uniRewards = [];
      
      farmingRewards.forEach(tx => {
        // Анализируем описание для выявления подтипов
        const desc = tx.description?.toLowerCase() || '';
        let category = 'Другое';
        
        if (desc.includes('ton boost') || desc.includes('тон буст')) {
          category = 'TON Boost доход';
          tonRewards.push(tx);
        } else if (desc.includes('uni farming') || desc.includes('уни фарминг')) {
          category = 'UNI Farming доход';
          uniRewards.push(tx);
        } else if (desc.includes('referral') || desc.includes('реферал')) {
          category = 'Referral доход';
        } else if (desc.includes('deposit') || desc.includes('депозит')) {
          category = 'Депозит (через FARMING_REWARD)';
          if (parseFloat(tx.amount_ton || '0') > 0) {
            tonRewards.push(tx);
          }
        }
        
        descriptionTypes.set(category, (descriptionTypes.get(category) || 0) + 1);
      });
      
      console.log('\n📋 ПОДТИПЫ FARMING_REWARD ПО ОПИСАНИЮ:');
      Array.from(descriptionTypes.entries())
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      
      console.log(`\n💰 TON-связанные FARMING_REWARD: ${tonRewards.length}`);
      console.log(`🌾 UNI-связанные FARMING_REWARD: ${uniRewards.length}`);
      
      // Показываем примеры TON транзакций
      if (tonRewards.length > 0) {
        console.log('\n🔍 ПРИМЕРЫ TON FARMING_REWARD:');
        tonRewards.slice(0, 5).forEach(tx => {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
          console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
          console.log(`      Описание: ${tx.description}`);
          console.log(`      Metadata: ${JSON.stringify(metadata).substring(0, 80)}...`);
          console.log(`      Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
          console.log('');
        });
      }
    }

    // 2. Анализ metadata.original_type
    console.log('\n2️⃣ АНАЛИЗ METADATA.ORIGINAL_TYPE В FARMING_REWARD');
    console.log('-'.repeat(50));
    
    const { data: metadataAnalysis, error: metaError } = await supabase
      .from('transactions')
      .select('id, description, metadata, amount_ton, amount_uni')
      .eq('type', 'FARMING_REWARD')
      .not('metadata', 'is', null)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    if (!metaError && metadataAnalysis) {
      const originalTypes = new Map<string, number>();
      const tonDepositCandidates = [];
      
      metadataAnalysis.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        
        if (metadata.original_type) {
          originalTypes.set(metadata.original_type, (originalTypes.get(metadata.original_type) || 0) + 1);
          
          if (metadata.original_type === 'TON_DEPOSIT') {
            tonDepositCandidates.push(tx);
          }
        }
      });
      
      console.log('📊 СТАТИСТИКА METADATA.ORIGINAL_TYPE:');
      Array.from(originalTypes.entries())
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      
      if (tonDepositCandidates.length > 0) {
        console.log(`\n💎 НАЙДЕНО ${tonDepositCandidates.length} FARMING_REWARD С ORIGINAL_TYPE = 'TON_DEPOSIT':`);
        tonDepositCandidates.forEach(tx => {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
          console.log(`   ID: ${tx.id}, Amount: ${tx.amount_ton} TON, TX_Hash: ${metadata.tx_hash?.substring(0, 20)}...`);
          console.log(`      Описание: ${tx.description}`);
          console.log('');
        });
      }
    }

    // 3. Сравнение FARMING_REWARD vs DEPOSIT
    console.log('\n3️⃣ СРАВНЕНИЕ FARMING_REWARD VS DEPOSIT ТРАНЗАКЦИЙ');
    console.log('-'.repeat(50));
    
    const { data: depositTransactions, error: depositError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, metadata, created_at')
      .eq('type', 'DEPOSIT')
      .gt('amount_ton', 0.01)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!depositError && depositTransactions) {
      console.log(`💰 Найдено ${depositTransactions.length} реальных DEPOSIT транзакций:`);
      
      depositTransactions.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
        console.log(`      TX_Hash: ${metadata.tx_hash?.substring(0, 30)}...`);
        console.log(`      Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log('');
      });
      
      // Проверяем есть ли соответствующие FARMING_REWARD записи
      const depositUserIds = depositTransactions.map(tx => tx.user_id);
      const { data: correspondingFarming, error: corrError } = await supabase
        .from('transactions')
        .select('id, user_id, amount_ton, description, metadata')
        .eq('type', 'FARMING_REWARD')
        .in('user_id', depositUserIds)
        .gt('amount_ton', 0.01)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!corrError && correspondingFarming) {
        console.log(`🔗 Соответствующие FARMING_REWARD для этих пользователей: ${correspondingFarming.length}`);
        correspondingFarming.forEach(tx => {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
          if (metadata.original_type === 'TON_DEPOSIT' || tx.description?.includes('deposit')) {
            console.log(`   СООТВЕТСТВИЕ: ID ${tx.id}, User ${tx.user_id}, ${tx.amount_ton} TON - ${tx.description}`);
          }
        });
      }
    }

    // 4. Анализ UnifiedTransactionService маппинга
    console.log('\n4️⃣ АНАЛИЗ UNIFIED TRANSACTION SERVICE ЛОГИКИ');
    console.log('-'.repeat(50));
    
    console.log('📋 ТЕКУЩИЙ МАППИНГ (из core/TransactionService.ts):');
    console.log("   'TON_DEPOSIT': 'FARMING_REWARD'");
    console.log("   'UNI_DEPOSIT': 'FARMING_REWARD'");
    console.log("   'TON_BOOST_INCOME': 'FARMING_REWARD'");
    console.log("   'BOOST_PURCHASE': 'FARMING_REWARD'");
    
    console.log('\n🤔 ВОПРОС: Должны ли TON депозиты быть FARMING_REWARD или DEPOSIT?');
    console.log('💡 АНАЛИЗ:');
    console.log('   ✅ FARMING_REWARD содержит TON доходы и депозиты');
    console.log('   ✅ Metadata.original_type позволяет различать подтипы');
    console.log('   ❌ DEPOSIT содержит реальные blockchain пополнения');
    console.log('   ❌ Возможно дублирование одного депозита в двух типах');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

analyzeFarmingRewardSystem();
