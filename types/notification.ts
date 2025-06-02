/**
 * Типы для системы уведомлений
 */

export type NotificationType = 'success' | 'error' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // Длительность показа в мс (если не указано - уведомление не исчезает автоматически)
  autoDismiss?: boolean; // Автоматически скрывать уведомление через duration
}

export interface NotificationOptions {
  message: string;
  type?: NotificationType;
  duration?: number;
  autoDismiss?: boolean;
}