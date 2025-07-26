/**
 * Cache Management System for UniFarm
 * Forces all users to refresh and get latest bug fixes
 */

export const SYSTEM_VERSION = '2025.07.25.BUGFIXES.APPLIED';

export class CacheManager {
  private static readonly VERSION_KEY = 'unifarm_app_version';
  private static readonly CACHE_KEYS = [
    'ton_connect_state',
    'user_preferences',
    'wallet_data',
    'transaction_cache',
    'farming_data'
  ];

  static checkVersionAndClearCache(): boolean {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    
    if (storedVersion !== SYSTEM_VERSION) {
      console.log(`🔄 System version mismatch: ${storedVersion} → ${SYSTEM_VERSION}`);
      this.clearAllCache();
      localStorage.setItem(this.VERSION_KEY, SYSTEM_VERSION);
      return true; // Cache was cleared
    }
    
    return false; // No cache clearing needed
  }

  static clearAllCache(): void {
    // Clear localStorage
    this.CACHE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear Service Worker caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }

    // Update Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      });
    }

    console.log('✅ All caches cleared - users will get fresh version');
  }

  static forcePageReload(): void {
    // Hard reload to bypass any cached resources
    window.location.reload();
  }
}