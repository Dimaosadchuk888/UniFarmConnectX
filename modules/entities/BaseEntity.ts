/**
 * Базовый класс для всех сущностей UniFarm
 * Содержит общие поля и методы
 */
export abstract class BaseEntity {
  constructor(
    public id: number,
    public createdAt: Date = new Date()
  ) {}

  /**
   * Возвращает уникальный идентификатор сущности
   */
  getId(): number {
    return this.id;
  }

  /**
   * Проверяет, является ли сущность новой (не сохраненной в БД)
   */
  isNew(): boolean {
    return this.id === 0 || this.id === undefined;
  }

  /**
   * Возвращает возраст сущности в днях
   */
  getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Абстрактный метод для валидации сущности
   */
  abstract validate(): boolean;

  /**
   * Абстрактный метод для сериализации сущности
   */
  abstract toJSON(): Record<string, any>;
}