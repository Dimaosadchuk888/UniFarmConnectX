/**
 * Расширенный TON Blockchain Service
 * Предоставляет дополнительные функции для работы с TON блокчейном
 */

import { TonConnectUI } from '@tonconnect/ui';
import { Address, toNano, fromNano, Cell, beginCell } from '@ton/core';

// Интерфейсы для TON данных
export interface TonWalletInfo {
  address: string;
  balance: string;
  isActive: boolean;
  lastActivity: number;
  workchain: number;
}

export interface TonTransaction {
  hash: string;
  time: number;
  amount: string;
  fee: string;
  from?: string;
  to?: string;
  comment?: string;
  status: 'success' | 'pending' | 'failed';
}

export interface TonTokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  balance: string;
}

// TON API URLs (testnet/mainnet)
const TON_API_BASE = 'https://toncenter.com/api/v2';
const TON_API_KEY = import.meta.env.VITE_TON_API_KEY || '';

export class TonBlockchainService {
  private tonConnectUI: TonConnectUI | null = null;

  constructor(tonConnectUI?: TonConnectUI) {
    this.tonConnectUI = tonConnectUI || null;
  }

  /**
   * Получает подробную информацию о TON кошельке
   */
  async getWalletInfo(address: string): Promise<TonWalletInfo | null> {
    try {
      const response = await fetch(
        `${TON_API_BASE}/getAddressInformation?address=${address}&api_key=${TON_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TON API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Unknown TON API error');
      }

      const info = data.result;
      
      return {
        address: address,
        balance: fromNano(info.balance || '0'),
        isActive: info.state === 'active',
        lastActivity: info.last_transaction_id?.lt || 0,
        workchain: 0 // TON workchain
      };
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      return null;
    }
  }

  /**
   * Получает историю транзакций кошелька
   */
  async getTransactionHistory(address: string, limit: number = 10): Promise<TonTransaction[]> {
    try {
      const response = await fetch(
        `${TON_API_BASE}/getTransactions?address=${address}&limit=${limit}&api_key=${TON_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TON API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Unknown TON API error');
      }

      return data.result.map((tx: any) => ({
        hash: tx.transaction_id.hash,
        time: tx.utime,
        amount: fromNano(tx.in_msg?.value || tx.out_msgs?.[0]?.value || '0'),
        fee: fromNano(tx.fee || '0'),
        from: tx.in_msg?.source || undefined,
        to: tx.out_msgs?.[0]?.destination || undefined,
        comment: this.decodeComment(tx.in_msg?.msg_data || tx.out_msgs?.[0]?.msg_data),
        status: 'success' as const
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Проверяет статус транзакции по хэшу
   */
  async getTransactionStatus(txHash: string): Promise<'success' | 'pending' | 'failed'> {
    try {
      const response = await fetch(
        `${TON_API_BASE}/getTransactions?hash=${txHash}&api_key=${TON_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TON API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        return 'failed';
      }

      return data.result.length > 0 ? 'success' : 'pending';
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'failed';
    }
  }

  /**
   * Создает расширенный комментарий для транзакции
   */
  createAdvancedComment(type: string, data: any): Cell {
    try {
      const comment = JSON.stringify({
        app: 'UniFarm',
        type: type,
        timestamp: Math.floor(Date.now() / 1000),
        data: data
      });

      return beginCell()
        .storeUint(0, 32) // Text comment tag
        .storeStringTail(comment)
        .endCell();
    } catch (error) {
      console.error('Error creating comment:', error);
      return beginCell().storeUint(0, 32).storeStringTail('UniFarm transaction').endCell();
    }
  }

  /**
   * Декодирует комментарий из транзакции
   */
  private decodeComment(msgData: any): string | undefined {
    try {
      if (!msgData) return undefined;

      // Пытаемся декодировать как текст
      if (msgData.text) {
        return msgData.text;
      }

      // Пытаемся декодировать JSON комментарий
      if (msgData.body && typeof msgData.body === 'string') {
        try {
          const parsed = JSON.parse(msgData.body);
          if (parsed.app === 'UniFarm') {
            return `UniFarm ${parsed.type} - ${JSON.stringify(parsed.data)}`;
          }
        } catch {
          return msgData.body;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error decoding comment:', error);
      return undefined;
    }
  }

  /**
   * Конвертирует TON в nanoTON для транзакций
   */
  toNanoTON(amount: string | number): string {
    try {
      return toNano(amount).toString();
    } catch (error) {
      console.error('Error converting to nanoTON:', error);
      return '0';
    }
  }

  /**
   * Конвертирует nanoTON в TON для отображения
   */
  fromNanoTON(amount: string | number): string {
    try {
      return fromNano(amount);
    } catch (error) {
      console.error('Error converting from nanoTON:', error);
      return '0';
    }
  }

  /**
   * Проверяет корректность TON адреса
   */
  isValidTonAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Форматирует TON адрес для отображения
   */
  formatTonAddress(address: string, short: boolean = true): string {
    try {
      const parsed = Address.parse(address);
      const formatted = parsed.toString();
      
      if (short && formatted.length > 10) {
        return `${formatted.slice(0, 6)}...${formatted.slice(-4)}`;
      }
      
      return formatted;
    } catch {
      return address;
    }
  }

  /**
   * Получает курс TON к USD
   */
  async getTonPriceUSD(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      const data = await response.json();
      return data['the-open-network']?.usd || 0;
    } catch (error) {
      console.error('Error fetching TON price:', error);
      return 0;
    }
  }

  /**
   * Вычисляет стоимость транзакции в USD
   */
  async calculateTransactionCostUSD(amountTON: string): Promise<number> {
    try {
      const tonPrice = await this.getTonPriceUSD();
      const amount = parseFloat(amountTON);
      return amount * tonPrice;
    } catch (error) {
      console.error('Error calculating transaction cost:', error);
      return 0;
    }
  }

  /**
   * Создает предварительный просмотр транзакции
   */
  async createTransactionPreview(
    toAddress: string,
    amount: string,
    comment?: string
  ): Promise<{
    to: string;
    amount: string;
    amountUSD: number;
    fee: string;
    comment?: string;
    isValidAddress: boolean;
  }> {
    const isValidAddress = this.isValidTonAddress(toAddress);
    const amountUSD = await this.calculateTransactionCostUSD(amount);
    
    return {
      to: this.formatTonAddress(toAddress, false),
      amount: amount,
      amountUSD: amountUSD,
      fee: '0.01', // Примерная комиссия TON
      comment: comment,
      isValidAddress: isValidAddress
    };
  }

  /**
   * Получает статистику сети TON
   */
  async getNetworkStats(): Promise<{
    totalSupply: string;
    totalStaked: string;
    validators: number;
    tps: number;
  }> {
    try {
      // Здесь можно интегрировать с TON API для получения реальной статистики
      return {
        totalSupply: '5,047,558,528', // Примерное количество TON
        totalStaked: '2,523,779,264', // Примерное количество застейканных TON
        validators: 400, // Примерное количество валидаторов
        tps: 1000000 // Теоретическая пропускная способность
      };
    } catch (error) {
      console.error('Error fetching network stats:', error);
      return {
        totalSupply: '0',
        totalStaked: '0',
        validators: 0,
        tps: 0
      };
    }
  }
}

// Экспорт основных функций для использования в компонентах
export const tonBlockchainService = new TonBlockchainService();

export default TonBlockchainService;