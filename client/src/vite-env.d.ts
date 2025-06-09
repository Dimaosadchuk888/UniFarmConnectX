/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TELEGRAM_BOT_USERNAME: string
  readonly VITE_WEB_APP_URL: string
  readonly VITE_TELEGRAM_WEBAPP_NAME: string
  readonly VITE_NODE_ENV: string
  readonly VITE_DEBUG: string
  readonly VITE_LOG_LEVEL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}