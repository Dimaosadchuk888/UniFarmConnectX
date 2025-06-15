// DEPRECATED: This file is no longer used
// All missions operations now use Supabase API via modules/missions/repository.ts
// This file exists only for import compatibility during transition

console.warn('[DEPRECATED] modules/missions/service.ts is deprecated. Use Supabase API instead');

export class MissionService {
  constructor() {
    console.warn('[DEPRECATED] MissionService is deprecated. Use Supabase API instead');
  }
}

export default MissionService;