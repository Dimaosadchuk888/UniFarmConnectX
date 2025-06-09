declare module 'ws' {
  import { EventEmitter } from 'events';
  
  class WebSocket extends EventEmitter {
    constructor(url: string, options?: any);
    send(data: any): void;
    close(): void;
    readyState: number;
    binaryType: string;
    addEventListener(type: string, listener: any): void;
    removeEventListener(type: string, listener: any): void;
  }
  
  export = WebSocket;
}