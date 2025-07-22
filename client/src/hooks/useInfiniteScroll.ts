import { useEffect, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Хук для реализации плавной подгрузки контента по скроллу
 * Использует IntersectionObserver для отслеживания видимости trigger элемента
 */
export const useInfiniteScroll = (options: UseInfiniteScrollOptions) => {
  const [targetRef, setTargetRef] = useState<HTMLElement | null>(null);

  // Мемоизированный callback для onLoadMore
  const memoizedOnLoadMore = useCallback(() => {
    if (!options.isLoading && options.hasMore) {
      options.onLoadMore();
    }
  }, [options.onLoadMore, options.isLoading, options.hasMore]);

  useEffect(() => {
    // Проверяем поддержку IntersectionObserver
    if (!window.IntersectionObserver) {
      console.warn('[useInfiniteScroll] IntersectionObserver не поддерживается');
      return;
    }

    if (!targetRef || !options.hasMore || options.isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log('[useInfiniteScroll] Trigger элемент появился в viewport, загружаем еще');
          memoizedOnLoadMore();
        }
      },
      {
        // Начинаем загрузку за 50px до появления элемента
        rootMargin: options.rootMargin || '50px',
        // Срабатывает при 10% видимости
        threshold: options.threshold || 0.1
      }
    );

    observer.observe(targetRef);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, options.hasMore, options.isLoading, memoizedOnLoadMore, options.rootMargin, options.threshold]);

  return { 
    targetRef: setTargetRef,
    // Возвращаем также информацию о поддержке для fallback
    isSupported: !!window.IntersectionObserver
  };
};

export default useInfiniteScroll;