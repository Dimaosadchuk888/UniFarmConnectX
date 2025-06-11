import React, { createContext, useContext, useState, ReactNode } from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface WebSocketContextType {
  connectionStatus: ConnectionStatus;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connectionStatus: 'disconnected',
  sendMessage: () => {},
  lastMessage: null,
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  // DISABLED: This WebSocket context is deprecated and replaced by useWebSocket hook
  // to prevent dual connection conflicts and hardcoded production URLs
  const [connectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage] = useState<any>(null);

  // All WebSocket connection logic disabled to prevent conflicts
  const sendMessage = () => {
    // Disabled - use useWebSocket hook instead
  };

  return (
    <WebSocketContext.Provider 
      value={{ 
        connectionStatus, 
        sendMessage, 
        lastMessage 
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);