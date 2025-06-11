import { BaseEntity } from './BaseEntity';

export type MissionType = 'telegram' | 'youtube' | 'tiktok' | 'invite' | 'social' | 'check-in' | 'deposit';

/**
 * Класс миссии в системе UniFarm
 */
export class Mission extends BaseEntity {
  constructor(
    id: number,
    public type: MissionType,
    public title: string,
    public description: string,
    public rewardUNI: number,
    public isActive: boolean = true,
    public url?: string,
    public requiredCount?: number,
    createdAt: Date = new Date()
  ) {
    super(id, createdAt);
  }

  /**
   * Проверяет, является ли миссия социальной
   */
  isSocial(): boolean {
    return ['telegram', 'youtube', 'tiktok', 'social'].includes(this.type);
  }

  /**
   * Проверяет, является ли миссия реферальной
   */
  isReferral(): boolean {
    return this.type === 'invite';
  }

  /**
   * Проверяет, является ли миссия ежедневной
   */
  isDaily(): boolean {
    return this.type === 'check-in';
  }

  /**
   * Проверяет, требует ли миссия депозит
   */
  requiresDeposit(): boolean {
    return this.type === 'deposit';
  }

  /**
   * Получает иконку для типа миссии
   */
  getIcon(): string {
    const icons: Record<MissionType, string> = {
      telegram: '📱',
      youtube: '📺',
      tiktok: '🎵',
      invite: '👥',
      social: '🌐',
      'check-in': '📅',
      deposit: '💰'
    };
    return icons[this.type] || '📋';
  }

  /**
   * Получает цвет для типа миссии
   */
  getColor(): string {
    const colors: Record<MissionType, string> = {
      telegram: '#0088cc',
      youtube: '#ff0000',
      tiktok: '#000000',
      invite: '#00c851',
      social: '#33b5e5',
      'check-in': '#ff8800',
      deposit: '#ffd700'
    };
    return colors[this.type] || '#6c757d';
  }

  /**
   * Получает сложность миссии
   */
  getDifficulty(): 'easy' | 'medium' | 'hard' {
    if (this.rewardUNI <= 10) return 'easy';
    if (this.rewardUNI <= 50) return 'medium';
    return 'hard';
  }

  /**
   * Получает предполагаемое время выполнения
   */
  getEstimatedTime(): string {
    switch (this.type) {
      case 'telegram':
      case 'youtube':
      case 'tiktok':
        return '2-5 минут';
      case 'invite':
        return '10-30 минут';
      case 'check-in':
        return '1 минута';
      case 'deposit':
        return '5-15 минут';
      default:
        return 'Не определено';
    }
  }

  /**
   * Проверяет, может ли миссия быть выполнена повторно
   */
  isRepeatable(): boolean {
    return this.type === 'check-in' || this.type === 'invite';
  }

  /**
   * Получает текст кнопки действия
   */
  getActionButtonText(): string {
    switch (this.type) {
      case 'telegram':
        return 'Подписаться';
      case 'youtube':
        return 'Посмотреть';
      case 'tiktok':
        return 'Смотреть';
      case 'invite':
        return 'Пригласить';
      case 'check-in':
        return 'Забрать бонус';
      case 'deposit':
        return 'Внести депозит';
      default:
        return 'Выполнить';
    }
  }

  /**
   * Валидация миссии
   */
  validate(): boolean {
    return (
      !!this.title &&
      !!this.description &&
      this.rewardUNI > 0 &&
      ['telegram', 'youtube', 'tiktok', 'invite', 'social', 'check-in', 'deposit'].includes(this.type)
    );
  }

  /**
   * Сериализация миссии
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      rewardUNI: this.rewardUNI,
      isActive: this.isActive,
      url: this.url,
      requiredCount: this.requiredCount,
      createdAt: this.createdAt,
      icon: this.getIcon(),
      color: this.getColor(),
      difficulty: this.getDifficulty(),
      estimatedTime: this.getEstimatedTime(),
      isRepeatable: this.isRepeatable(),
      actionButtonText: this.getActionButtonText(),
      isSocial: this.isSocial(),
      isReferral: this.isReferral(),
      isDaily: this.isDaily(),
      requiresDeposit: this.requiresDeposit()
    };
  }
}