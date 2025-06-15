// DEPRECATED: This file is no longer used
// All user operations now use Supabase API via modules/user/repository.ts
// This file exists only for import compatibility during transition

console.warn('[DEPRECATED] modules/user/service.ts is deprecated. Use modules/user/repository.ts instead');

export class UserService {
  constructor() {
    console.warn('[DEPRECATED] UserService is deprecated. Use UserRepository instead');
  }
}

export default UserService;