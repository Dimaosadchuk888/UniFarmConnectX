import React from 'react';
import { useUser } from '@/contexts/simpleUserContext';

const WelcomeSection: React.FC = () => {
  const { username, uniBalance } = useUser();
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>U</span>
          </div>
          
          <div>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'white', 
              marginBottom: '4px',
              margin: 0
            }}>
              Добро пожаловать, {username}!
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#d1d5db',
              margin: 0
            }}>
              Ваш баланс: {uniBalance.toLocaleString()} UNI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;