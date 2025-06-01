import { useEffect, useState } from 'react';
import { useTelegram } from './useTelegram';

interface TelegramButton {
  text: string;
  color?: string;
  textColor?: string;
  isVisible?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function useTelegramButtons() {
  const { webApp } = useTelegram();
  const [mainButton, setMainButton] = useState<TelegramButton>({
    text: '',
    isVisible: false,
    isActive: false
  });

  const showMainButton = (config: TelegramButton) => {
    if (webApp?.MainButton) {
      webApp.MainButton.text = config.text;
      webApp.MainButton.color = config.color || '#007AFF';
      webApp.MainButton.textColor = config.textColor || '#FFFFFF';
      
      if (config.onClick) {
        webApp.MainButton.onClick(config.onClick);
      }
      
      webApp.MainButton.show();
      
      setMainButton({
        ...config,
        isVisible: true,
        isActive: true
      });
    }
  };

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
      setMainButton(prev => ({
        ...prev,
        isVisible: false,
        isActive: false
      }));
    }
  };

  const updateMainButton = (updates: Partial<TelegramButton>) => {
    if (webApp?.MainButton) {
      if (updates.text !== undefined) {
        webApp.MainButton.text = updates.text;
      }
      if (updates.color !== undefined) {
        webApp.MainButton.color = updates.color;
      }
      if (updates.textColor !== undefined) {
        webApp.MainButton.textColor = updates.textColor;
      }
      
      setMainButton(prev => ({
        ...prev,
        ...updates
      }));
    }
  };

  const enableMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.enable();
      setMainButton(prev => ({ ...prev, isActive: true }));
    }
  };

  const disableMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.disable();
      setMainButton(prev => ({ ...prev, isActive: false }));
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup при размонтировании
      if (webApp?.MainButton) {
        webApp.MainButton.hide();
        webApp.MainButton.offClick();
      }
    };
  }, [webApp]);

  return {
    mainButton,
    showMainButton,
    hideMainButton,
    updateMainButton,
    enableMainButton,
    disableMainButton,
    isAvailable: !!webApp?.MainButton
  };
}

export function useFarmingButtons() {
  const { tg } = useTelegram();
  
  const showStartFarmingButton = (onClick: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Начать фарминг';
      tg.MainButton.color = '#28a745';
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    }
  };

  const showCollectButton = (onClick: () => void) => {
    if (tg?.MainButton) {
      tg.MainButton.text = 'Собрать награду';
      tg.MainButton.color = '#ffc107';
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    }
  };

  const hideButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.hide();
      tg.MainButton.offClick();
    }
  };

  return {
    showStartFarmingButton,
    showCollectButton,
    hideButton,
    isAvailable: !!tg?.MainButton
  };
}