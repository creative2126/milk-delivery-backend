# Milk Delivery Subscription System - Testing Checklist

## 1. Database Testing
- [ ] Test database connection and pool health
- [ ] Verify all tables exist with correct schema
- [ ] Test subscription creation with sample data
- [ ] Test payment recording and verification
- [ ] Test delivery zone assignments

## 2. API Endpoint Testing
- [ ] POST /api/register - User registration
- [ ] POST /api/login - User authentication
- [ ] GET /api/subscriptions/check/:username - Subscription status
- [ ] GET /api/subscriptions/user/:username - User subscriptions
- [ ] POST /api/subscriptions - Create subscription
- [ ] POST /api/create-order - Create payment order
- [ ] POST /api/verify-payment - Verify payment
- [ ] POST /api/webhooks/razorpay - Handle webhooks

## 3. Frontend Testing
- [ ] Test subscription form submission
- [ ] Test payment flow with Razorpay
- [ ] Test user dashboard data display
- [ ] Test login/logout flow
- [ ] Test form validation

## 4. Security Testing
- [ ] Test SQL injection prevention
- [ ] Test input validation
- [ ] Test authentication token handling
- [ ] Test rate limiting
- [ ] Test webhook signature verification

## 5. Performance Testing
- [ ] Test concurrent subscription creation
- [ ] Test database query performance
- [ ] Test payment processing speed
- [ ] Test dashboard loading time
- [ ] Test error handling under load

## 6. Integration Testing
- [ ] Test complete subscription flow
- [ ] Test payment failure scenarios
- [ ] Test subscription modification
- [ ] Test delivery scheduling
- [ ] Test notification system
