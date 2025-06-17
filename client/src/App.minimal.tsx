import React from 'react';

// Минимальная версия App для диагностики критической ошибки
function MinimalApp() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">UniFarm Debug Mode</h1>
        <p className="text-gray-400">Приложение загружается...</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Проверка React инициализации...</p>
          <p>Время: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

export default MinimalApp;