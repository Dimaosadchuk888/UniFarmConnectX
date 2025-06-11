import React from 'react';

const UniFarmingCardWithErrorBoundary: React.FC = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(20, 83, 45, 0.2) 0%, rgba(30, 58, 138, 0.2) 100%)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>UNI Farming</h3>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          backgroundColor: '#34d399', 
          borderRadius: '50%',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
      
      <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
        <div style={{ fontSize: '64px', color: '#34d399', marginBottom: '16px' }}>🌱</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Фарминг активен</div>
        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>Зарабатывайте UNI токены автоматически</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Заработано</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#34d399' }}>1,234 UNI</div>
          </div>
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>В час</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#34d399' }}>12.5 UNI</div>
          </div>
        </div>
        
        <button style={{
          width: '100%',
          background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
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
          e.currentTarget.style.background = 'linear-gradient(90deg, #059669 0%, #2563eb 100%)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)';
          e.currentTarget.style.transform = 'scale(1)';
        }}>
          Собрать урожай
        </button>
      </div>
    </div>
  );
};

export default UniFarmingCardWithErrorBoundary;