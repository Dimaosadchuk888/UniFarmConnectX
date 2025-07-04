import React, { createContext, useContext, useState, useEffect } from 'react';

// Простейшие типы для диагностики
interface SimpleUserData {
  id: number;
  username: string;
  balance_uni: number;
  balance_ton: number;
}

interface SimpleUserContextType {
  userData: SimpleUserData | null;
  isLoading: boolean;
  error: string | null;
}

// Создаем контекст
const SimpleUserContext = createContext<SimpleUserContextType>({
  userData: null,
  isLoading: false,
  error: null
});

// Простейший провайдер для диагностики React ошибки
export function SimpleUserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<SimpleUserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Загружаем данные пользователя 48
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/users/profile?user_id=48');
        const data = await response.json();
        
        if (data.success && data.data.user) {
          setUserData({
            id: data.data.user.id,
            username: data.data.user.username,
            balance_uni: data.data.user.balance_uni,
            balance_ton: data.data.user.balance_ton
          });
        }
      } catch (err) {
        setError('Ошибка загрузки пользователя');
        console.error('Ошибка:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const value: SimpleUserContextType = {
    userData,
    isLoading,
    error
  };

  return (
    <SimpleUserContext.Provider value={value}>
      {children}
    </SimpleUserContext.Provider>
  );
}

// Хук для использования контекста
export function useSimpleUser() {
  const context = useContext(SimpleUserContext);
  if (!context) {
    throw new Error('useSimpleUser must be used within SimpleUserProvider');
  }
  return context;
}