import React, { createContext, useContext, ReactNode } from 'react';

interface WebSocketContextType {
  connectionStatus: 'disconnected';
  sendMessage: (message: any) => void;
  lastMessage: null;
  isConnected: false;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connectionStatus: 'disconnected',
  sendMessage: () => {},
  lastMessage: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const value: WebSocketContextType = {
    connectionStatus: 'disconnected',
    sendMessage: () => {},
    lastMessage: null,
    isConnected: false,
    connect: () => {},
    disconnect: () => {},
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  return context;
};