# UniFarm System Cleanup Action Plan
Date: January 17, 2025

## 🎯 STRUCTURED PROBLEM LIST WITH SOLUTIONS

### 1. COMPONENT DUPLICATION ISSUES (Critical Priority)

#### Problem 1.1: WithErrorBoundary vs Original Components
**Issue:** 10 components have both original and WithErrorBoundary versions
**Components Affected:**
- BoostPackagesCard / BoostPackagesCardWithErrorBoundary
- FarmingHistory / FarmingHistoryWithErrorBoundary  
- UniFarmingCard / UniFarmingCardWithErrorBoundary
- ActiveTonBoostsCard / ActiveTonBoostsCardWithErrorBoundary
- TonBoostPackagesCard / TonBoostPackagesCardWithErrorBoundary
- TonFarmingStatusCard / TonFarmingStatusCardWithErrorBoundary
- TonTransactions / TonTransactionsWithErrorBoundary
- TransactionHistory / TransactionHistoryWithErrorBoundary
- WalletBalance / WalletBalanceWithErrorBoundary
- WithdrawalForm / WithdrawalFormWithErrorBoundary

**Solution:**
1. Keep WithErrorBoundary versions (they provide error handling)
2. Update all imports to use WithErrorBoundary versions consistently
3. Delete original component files
4. Rename WithErrorBoundary components to remove suffix

#### Problem 1.2: Inconsistent Component Usage
**Issue:** Different pages use different component versions
**Solution:**
1. Update Wallet.tsx to use WithErrorBoundary versions
2. Verify all pages use same component versions

### 2. TEMPORARY/FIXED SOLUTIONS (High Priority)

#### Problem 2.1: Fixed Controllers in Modules
**Issue:** 2 temporary fixed controller files
**Files:**
- modules/dailyBonus/controller-fixed.ts
- modules/referral/controller_fixed.ts

**Solution:**
1. Merge fixes from Fixed controllers into main controllers
2. Delete Fixed controller files
3. Update imports if any exist

#### Problem 2.2: Hardcoded Auth Script
**Issue:** client/public/fix-auth.js contains hardcoded JWT token
**Solution:**
1. Delete fix-auth.js file
2. Ensure proper auth flow through Telegram integration

### 3. DUPLICATE FILES (Medium Priority)

#### Problem 3.1: NotificationContext Duplicates
**Issue:** Two files with different casing
**Files:**
- client/src/contexts/notificationContext.tsx
- client/src/contexts/NotificationContext.tsx

**Solution:**
1. Keep NotificationContext.tsx (capital N)
2. Delete notificationContext.tsx
3. Update any imports

#### Problem 3.2: Unused Pages
**Issue:** Pages that are not linked or used
**Files:**
- client/src/pages/MissionsNavMenu.tsx
- client/src/pages/not-found.tsx

**Solution:**
1. Delete both unused page files

### 4. UNUSED SERVICES (Medium Priority)

#### Problem 4.1: Zero-Import Services
**Issue:** Services with no imports anywhere
**Files:**
- client/src/services/referralService.ts (0 imports)
- client/src/services/withdrawalService.ts (0 imports)

**Solution:**
1. Delete both unused service files

#### Problem 4.2: Minimally Used Services
**Issue:** Services with only 1 import
**Files:**
- client/src/services/balanceService.ts (1 import)
- client/src/services/tonBlockchainService.ts (1 import)

**Solution:**
1. Review if functionality is needed
2. Consider merging into other services or keeping if essential

### 5. DOCUMENTATION CLUTTER (Low Priority)

#### Problem 5.1: Technical Reports in Docs
**Issue:** 31 old technical reports (T*_REPORT.md)
**Solution:**
1. Create docs/archive folder
2. Move all T*_REPORT.md files to archive
3. Keep only current documentation

#### Problem 5.2: Root Level Reports
**Issue:** Multiple report files in project root
**Files:**
- ATTACHED_ASSETS_ANALYSIS_REPORT.md
- DEPLOYMENT_STATUS_FINAL.md
- PRODUCTION_READINESS_FINAL_REPORT.md
- PROJECT_CLEANUP_FINAL_REPORT.md
- UNIFARM_DEPLOYMENT_READY.md

**Solution:**
1. Move to docs/archive folder

### 6. TEST/TEMPORARY FILES (Low Priority)

#### Problem 6.1: Test Scripts in Root
**Issue:** Test scripts not needed for production
**Files:**
- check-db-structure.js
- check-deposit-growth.js
- valid_jwt.txt
- all_files.txt

**Solution:**
1. Delete all test files

#### Problem 6.2: Deprecated Folder
**Issue:** Contains old versions and test files
**Solution:**
1. Delete entire deprecated/_archive_pending_review folder

### 7. EMPTY/UNUSED FOLDERS (Low Priority)

#### Problem 7.1: Empty Directories
**Issue:** Empty folders serve no purpose
**Folders:**
- logs/
- server/public/

**Solution:**
1. Delete empty folders

### 8. CONFIGURATION/BUILD FILES (Low Priority)

#### Problem 8.1: Duplicate Vite Config
**Issue:** vite.simple.config.ts appears to be duplicate
**Solution:**
1. Verify it's not used
2. Delete if duplicate

#### Problem 8.2: Unused Build Scripts
**Issue:** Shell scripts not used in current setup
**Files:**
- build.sh
- start-production.sh

**Solution:**
1. Delete unused shell scripts

#### Problem 8.3: Docker Files
**Issue:** Docker files not used in Replit deployment
**Files:**
- docker-compose.prod.yml
- Dockerfile
- nginx.conf

**Solution:**
1. Delete Docker-related files

### 9. ATTACHED ASSETS (Low Priority)

#### Problem 9.1: AI Prompts in attached_assets
**Issue:** 8 text files with AI prompts
**Solution:**
1. Archive or delete attached_assets folder

## 📋 EXECUTION ORDER

1. **Phase 1: Critical Component Fixes** (Problems 1.1, 1.2)
2. **Phase 2: Remove Temporary Solutions** (Problems 2.1, 2.2)
3. **Phase 3: Fix Duplicates** (Problems 3.1, 3.2)
4. **Phase 4: Clean Unused Code** (Problems 4.1, 4.2)
5. **Phase 5: Documentation Cleanup** (Problems 5.1, 5.2)
6. **Phase 6: Final Cleanup** (Problems 6-9)

## ✅ SUCCESS CRITERIA

- All components use single version (no duplicates)
- No temporary/fixed solutions remain
- No duplicate files with different casing
- No unused services or pages
- Documentation organized in proper folders
- No test files in production code
- Clean folder structure with no empty directories