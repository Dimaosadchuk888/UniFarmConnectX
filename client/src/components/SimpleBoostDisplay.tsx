import React from 'react';

const SimpleBoostDisplay: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', marginBottom: '20px' }}>
      <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>ТЕСТ: Исправленные TON Boost пакеты</h3>
      
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Starter Boost</div>
          <div>💰 Цена: 1 TON</div>
          <div>🎁 Бонус: 10,000 UNI</div>
          <div>📈 Доходность: 0.5% в день</div>
        </div>
        
        <div style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Standard Boost</div>
          <div>💰 Цена: 5 TON</div>
          <div>🎁 Бонус: 75,000 UNI</div>
          <div>📈 Доходность: 1% в день</div>
        </div>
        
        <div style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Advanced Boost</div>
          <div>💰 Цена: 15 TON</div>
          <div>🎁 Бонус: 250,000 UNI</div>
          <div>📈 Доходность: 2% в день</div>
        </div>
        
        <div style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Premium Boost</div>
          <div>💰 Цена: 25 TON</div>
          <div>🎁 Бонус: 500,000 UNI</div>
          <div>📈 Доходность: 2.5% в день</div>
        </div>
      </div>
    </div>
  );
};

export default SimpleBoostDisplay;