import React from 'react';
import { useUser } from '@/contexts/simpleUserContext';

const WelcomeSection: React.FC = () => {
  const { username, uniBalance } = useUser();
  
  return (
    <div className="welcome-card-bg rounded-xl p-5 mb-6 shadow-lg border border-white/10">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Добро пожаловать, {username}!
            </h2>
            <p className="text-sm text-gray-300">
              Ваш баланс: {uniBalance.toLocaleString()} UNI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;