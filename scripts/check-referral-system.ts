/**
 * Скрипт для проверки реферальных связей и начислений в базе данных
 * Только анализ, никаких изменений в БД
 */

import { supabase } from '../core/supabase';
import * as logger from '../utils/logger';

interface ReferralAnalysisReport {
  totalUsers: number;
  usersWithReferrers: number;
  usersWithReferralCode: number;
  referralChains: {
    complete: number;
    broken: number;
    orphaned: number;
    cycles: number;
  };
  referralTable: {
    totalRecords: number;
    byLevel: Record<number, number>;
    withRewards: number;
    totalRewardsUni: string;
    totalRewardsTon: string;
  };
  referralEarnings: {
    totalRecords: number;
    byLevel: Record<number, { count: number; totalAmount: string }>;
    byCurrency: {
      UNI: { count: number; totalAmount: string };
      TON: { count: number; totalAmount: string };
    };
  };
  transactions: {
    referralRewards: number;
    totalAmountUni: string;
    totalAmountTon: string;
  };
  anomalies: string[];
  recommendations: string[];
}

class ReferralSystemAnalyzer {
  private report: ReferralAnalysisReport = {
    totalUsers: 0,
    usersWithReferrers: 0,
    usersWithReferralCode: 0,
    referralChains: {
      complete: 0,
      broken: 0,
      orphaned: 0,
      cycles: 0
    },
    referralTable: {
      totalRecords: 0,
      byLevel: {},
      withRewards: 0,
      totalRewardsUni: '0',
      totalRewardsTon: '0'
    },
    referralEarnings: {
      totalRecords: 0,
      byLevel: {},
      byCurrency: {
        UNI: { count: 0, totalAmount: '0' },
        TON: { count: 0, totalAmount: '0' }
      }
    },
    transactions: {
      referralRewards: 0,
      totalAmountUni: '0',
      totalAmountTon: '0'
    },
    anomalies: [],
    recommendations: []
  };

  async analyze(): Promise<void> {
    logger.log('[ReferralAnalyzer] Начинаем анализ реферальной системы...');

    try {
      // 1. Анализ таблицы users
      await this.analyzeUsersTable();

      // 2. Анализ таблицы referrals
      await this.analyzeReferralsTable();

      // 3. Анализ таблицы referral_earnings
      await this.analyzeReferralEarningsTable();

      // 4. Анализ транзакций типа REFERRAL_REWARD
      await this.analyzeTransactions();

      // 5. Проверка целостности реферальных цепочек
      await this.checkReferralChainIntegrity();

      // 6. Проверка корректности процентов начислений
      await this.validateCommissionRates();

      // 7. Формирование отчета
      this.generateReport();

    } catch (error) {
      logger.error('[ReferralAnalyzer] Ошибка анализа:', error);
      throw error;
    }
  }

  private async analyzeUsersTable(): Promise<void> {
    logger.info('[ReferralAnalyzer] Анализ таблицы users...');

    // Общее количество пользователей
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    this.report.totalUsers = totalUsers || 0;

    // Пользователи с реферерами
    const { count: usersWithReferrers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);

    this.report.usersWithReferrers = usersWithReferrers || 0;

    // Пользователи с реферальными кодами
    const { count: usersWithReferralCode } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('ref_code', 'is', null);

    this.report.usersWithReferralCode = usersWithReferralCode || 0;

    // Проверка на несоответствия
    const { data: usersData } = await supabase
      .from('users')
      .select('id, ref_code, parent_ref_code, referred_by');

    if (usersData) {
      // Проверка на пользователей без ref_code
      const usersWithoutRefCode = usersData.filter(u => !u.ref_code);
      if (usersWithoutRefCode.length > 0) {
        this.report.anomalies.push(
          `Найдено ${usersWithoutRefCode.length} пользователей без ref_code: ${usersWithoutRefCode.map(u => u.id).join(', ')}`
        );
      }

      // Проверка на циклические ссылки
      const referralMap = new Map<number, number>();
      usersData.forEach(user => {
        if (user.referred_by) {
          referralMap.set(user.id, user.referred_by);
        }
      });

      for (const [userId, referrerId] of referralMap) {
        if (this.checkForCycle(userId, referralMap)) {
          this.report.referralChains.cycles++;
        }
      }
    }
  }

  private async analyzeReferralsTable(): Promise<void> {
    logger.info('[ReferralAnalyzer] Анализ таблицы referrals...');

    // Общее количество записей
    const { count: totalRecords } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    this.report.referralTable.totalRecords = totalRecords || 0;

    // Получаем все записи для детального анализа
    const { data: referralsData } = await supabase
      .from('referrals')
      .select('*');

    if (referralsData) {
      // Анализ по уровням
      for (const referral of referralsData) {
        const level = referral.level;
        this.report.referralTable.byLevel[level] = (this.report.referralTable.byLevel[level] || 0) + 1;

        // Подсчет наград
        const rewardUni = parseFloat(referral.reward_uni || '0');
        const rewardTon = parseFloat(referral.reward_ton || '0');

        if (rewardUni > 0 || rewardTon > 0) {
          this.report.referralTable.withRewards++;
        }

        this.report.referralTable.totalRewardsUni = (
          parseFloat(this.report.referralTable.totalRewardsUni) + rewardUni
        ).toString();

        this.report.referralTable.totalRewardsTon = (
          parseFloat(this.report.referralTable.totalRewardsTon) + rewardTon
        ).toString();
      }

      // Проверка корректности ref_path
      for (const referral of referralsData) {
        if (referral.ref_path && Array.isArray(referral.ref_path)) {
          if (referral.ref_path.length !== referral.level) {
            this.report.anomalies.push(
              `Несоответствие длины ref_path и level для записи ${referral.id}: длина пути ${referral.ref_path.length}, level ${referral.level}`
            );
          }
        }
      }
    }
  }

  private async analyzeReferralEarningsTable(): Promise<void> {
    logger.info('[ReferralAnalyzer] Анализ таблицы referral_earnings...');

    // Общее количество записей
    const { count: totalRecords } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact', head: true });

    this.report.referralEarnings.totalRecords = totalRecords || 0;

    // Получаем все записи для детального анализа
    const { data: earningsData } = await supabase
      .from('referral_earnings')
      .select('*');

    if (earningsData) {
      for (const earning of earningsData) {
        const level = earning.level;
        const amount = parseFloat(earning.amount);
        const currency = earning.currency;

        // По уровням
        if (!this.report.referralEarnings.byLevel[level]) {
          this.report.referralEarnings.byLevel[level] = { count: 0, totalAmount: '0' };
        }
        this.report.referralEarnings.byLevel[level].count++;
        this.report.referralEarnings.byLevel[level].totalAmount = (
          parseFloat(this.report.referralEarnings.byLevel[level].totalAmount) + amount
        ).toString();

        // По валютам
        if (currency === 'UNI' || currency === 'TON') {
          this.report.referralEarnings.byCurrency[currency].count++;
          this.report.referralEarnings.byCurrency[currency].totalAmount = (
            parseFloat(this.report.referralEarnings.byCurrency[currency].totalAmount) + amount
          ).toString();
        }
      }
    }
  }

  private async analyzeTransactions(): Promise<void> {
    logger.info('[ReferralAnalyzer] Анализ транзакций REFERRAL_REWARD...');

    // Получаем все реферальные транзакции
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_type', 'REFERRAL_REWARD');

    if (transactions) {
      this.report.transactions.referralRewards = transactions.length;

      for (const tx of transactions) {
        const amount = parseFloat(tx.amount || '0');
        if (tx.currency === 'UNI') {
          this.report.transactions.totalAmountUni = (
            parseFloat(this.report.transactions.totalAmountUni) + amount
          ).toString();
        } else if (tx.currency === 'TON') {
          this.report.transactions.totalAmountTon = (
            parseFloat(this.report.transactions.totalAmountTon) + amount
          ).toString();
        }
      }
    }
  }

  private async checkReferralChainIntegrity(): Promise<void> {
    logger.info('[ReferralAnalyzer] Проверка целостности реферальных цепочек...');

    const { data: users } = await supabase
      .from('users')
      .select('id, referred_by');

    if (users) {
      const userMap = new Map(users.map(u => [u.id, u]));

      for (const user of users) {
        if (user.referred_by) {
          // Проверка на существование реферера
          if (!userMap.has(user.referred_by)) {
            this.report.referralChains.orphaned++;
            this.report.anomalies.push(
              `Пользователь ${user.id} ссылается на несуществующего реферера ${user.referred_by}`
            );
          }

          // Проверка длины цепочки
          const chainLength = this.getChainLength(user.id, userMap);
          if (chainLength > 20) {
            this.report.anomalies.push(
              `Цепочка пользователя ${user.id} превышает 20 уровней: ${chainLength}`
            );
          }
        }
      }

      // Считаем полные цепочки
      const completeChains = users.filter(u => u.referred_by && userMap.has(u.referred_by)).length;
      this.report.referralChains.complete = completeChains;
      this.report.referralChains.broken = this.report.referralChains.orphaned;
    }
  }

  private async validateCommissionRates(): Promise<void> {
    logger.info('[ReferralAnalyzer] Проверка корректности процентов начислений...');

    // Ожидаемые проценты для каждого уровня
    const expectedRates = {
      1: 100,   // 100%
      2: 2,     // 2%
      3: 3,     // 3%
      4: 4,     // 4%
      5: 5,     // 5%
      6: 6,     // 6%
      7: 7,     // 7%
      8: 8,     // 8%
      9: 9,     // 9%
      10: 10,   // 10%
      11: 11,   // 11%
      12: 12,   // 12%
      13: 13,   // 13%
      14: 14,   // 14%
      15: 15,   // 15%
      16: 16,   // 16%
      17: 17,   // 17%
      18: 18,   // 18%
      19: 19,   // 19%
      20: 20    // 20%
    };

    // Получаем примеры начислений для проверки
    const { data: sampleEarnings } = await supabase
      .from('referral_earnings')
      .select('*')
      .limit(100);

    if (sampleEarnings && sampleEarnings.length > 0) {
      logger.info(`[ReferralAnalyzer] Проверяем ${sampleEarnings.length} примеров начислений...`);
      
      // Группируем по source_user_id для поиска связанных начислений
      const earningsBySource = new Map<number, typeof sampleEarnings>();
      for (const earning of sampleEarnings) {
        const sourceId = earning.source_user_id;
        if (!earningsBySource.has(sourceId)) {
          earningsBySource.set(sourceId, []);
        }
        earningsBySource.get(sourceId)!.push(earning);
      }

      // Проверяем соотношения между уровнями
      for (const [sourceId, earnings] of earningsBySource) {
        if (earnings.length > 1) {
          // Находим начисление первого уровня
          const level1Earning = earnings.find(e => e.level === 1);
          if (level1Earning) {
            const baseAmount = parseFloat(level1Earning.amount) / (expectedRates[1] / 100);
            
            // Проверяем другие уровни
            for (const earning of earnings) {
              if (earning.level !== 1) {
                const expectedAmount = baseAmount * (expectedRates[earning.level] / 100);
                const actualAmount = parseFloat(earning.amount);
                const deviation = Math.abs(expectedAmount - actualAmount) / expectedAmount * 100;
                
                if (deviation > 1) { // Допускаем 1% погрешность из-за округления
                  this.report.anomalies.push(
                    `Некорректный процент для уровня ${earning.level}: ожидается ${expectedAmount.toFixed(8)}, фактически ${actualAmount.toFixed(8)} (отклонение ${deviation.toFixed(2)}%)`
                  );
                }
              }
            }
          }
        }
      }
    }

    // Проверка общей нагрузки
    const totalPercentage = Object.values(expectedRates).reduce((sum, rate) => sum + rate, 0);
    logger.info(`[ReferralAnalyzer] Общая реферальная нагрузка: ${totalPercentage}%`);
    
    if (totalPercentage > 200) {
      this.report.recommendations.push(
        `ВНИМАНИЕ: Общая реферальная нагрузка составляет ${totalPercentage}%. Это может быть экономически неустойчиво в долгосрочной перспективе.`
      );
    }
  }

  private checkForCycle(startId: number, referralMap: Map<number, number>): boolean {
    const visited = new Set<number>();
    let current = startId;

    while (current && referralMap.has(current)) {
      if (visited.has(current)) {
        return true; // Найден цикл
      }
      visited.add(current);
      current = referralMap.get(current)!;
    }

    return false;
  }

  private getChainLength(userId: number, userMap: Map<number, any>): number {
    let length = 0;
    let current = userId;
    const visited = new Set<number>();

    while (current && userMap.has(current)) {
      if (visited.has(current)) {
        break; // Цикл
      }
      visited.add(current);
      
      const user = userMap.get(current);
      if (user.referred_by) {
        length++;
        current = user.referred_by;
      } else {
        break;
      }
    }

    return length;
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('ОТЧЕТ ПО РЕФЕРАЛЬНОЙ СИСТЕМЕ UNIFARM');
    console.log('='.repeat(80) + '\n');

    console.log('1. ОБЩАЯ СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ:');
    console.log(`   - Всего пользователей: ${this.report.totalUsers}`);
    console.log(`   - С реферерами (referred_by): ${this.report.usersWithReferrers}`);
    console.log(`   - С реферальными кодами: ${this.report.usersWithReferralCode}`);
    console.log(`   - Процент охвата: ${(this.report.usersWithReferrers / this.report.totalUsers * 100).toFixed(2)}%`);

    console.log('\n2. ТАБЛИЦА REFERRALS:');
    console.log(`   - Всего записей: ${this.report.referralTable.totalRecords}`);
    console.log(`   - С начисленными наградами: ${this.report.referralTable.withRewards}`);
    console.log(`   - Общие награды UNI: ${parseFloat(this.report.referralTable.totalRewardsUni).toFixed(6)}`);
    console.log(`   - Общие награды TON: ${parseFloat(this.report.referralTable.totalRewardsTon).toFixed(6)}`);
    console.log('   - Распределение по уровням:');
    for (let level = 1; level <= 20; level++) {
      const count = this.report.referralTable.byLevel[level] || 0;
      if (count > 0) {
        console.log(`     Уровень ${level}: ${count} записей`);
      }
    }

    console.log('\n3. ТАБЛИЦА REFERRAL_EARNINGS:');
    console.log(`   - Всего записей: ${this.report.referralEarnings.totalRecords}`);
    console.log(`   - Начисления UNI: ${this.report.referralEarnings.byCurrency.UNI.count} записей, сумма: ${parseFloat(this.report.referralEarnings.byCurrency.UNI.totalAmount).toFixed(6)}`);
    console.log(`   - Начисления TON: ${this.report.referralEarnings.byCurrency.TON.count} записей, сумма: ${parseFloat(this.report.referralEarnings.byCurrency.TON.totalAmount).toFixed(6)}`);
    console.log('   - Распределение по уровням:');
    for (let level = 1; level <= 20; level++) {
      const levelData = this.report.referralEarnings.byLevel[level];
      if (levelData && levelData.count > 0) {
        console.log(`     Уровень ${level}: ${levelData.count} начислений, сумма: ${parseFloat(levelData.totalAmount).toFixed(6)}`);
      }
    }

    console.log('\n4. ТРАНЗАКЦИИ REFERRAL_REWARD:');
    console.log(`   - Всего транзакций: ${this.report.transactions.referralRewards}`);
    console.log(`   - Сумма UNI: ${parseFloat(this.report.transactions.totalAmountUni).toFixed(6)}`);
    console.log(`   - Сумма TON: ${parseFloat(this.report.transactions.totalAmountTon).toFixed(6)}`);

    console.log('\n5. ЦЕЛОСТНОСТЬ РЕФЕРАЛЬНЫХ ЦЕПОЧЕК:');
    console.log(`   - Полные цепочки: ${this.report.referralChains.complete}`);
    console.log(`   - Разорванные цепочки: ${this.report.referralChains.broken}`);
    console.log(`   - Сиротские записи: ${this.report.referralChains.orphaned}`);
    console.log(`   - Циклические ссылки: ${this.report.referralChains.cycles}`);

    if (this.report.anomalies.length > 0) {
      console.log('\n6. ОБНАРУЖЕННЫЕ АНОМАЛИИ:');
      this.report.anomalies.forEach((anomaly, index) => {
        console.log(`   ${index + 1}. ${anomaly}`);
      });
    }

    if (this.report.recommendations.length > 0) {
      console.log('\n7. РЕКОМЕНДАЦИИ:');
      this.report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('КОНЕЦ ОТЧЕТА');
    console.log('='.repeat(80) + '\n');
  }
}

// Запуск анализа
async function main() {
  const analyzer = new ReferralSystemAnalyzer();
  try {
    await analyzer.analyze();
  } catch (error) {
    logger.error('[Main] Ошибка выполнения анализа:', error);
    process.exit(1);
  }
}

main();