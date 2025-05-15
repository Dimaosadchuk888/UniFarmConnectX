import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface ActiveBoostsCardWithErrorBoundaryProps {
  userId: number;
}

/**
 * Пустой компонент, который заменил ActiveBoostsCard для UNI Farming
 * Мы полностью скрыли блок "Активные Boost-пакеты" в UNI Farming
 * согласно требованиям заказчика
 */
const ActiveBoostsCardWithErrorBoundary: React.FC<ActiveBoostsCardWithErrorBoundaryProps> = () => {
  // Возвращаем null, чтобы компонент не отображался вообще
  return null;
};

export default ActiveBoostsCardWithErrorBoundary;