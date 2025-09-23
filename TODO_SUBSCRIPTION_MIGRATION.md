# Subscription Table Migration TODO

## Phase 1: Database Migration ✅
- [x] Create comprehensive migration script
- [ ] Run migration script to transfer data
- [ ] Verify migration success
- [ ] Backup subscriptions table
- [ ] Drop subscriptions table (when ready)

## Phase 2: Backend Code Updates
- [ ] Update subscription routes to work with users table
- [ ] Update admin routes subscription queries
- [ ] Update all test files that reference subscriptions table
- [ ] Update utility functions and middleware

## Phase 3: Frontend Updates
- [ ] Update JavaScript files that fetch subscription data
- [ ] Update admin dashboard to work with new data structure
- [ ] Update subscription-related UI components

## Phase 4: Testing & Cleanup
- [ ] Test all subscription functionality
- [ ] Remove old subscription-related files
- [ ] Update documentation

## Files to Update (128+ files found):
### High Priority:
- backend/routes/subscriptionRoutes.js
- backend/routes/adminRoutes.js
- backend/migrate-subscription-to-users.js
- All test files in root directory

### Medium Priority:
- frontend/public/subscription.js
- frontend/public/admin-fixed.js
- scripts/optimize-db.js
- scripts/optimize-db-fixed.js

### Low Priority:
- Various test and debug files

## Migration Steps:
1. Run `node backend/comprehensive-migration.js`
2. Update subscription routes to query users table
3. Update admin endpoints
4. Update frontend code
5. Test thoroughly
6. Drop subscriptions table
