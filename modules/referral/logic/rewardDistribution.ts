// DEPRECATED: This file is no longer used
// Referral reward distribution now uses Supabase API via modules/referral/service.ts
// This file exists only for import compatibility during transition

console.warn('[DEPRECATED] modules/referral/logic/rewardDistribution.ts is deprecated. Use modules/referral/service.ts instead');

export class RewardDistribution {
  constructor() {
    console.warn('[DEPRECATED] RewardDistribution is deprecated. Use Supabase API instead');
  }
}

export default RewardDistribution;