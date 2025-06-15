// DEPRECATED: This file is no longer used
// Performance monitoring now uses Supabase API via core/monitoring.ts
// This file exists only for import compatibility during transition

console.warn('[DEPRECATED] core/performanceMonitor.ts is deprecated. Use core/monitoring.ts instead');

export class PerformanceMonitor {
  constructor() {
    console.warn('[DEPRECATED] PerformanceMonitor is deprecated. Use core/monitoring.ts instead');
  }
}

export default PerformanceMonitor;