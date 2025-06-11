import React from 'react';
import { useUser } from '@/contexts/simpleUserContext';

const IncomeCardNew: React.FC = () => {
  const { uniBalance } = useUser();
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

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
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>Доходы от фарминга</h3>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          backgroundColor: '#34d399', 
          borderRadius: '50%',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Общий доход */}
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '4px' }}>Общий доход</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                {formatNumber(12.5)} UNI/час
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                {formatNumber(300)} UNI/день
              </div>
            </div>
          </div>
        </div>

        {/* UNI Farming */}
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '4px' }}>UNI Farming</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>
                {formatNumber(10.2)} UNI/час
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {formatNumber(245)} UNI/день
              </div>
            </div>
          </div>
        </div>

        {/* TON Boost Farming */}
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#c4b5fd', marginBottom: '4px' }}>TON Boost</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>
                {formatNumber(2.3)} TON/час
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {formatNumber(55)} TON/день
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCardNew;