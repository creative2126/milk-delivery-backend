# TODO: Fix Subscription End Date Not Being Set

## Information Gathered
- Subscription creation code calculates endDate based on duration (6days = +7 days, 15days = +17 days)
- Update query includes subscription_end_date in SET clause with endDateStr parameter
- Debug test shows subscriptions created but subscription_end_date is null in database
- Database schema and triggers need to be checked for potential overrides

## Plan
- [ ] Check database schema for subscription_end_date column
- [ ] Check for database triggers that might override subscription_end_date
- [ ] Add debug logging to subscription creation route
- [ ] Test the fix with debug_subscription_test.js
- [ ] Remove debug logging after confirming fix

## Dependent Files
- backend/routes/subscriptionRoutes-fixed.js (add debug logging)
- Database schema/trigger files (if issues found)

## Followup Steps
- Run debug test to verify subscription_end_date is set correctly
- Clean up debug logging
