export interface TelegramUserData {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
  is_premium: boolean;
}

export interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  chat_instance?: string;
  chat_type?: string;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: TelegramInlineQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUserAPI;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramUserAPI {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUserAPI;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUserAPI;
  query: string;
  offset: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUserAPI;
}

export type TelegramWebhookEventType = 'message' | 'callback_query' | 'inline_query';