import React from 'react';

const WelcomeSection: React.FC = () => {
  // We'll use @username as a placeholder since we don't have actual user data
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-white">Привет, @username!</h1>
      <p className="text-sm text-foreground opacity-80">Сегодня отличный день для добычи токенов!</p>
    </div>
  );
};

export default WelcomeSection;
