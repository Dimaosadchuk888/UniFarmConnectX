/**
 * Production Configuration for UniFarm
 * Handles secure environment variable management
 */

import fs from 'fs';
import path from 'path';

interface ManifestData {
  tonConnectManifest: {
    url: string;
    name: string;
    iconUrl: string;
    termsOfUseUrl: string;
    privacyPolicyUrl: string;
  };
  telegramManifest: {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    background_color: string;
    theme_color: string;
    icons: Array<{
      src: string;
      sizes: string;
      type: string;
    }>;
  };
}

export class ProductionConfig {
  private requiredSecrets: string[];
  private optionalSecrets: string[];

  constructor() {
    this.requiredSecrets = [
      'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET'
    ];
    
    this.optionalSecrets = [
      'ADMIN_SECRET'
    ];
  }

  validateSecrets(): boolean {
    const missing: string[] = [];
    const warnings: string[] = [];
    
    // Check required secrets
    for (const secret of this.requiredSecrets) {
      if (!process.env[secret]) {
        missing.push(secret);
      }
    }
    
    // Check optional secrets
    for (const secret of this.optionalSecrets) {
      if (!process.env[secret]) {
        warnings.push(`Optional secret ${secret} not set`);
      }
    }
    
    if (missing.length > 0) {
      console.error('❌ Missing required secrets:');
      missing.forEach(secret => console.error(`   - ${secret}`));
      console.error('\n💡 Please add these to Replit Secrets or .env file');
      return false;
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️  Optional secrets not configured:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
    
    console.log('✅ All required secrets are configured');
    return true;
  }

  generateManifests(): ManifestData {
    const baseUrl = process.env.TELEGRAM_WEBAPP_URL || 
      process.env.VITE_APP_URL ||
      (process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'https://uni-farm-connect-x-ab245275.replit.app');
    
    // TON Connect manifest
    const tonConnectManifest = {
      url: baseUrl,
      name: "UniFarm",
      iconUrl: `${baseUrl}/logo.png`,
      termsOfUseUrl: `${baseUrl}/terms`,
      privacyPolicyUrl: `${baseUrl}/privacy`
    };
    
    // Telegram WebApp manifest
    const telegramManifest = {
      name: "UniFarm Telegram Bot",
      short_name: "UniFarm",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#6366f1",
      icons: [
        {
          src: "/logo-192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "/logo-512.png", 
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };
    
    return { tonConnectManifest, telegramManifest };
  }

  setupEnvironment(): void {
    // Set defaults for production
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    process.env.PORT = process.env.PORT || '3000';
    // Environment setup completed
    
    // Auto-configure app URL based on environment
    if (process.env.REPLIT_DEV_DOMAIN && !process.env.VITE_WEB_APP_URL) {
      process.env.VITE_WEB_APP_URL = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      process.env.BASE_URL = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    
    console.log('🔧 Production environment configured');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   PORT: ${process.env.PORT}`);
    console.log(`   APP_URL: ${process.env.VITE_WEB_APP_URL || process.env.BASE_URL || 'Not set'}`);
  }

  init(): ManifestData {
    this.setupEnvironment();
    
    // In development, log warnings but don't exit
    const isValid = this.validateSecrets();
    if (!isValid && process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return this.generateManifests();
  }
}