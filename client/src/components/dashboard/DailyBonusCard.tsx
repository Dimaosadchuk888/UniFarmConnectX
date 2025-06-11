import React from 'react';

const DailyBonusCard: React.FC = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(180, 83, 9, 0.2) 0%, rgba(154, 52, 18, 0.2) 100%)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>Ежедневный бонус</h3>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          backgroundColor: '#fbbf24', 
          borderRadius: '50%',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
      
      <div style={{ textAlign: 'center', paddingTop: '16px', paddingBottom: '16px' }}>
        <div style={{ fontSize: '48px', color: '#fbbf24', marginBottom: '8px' }}>🎁</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>+100 UNI</div>
        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>Ежедневный бонус доступен!</div>
        
        <button style={{
          width: '100%',
          background: 'linear-gradient(90deg, #eab308 0%, #f97316 100%)',
          color: 'white',
          fontWeight: '600',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: 'scale(1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'linear-gradient(90deg, #ca8a04 0%, #ea580c 100%)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'linear-gradient(90deg, #eab308 0%, #f97316 100%)';
          e.currentTarget.style.transform = 'scale(1)';
        }}>
          Получить бонус
        </button>
      </div>
    </div>
  );
};

export default DailyBonusCard;