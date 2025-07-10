# UniFarm Code Templates Summary

## Overview
This directory contains ready-to-use code templates for creating new modules in the UniFarm system. All templates follow the established architectural patterns and best practices.

## Available Templates

### Base Templates (Generic)
1. **BaseController.template.ts** - Generic controller with CRUD operations and error handling
2. **BaseService.template.ts** - Generic service with business logic patterns
3. **BaseRepository.template.ts** - Generic repository for Supabase database operations
4. **BaseTypes.template.ts** - Generic TypeScript types and interfaces
5. **BaseRoutes.template.ts** - Generic Express.js route definitions
6. **BaseValidation.template.ts** - Generic Zod validation schemas

### Specialized Module Templates
1. **modules/WalletRepository.template.ts** - Complete wallet operations (balance, deposits, withdrawals)
2. **modules/FarmingRepository.template.ts** - UNI farming operations and rewards
3. **modules/ReferralRepository.template.ts** - Multi-level referral system (20 levels)
4. **modules/MissionsRepository.template.ts** - Mission management and completion
5. **modules/DailyBonusRepository.template.ts** - Daily bonus and streak system
6. **modules/AirdropRepository.template.ts** - Airdrop campaigns and distribution
7. **modules/TonFarmingRepository.template.ts** - TON farming and boost packages
8. **modules/BoostRepository.template.ts** - UNI boost packages and activation
9. **modules/TransactionsRepository.template.ts** - Transaction history and statistics
10. **modules/UserRepository.template.ts** - User management and profiles

## How to Use Templates

### 1. Creating a New Module
```bash
# Create new module directory
mkdir modules/newModule

# Copy base templates
cp docs/code-templates/BaseController.template.ts modules/newModule/controller.ts
cp docs/code-templates/BaseService.template.ts modules/newModule/service.ts
cp docs/code-templates/BaseRepository.template.ts modules/newModule/repository.ts
cp docs/code-templates/BaseTypes.template.ts modules/newModule/types.ts
cp docs/code-templates/BaseRoutes.template.ts modules/newModule/routes.ts
cp docs/code-templates/BaseValidation.template.ts modules/newModule/validation.ts
```

### 2. Replace Placeholders
Search and replace the following placeholders in copied files:
- `{{MODULE_NAME}}` → Module name in PascalCase (e.g., `UserProfile`)
- `{{MODULE_NAME_LOWER}}` → Module name in camelCase (e.g., `userProfile`)
- `{{MODULE_NAME_UPPER}}` → Module name in UPPER_CASE (e.g., `USER_PROFILE`)
- `{{TABLE_NAME}}` → Database table name (e.g., `user_profiles`)
- `{{TRANSACTION_TYPE}}` → Transaction type from enum (e.g., `PROFILE_UPDATE`)

### 3. Customize Logic
Look for `TODO` comments in templates and implement module-specific logic:
```typescript
// TODO: Add module-specific validation rules
// TODO: Implement business logic
// TODO: Add custom endpoints
```

## Template Features

### All Templates Include:
- ✅ Proper TypeScript typing with shared schema types
- ✅ Error handling with try-catch blocks
- ✅ Logger integration for debugging
- ✅ Supabase client integration
- ✅ Async/await patterns
- ✅ JSDoc comments for documentation
- ✅ Export of singleton instances

### Repository Templates Include:
- ✅ Base CRUD operations inheritance
- ✅ Pagination support
- ✅ Filtering and sorting
- ✅ Transaction support
- ✅ Batch operations
- ✅ Statistics and aggregation methods

### Specialized Templates Include:
- ✅ Module-specific business logic
- ✅ Complex query patterns
- ✅ Integration with other modules
- ✅ Admin-only operations
- ✅ Real-world use cases

## Module Integration Pattern

### 1. Repository Layer
```typescript
// modules/newModule/repository.ts
import { BaseRepository } from '../../core/BaseRepository';
import { supabase } from '../../core/supabase';

export class NewModuleRepository extends BaseRepository<NewModuleType> {
  constructor() {
    super('table_name');
  }
  // Custom methods...
}
```

### 2. Service Layer
```typescript
// modules/newModule/service.ts
import { newModuleRepository } from './repository';
import { BalanceManager } from '../../core/BalanceManager';

export class NewModuleService {
  async performAction(userId: number, data: any) {
    // Business logic
    const result = await newModuleRepository.create(data);
    // Update balances if needed
    await BalanceManager.updateBalance(userId, amount, 'UNI');
    return result;
  }
}
```

### 3. Controller Layer
```typescript
// modules/newModule/controller.ts
import { BaseController } from '../../core/BaseController';
import { newModuleService } from './service';

export class NewModuleController extends BaseController {
  async handleRequest(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await newModuleService.performAction(userId, req.body);
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  }
}
```

### 4. Routes Registration
```typescript
// modules/newModule/routes.ts
import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth';
import { newModuleController } from './controller';

const router = Router();
router.use(requireAuth);

router.post('/action', (req, res) => 
  newModuleController.handleRequest(req, res)
);

export default router;
```

## Best Practices

### 1. Always Use Repository Pattern
- Never access database directly from controllers or services
- All database operations go through repository layer
- Use BaseRepository for common operations

### 2. Balance Operations
- Always use BalanceManager for balance updates
- Never update user balances directly in database
- Create transactions for all balance changes

### 3. Error Handling
- Use try-catch in all async functions
- Log errors with context using logger
- Return meaningful error messages to client

### 4. Type Safety
- Use types from shared/schema.ts
- Create custom types in module's types.ts
- Avoid using `any` type

### 5. Transaction Recording
- Record all financial operations as transactions
- Use appropriate transaction types from enum
- Include description and metadata

## Quick Reference

### Common Imports
```typescript
import { supabase } from '../../core/supabase';
import { logger } from '../../utils/logger';
import { BalanceManager } from '../../core/BalanceManager';
import { BaseController } from '../../core/BaseController';
import { BaseRepository } from '../../core/BaseRepository';
import { requireAuth } from '../../core/middleware/auth';
```

### Common Patterns
```typescript
// Get user from request
const userId = req.user!.id;

// Check balance
const hasBalance = await BalanceManager.hasSufficientBalance(userId, amount, 'UNI');

// Update balance
await BalanceManager.addBalance(userId, amount, 'UNI');
await BalanceManager.subtractBalance(userId, amount, 'TON');

// Create transaction
await transactionService.createTransaction({
  user_id: userId,
  transaction_type: 'FARMING_REWARD',
  amount: amount.toString(),
  currency: 'UNI',
  status: 'confirmed'
});
```

## Support

For questions about templates or architecture:
1. Check existing modules for examples
2. Review ROADMAP.md for system design
3. Check UniFarm_Complete_Mapping_Table.md for module relationships

---

*Templates created: ${new Date().toISOString()}*
*Total templates: 16*
*UniFarm version: 1.0*