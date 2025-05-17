/**
 * Компонент для проверки запуска приложения в Telegram Mini App
 * Полностью отключена проверка для прямого доступа
 */
import React from 'react';

interface TelegramWebAppCheckProps {
  children: React.ReactNode;
}

export default function TelegramWebAppCheck({ children }: TelegramWebAppCheckProps) {
  // Полностью отключаем проверку - всегда показываем содержимое
  // Это отключает блокировку для запуска вне Telegram
  return <>{children}</>;
}