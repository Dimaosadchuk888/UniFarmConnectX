import React from 'react';

export default function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>UniFarm - Тест загрузки</h1>
      <p>Приложение успешно загружено</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>Статус системы:</h2>
        <p>✅ React работает</p>
        <p>✅ DOM готов</p>
        <p>✅ Приложение запущено</p>
      </div>
    </div>
  );
}