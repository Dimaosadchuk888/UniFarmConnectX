import { useState } from 'react';
import { useTelegram } from './useTelegram';

interface TelegramButton {
  text: string;
  color?: string;
  textColor?: string;
  isVisible: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function useTelegramButtons() {
  const { tg } = useTelegram();
  const [mainButton, setMainButton] = useState<TelegramButton>({
    text: '',
    isVisible: false,
    isActive: false
  });

  const showMainButton = (config: TelegramButton) => {
    if (tg?.MainButton) {
      tg.MainButton.text = config.text;
      tg.MainButton.color = config.color || '#007AFF';
      tg.MainButton.textColor = config.textColor || '#FFFFFF';
      
      if (config.onClick) {
        tg.MainButton.onClick(config.onClick);
      }
      
      tg.MainButton.show();
      
      setMainButton({
        ...config,
        isVisible: true,
        isActive: true
      });
    }
  };

  const hideMainButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.hide();
      setMainButton(prev => ({
        ...prev,
        isVisible: false,
        isActive: false
      }));
    }
  };

  const showStartFarmingButton = (onStart: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Начать фарминг';
      tg.MainButton.color = '#4CAF50';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onStart) {
        tg.MainButton.onClick(onStart);
      }
      
      tg.MainButton.show();
    }
  };

  const showCollectButton = (onCollect: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Собрать награду';
      tg.MainButton.color = '#FF9800';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onCollect) {
        tg.MainButton.onClick(onCollect);
      }
      
      tg.MainButton.show();
    }
  };

  const showConnectWalletButton = (onConnect: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Подключить кошелек';
      tg.MainButton.color = '#2196F3';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onConnect) {
        tg.MainButton.onClick(onConnect);
      }
      
      tg.MainButton.show();
    }
  };

  const showBoostButton = (onBoost: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Активировать буст';
      tg.MainButton.color = '#9C27B0';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onBoost) {
        tg.MainButton.onClick(onBoost);
      }
      
      tg.MainButton.show();
    }
  };

  const showInviteFriendsButton = (onInvite: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Пригласить друзей';
      tg.MainButton.color = '#E91E63';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onInvite) {
        tg.MainButton.onClick(onInvite);
      }
      
      tg.MainButton.show();
    }
  };

  const showCompleteTaskButton = (onComplete: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Выполнить задание';
      tg.MainButton.color = '#FF5722';
      tg.MainButton.textColor = '#FFFFFF';
      
      if (onComplete) {
        tg.MainButton.onClick(onComplete);
      }
      
      tg.MainButton.show();
    }
  };

  const hideButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.hide();
    }
  };

  return {
    showStartFarmingButton,
    showCollectButton,
    showConnectWalletButton,
    showBoostButton,
    showInviteFriendsButton,
    showCompleteTaskButton,
    showMainButton,
    hideMainButton,
    hideButton,
    mainButton
  };
}