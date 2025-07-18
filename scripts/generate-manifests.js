#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Получаем URL из переменных окружения
const baseUrl = process.env.TELEGRAM_WEBAPP_URL || 
                process.env.VITE_APP_URL ||
                (process.env.REPLIT_DEV_DOMAIN 
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                  : 'https://uni-farm-connect-aab49267.replit.app');

console.log(`🔧 Генерация манифестов для домена: ${baseUrl}`);

// TON Connect manifest
const tonConnectManifest = {
  url: baseUrl,
  name: "UniFarm",
  iconUrl: `${baseUrl}/assets/unifarm-icon.svg`,
  termsOfUseUrl: `${baseUrl}/terms`,
  privacyPolicyUrl: `${baseUrl}/privacy`
};

// Пути к манифестам
const manifestPaths = [
  path.join('client/public/tonconnect-manifest.json'),
  path.join('client/public/.well-known/tonconnect-manifest.json')
];

// Создаем директории если не существуют
const wellKnownDir = path.join('client/public/.well-known');
if (!fs.existsSync(wellKnownDir)) {
  fs.mkdirSync(wellKnownDir, { recursive: true });
}

// Записываем манифесты
manifestPaths.forEach(manifestPath => {
  fs.writeFileSync(
    manifestPath, 
    JSON.stringify(tonConnectManifest, null, 2),
    'utf8'
  );
  console.log(`✅ Создан манифест: ${manifestPath}`);
});

console.log(`\n✨ Манифесты успешно сгенерированы для ${baseUrl}`);