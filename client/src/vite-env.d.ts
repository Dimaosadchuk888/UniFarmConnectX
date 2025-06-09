/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TELEGRAM_BOT_USERNAME: string
  readonly VITE_WEB_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}