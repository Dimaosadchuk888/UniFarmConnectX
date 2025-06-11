import React from 'react';

const ChartCard: React.FC = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(88, 28, 135, 0.2) 100%)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>График доходности</h3>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          backgroundColor: '#34d399', 
          borderRadius: '50%',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
      
      <div style={{ 
        height: '128px', 
        backgroundColor: 'rgba(0, 0, 0, 0.2)', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>График временно недоступен</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', marginTop: '4px' }}>Загрузка данных...</div>
        </div>
      </div>
    </div>
  );
};

export default ChartCard;