import React from 'react';

const BoostStatusCard: React.FC = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2) 0%, rgba(157, 23, 77, 0.2) 100%)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>Статус бустов</h3>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          backgroundColor: '#a78bfa', 
          borderRadius: '50%',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px', 
          backgroundColor: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: '8px' 
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>UNI Farming</span>
          <span style={{ color: '#34d399', fontSize: '14px' }}>Активен</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px', 
          backgroundColor: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: '8px' 
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>TON Boost</span>
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>Неактивен</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px', 
          backgroundColor: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: '8px' 
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Ежедневный бонус</span>
          <span style={{ color: '#fbbf24', fontSize: '14px' }}>Доступен</span>
        </div>
      </div>
    </div>
  );
};

export default BoostStatusCard;