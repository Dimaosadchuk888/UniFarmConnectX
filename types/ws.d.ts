declare module 'ws' {
  import { EventEmitter } from 'events';
  
  class WebSocket extends EventEmitter {
    constructor(url: string, options?: any);
    send(data: any): void;
    close(): void;
    readyState: number;
  }
  
  export = WebSocket;
}