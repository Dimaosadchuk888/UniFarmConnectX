interface Window {
  process: {
    env: Record<string, string | undefined>;
  };
  TextEncoder: typeof TextEncoder;
  Telegram?: {
    WebApp?: {
      ready: () => void;
      expand: () => void;
      close: () => void;
      initData: string;
      initDataUnsafe: {
        user?: {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
        };
        start_param?: string;
      };
      version: string;
      platform: string;
      colorScheme?: string;
      MainButton?: any;
      CloudStorage?: {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<void>;
        removeItem: (key: string) => Promise<void>;
        getItems: (keys: string[]) => Promise<Record<string, string | null>>;
        removeItems: (keys: string[]) => Promise<void>;
      };
    }
  }
}