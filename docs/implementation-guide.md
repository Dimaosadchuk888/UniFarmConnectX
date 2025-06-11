# Entity-Based Architecture Implementation Guide

## Overview

This guide demonstrates how to integrate the new entity-based architecture with the existing UniFarm codebase, providing concrete examples and migration patterns.

## Current vs New Architecture

### Before (Service-Based)
```typescript
// modules/user/service.ts
export class UserService {
  async createUser(data: any) {
    // Database logic
    // Business logic scattered
    // No encapsulation
  }
}
```

### After (Entity-Based)
```typescript
// Using entities with encapsulated business logic
const user = UserFactory.createFarmer({
  id: 1,
  telegramId: '123456',
  username: 'farmer1'
});

user.farm(100); // Business logic in entity
user.claimFarming(); // Encapsulated methods
```

## Integration Patterns

### 1. Service Layer Integration

Update existing services to use entities while maintaining backward compatibility:

```typescript
// modules/user/service.ts (Updated)
import { EntityUtils, UserFactory, Farmer } from '../entities';

export class UserService {
  async getUserById(id: number): Promise<Farmer | null> {
    const dbUser = await db.select().from(users).where(eq(users.id, id));
    if (!dbUser[0]) return null;
    
    return EntityUtils.fromDbToFarmer(dbUser[0]);
  }

  async updateFarming(userId: number, amount: number): Promise<boolean> {
    const farmer = await this.getUserById(userId);
    if (!farmer) return false;

    // Use entity business logic
    const success = farmer.farm(amount);
    if (success) {
      // Save back to database
      await this.saveFarmer(farmer);
    }
    return success;
  }

  private async saveFarmer(farmer: Farmer): Promise<void> {
    await db.update(users)
      .set({
        balance_uni: farmer.balanceUni,
        uni_deposit_amount: farmer.totalFarmed.toString(),
        uni_farming_rate: farmer.farmingRate.toString()
      })
      .where(eq(users.id, farmer.id));
  }
}
```

### 2. Controller Integration

Simplify controllers by leveraging entity methods:

```typescript
// modules/farming/controller.ts (Updated)
import { BaseController } from '../../core/BaseController';
import { UserService } from '../user/service';

export class FarmingController extends BaseController {
  constructor(private userService: UserService) {
    super();
  }

  async startFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.getTelegramUser(req);
      const { amount } = req.body;

      this.validateRequiredFields(req.body, ['amount']);

      const farmer = await this.userService.getUserById(telegramUser.id);
      if (!farmer) {
        return this.sendError(res, 'Пользователь не найден', 404);
      }

      const success = farmer.farm(Number(amount));
      if (!success) {
        return this.sendError(res, 'Недостаточно средств для фарминга');
      }

      await this.userService.saveFarmer(farmer);

      this.sendSuccess(res, {
        farmingStats: farmer.getFarmingStats(),
        newBalance: farmer.balanceUni
      }, 'Фарминг успешно запущен');
    }, 'запуска фарминга');
  }

  async claimFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.getTelegramUser(req);

      const farmer = await this.userService.getUserById(telegramUser.id);
      if (!farmer) {
        return this.sendError(res, 'Пользователь не найден', 404);
      }

      const earned = farmer.claimFarming();
      if (earned === 0) {
        return this.sendError(res, 'Нет средств для сбора');
      }

      await this.userService.saveFarmer(farmer);

      this.sendSuccess(res, {
        earned,
        newBalance: farmer.balanceUni,
        farmingStats: farmer.getFarmingStats()
      }, `Собрано ${earned.toFixed(6)} UNI`);
    }, 'сбора фарминга');
  }
}
```

### 3. Repository Pattern Implementation

Create repositories for clean data access:

```typescript
// modules/repositories/UserRepository.ts
import { db } from '../../core/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { EntityUtils, User, Farmer } from '../entities';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByTelegramId(telegramId: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: number): Promise<boolean>;
  findFarmerById(id: number): Promise<Farmer | null>;
  saveFarmer(farmer: Farmer): Promise<Farmer>;
}

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ? EntityUtils.fromDbToUser(result[0]) : null;
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.telegram_id, BigInt(telegramId)));
    return result[0] ? EntityUtils.fromDbToUser(result[0]) : null;
  }

  async save(user: User): Promise<User> {
    const userData = {
      telegram_id: BigInt(user.telegramId),
      username: user.username,
      ref_code: user.refCode,
      parent_ref_code: user.parentRefCode,
      balance_uni: user.balanceUni.toString(),
      balance_ton: user.balanceTon.toString()
    };

    if (user.id) {
      await db.update(users).set(userData).where(eq(users.id, user.id));
    } else {
      const result = await db.insert(users).values(userData).returning();
      user.id = result[0].id;
    }

    return user;
  }

  async findFarmerById(id: number): Promise<Farmer | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ? EntityUtils.fromDbToFarmer(result[0]) : null;
  }

  async saveFarmer(farmer: Farmer): Promise<Farmer> {
    const farmerData = {
      telegram_id: BigInt(farmer.telegramId),
      username: farmer.username,
      ref_code: farmer.refCode,
      parent_ref_code: farmer.parentRefCode,
      balance_uni: farmer.balanceUni.toString(),
      balance_ton: farmer.balanceTon.toString(),
      uni_deposit_amount: farmer.totalFarmed.toString(),
      uni_farming_rate: farmer.farmingRate.toString(),
      farming_start_time: farmer.farmingStartTime,
      last_farming_claim: farmer.lastFarmingClaim
    };

    await db.update(users).set(farmerData).where(eq(users.id, farmer.id));
    return farmer;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
}
```

### 4. Dependency Injection Setup

Implement a simple DI container for managing dependencies:

```typescript
// core/DIContainer.ts
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  register<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  resolve<T>(key: string): T {
    // Return cached instance if available
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // Create new instance using factory
    const factory = this.factories.get(key);
    if (factory) {
      const instance = factory();
      this.services.set(key, instance);
      return instance;
    }

    throw new Error(`Service ${key} not registered`);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Setup DI container
const container = DIContainer.getInstance();

// Register repositories
container.register('UserRepository', () => new UserRepository());
container.register('WalletRepository', () => new WalletRepository());

// Register services
container.register('UserService', () => new UserService(
  container.resolve('UserRepository')
));
container.register('FarmingService', () => new FarmingService(
  container.resolve('UserRepository')
));

// Register controllers
container.register('FarmingController', () => new FarmingController(
  container.resolve('UserService')
));
```

## Migration Strategy

### Phase 1: Parallel Implementation
Run old and new systems side by side:

```typescript
// Feature flag approach
const USE_ENTITY_ARCHITECTURE = process.env.USE_ENTITIES === 'true';

export class UserService {
  async createUser(data: any) {
    if (USE_ENTITY_ARCHITECTURE) {
      return this.createUserWithEntities(data);
    }
    return this.createUserLegacy(data);
  }

  private async createUserWithEntities(data: any) {
    const user = UserFactory.createUser(data);
    return await this.userRepository.save(user);
  }

  private async createUserLegacy(data: any) {
    // Old implementation
  }
}
```

### Phase 2: Gradual Migration
Migrate one module at a time:

1. **User module** (Core functionality)
2. **Wallet module** (Financial operations)
3. **Farming module** (Business logic)
4. **Missions module** (Gamification)
5. **Admin module** (Administrative features)

### Phase 3: Legacy Cleanup
Remove old code after validation:

```typescript
// Remove feature flags
// Delete legacy methods
// Update tests
// Update documentation
```

## Testing Strategy

### Entity Testing
```typescript
// tests/entities/Farmer.test.ts
import { Farmer } from '../../modules/entities/Farmer';

describe('Farmer Entity', () => {
  let farmer: Farmer;

  beforeEach(() => {
    farmer = new Farmer(1, '123456', 'test', 'ref123', undefined, 100, 0);
  });

  describe('farm()', () => {
    it('should start farming with valid amount', () => {
      const result = farmer.farm(50);
      
      expect(result).toBe(true);
      expect(farmer.balanceUni).toBe(50);
      expect(farmer.totalFarmed).toBe(50);
      expect(farmer.farmingStartTime).toBeDefined();
      expect(farmer.farmingRate).toBeGreaterThan(0);
    });

    it('should fail farming with insufficient balance', () => {
      const result = farmer.farm(150);
      
      expect(result).toBe(false);
      expect(farmer.balanceUni).toBe(100);
      expect(farmer.totalFarmed).toBe(0);
    });
  });

  describe('claimFarming()', () => {
    beforeEach(() => {
      farmer.farm(50);
      // Simulate time passage
      farmer.farmingStartTime = new Date(Date.now() - 3600000); // 1 hour ago
    });

    it('should claim accumulated earnings', () => {
      const earned = farmer.claimFarming();
      
      expect(earned).toBeGreaterThan(0);
      expect(farmer.balanceUni).toBeGreaterThan(50);
      expect(farmer.lastFarmingClaim).toBeDefined();
    });
  });
});
```

### Integration Testing
```typescript
// tests/integration/farming.test.ts
import { UserService } from '../../modules/user/service';
import { FarmingController } from '../../modules/farming/controller';

describe('Farming Integration', () => {
  let userService: UserService;
  let farmingController: FarmingController;

  beforeEach(() => {
    userService = new UserService();
    farmingController = new FarmingController(userService);
  });

  it('should complete full farming cycle', async () => {
    // Create user
    const user = await userService.createUser({
      telegramId: '123456',
      username: 'testuser'
    });

    // Start farming
    const req = mockRequest({ body: { amount: 100 } });
    const res = mockResponse();
    
    await farmingController.startFarming(req, res);
    
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          farmingStats: expect.any(Object)
        })
      })
    );
  });
});
```

## Performance Considerations

### Memory Management
- Entity instances are lightweight
- Use factory pattern for consistent creation
- Implement proper cleanup in long-running processes

### Database Optimization
- Batch operations where possible
- Use entity validation before database calls
- Implement caching for frequently accessed entities

### Monitoring
```typescript
// core/EntityMonitor.ts
export class EntityMonitor {
  private static creationCount = new Map<string, number>();
  private static operationTimes = new Map<string, number[]>();

  static trackCreation(entityType: string): void {
    const count = this.creationCount.get(entityType) || 0;
    this.creationCount.set(entityType, count + 1);
  }

  static trackOperation(operation: string, duration: number): void {
    const times = this.operationTimes.get(operation) || [];
    times.push(duration);
    this.operationTimes.set(operation, times);
  }

  static getStats() {
    return {
      creationCount: Object.fromEntries(this.creationCount),
      averageOperationTimes: Object.fromEntries(
        Array.from(this.operationTimes.entries()).map(([op, times]) => [
          op,
          times.reduce((a, b) => a + b, 0) / times.length
        ])
      )
    };
  }
}
```

## Best Practices

1. **Always validate entities** before database operations
2. **Use factories** for consistent entity creation
3. **Keep business logic** within entity methods
4. **Implement proper error handling** in entity methods
5. **Use repositories** for data access abstraction
6. **Test entities** in isolation before integration
7. **Monitor performance** of entity operations
8. **Document entity relationships** and dependencies

This implementation guide provides a clear path for migrating to the entity-based architecture while maintaining system stability and performance.