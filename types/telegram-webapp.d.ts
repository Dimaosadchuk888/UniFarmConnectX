declare global {
  interface Window {
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
        themeParams?: {
          textColor?: string;
          hintColor?: string;
          linkColor?: string;
          buttonColor?: string;
          buttonTextColor?: string;
          secondaryBackgroundColor?: string;
        };
        MainButton?: any;
        BackButton?: any;
        CloudStorage?: {
          getItem: (key: string, callback?: (error: string | null, value: string | null) => void) => Promise<string | null>;
          setItem: (key: string, value: string, callback?: (error: string | null, success: boolean) => void) => Promise<void>;
          removeItem: (key: string, callback?: (error: string | null, success: boolean) => void) => Promise<void>;
          getItems: (keys: string[], callback?: (error: string | null, values: Record<string, string | null>) => void) => Promise<Record<string, string | null>>;
          removeItems: (keys: string[], callback?: (error: string | null, success: boolean) => void) => Promise<void>;
        };
        sendData?: (data: any) => void;
        onEvent?: (eventType: string, eventHandler: Function) => void;
        offEvent?: (eventType: string, eventHandler: Function) => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openLink?: (url: string) => void;
        showPopup?: (params: any, callback?: Function) => void;
        showAlert?: (message: string, callback?: Function) => void;
        showConfirm?: (message: string, callback?: Function) => void;
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
      };
    };
  }
}

export {};