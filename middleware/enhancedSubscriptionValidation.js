const { body, param, query, validationResult } = require('express-validator');

const validateEnhancedSubscription = [
    body('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('productId').isUUID().withMessage('Product ID must be a valid UUID'),
    body('addressId').isUUID().withMessage('Address ID must be a valid UUID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('frequency').isIn(['daily', 'weekly', 'biweekly', 'monthly']).withMessage('Frequency must be one of: daily, weekly, biweekly, monthly'),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    body('pricePerUnit').isFloat({ min: 0 }).withMessage('Price per unit must be a positive number'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('taxPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0 and 100'),
    body('deliveryInstructions').optional().isString().isLength({ max: 500 }).withMessage('Delivery instructions must be less than 500 characters'),
    body('specialNotes').optional().isString().isLength({ max: 1000 }).withMessage('Special notes must be less than 1000 characters'),
    body('trialPeriodDays').optional().isInt({ min: 0 }).withMessage('Trial period days must be a non-negative integer'),
    body('autoRenew').isBoolean().withMessage('Auto renew must be a boolean'),
    body('billingCycle').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Billing cycle must be one of: weekly, monthly, quarterly, yearly'),
    body('paymentMethodId').optional().isUUID().withMessage('Payment method ID must be a valid UUID'),
    body('isGift').isBoolean().withMessage('Is gift must be a boolean'),
    body('giftRecipientEmail').optional().isEmail().withMessage('Gift recipient email must be a valid email'),
    body('giftMessage').optional().isString().isLength({ max: 500 }).withMessage('Gift message must be less than 500 characters'),
    body('referralCode').optional().isString().isLength({ min: 3, max: 20 }).withMessage('Referral code must be between 3 and 20 characters'),
    body('source').optional().isIn(['web', 'mobile', 'admin', 'api', 'partner']).withMessage('Source must be one of: web, mobile, admin, api, partner'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').isString().isLength({ max: 50 }).withMessage('Each tag must be less than 50 characters'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const validateSubscriptionUpdate = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('frequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly']).withMessage('Frequency must be one of: daily, weekly, biweekly, monthly'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    body('pricePerUnit').optional().isFloat({ min: 0 }).withMessage('Price per unit must be a positive number'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('taxPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0 and 100'),
    body('deliveryInstructions').optional().isString().isLength({ max: 500 }).withMessage('Delivery instructions must be less than 500 characters'),
    body('specialNotes').optional().isString().isLength({ max: 1000 }).withMessage('Special notes must be less than 1000 characters'),
    body('autoRenew').optional().isBoolean().withMessage('Auto renew must be a boolean'),
    body('billingCycle').optional().isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Billing cycle must be one of: weekly, monthly, quarterly, yearly'),
    body('paymentMethodId').optional().isUUID().withMessage('Payment method ID must be a valid UUID'),
    body('giftMessage').optional().isString().isLength({ max: 500 }).withMessage('Gift message must be less than 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').isString().isLength({ max: 50 }).withMessage('Each tag must be less than 50 characters'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const validateSubscriptionAction = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID')
];

const validatePauseSubscription = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID')
];

const validateResumeSubscription = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID')
];

const validateCancelSubscription = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters'),
    body('feedback').optional().isString().isLength({ max: 1000 }).withMessage('Cancellation feedback must be less than 1000 characters')
];

const validateSkipDelivery = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID'),
    body('date').isISO8601().withMessage('Skip date must be a valid ISO date'),
    body('reason').optional().isString().isLength({ max: 200 }).withMessage('Skip reason must be less than 200 characters')
];

const validateAddDelivery = [
    param('id').isUUID().withMessage('Subscription ID must be a valid UUID'),
    body('date').isISO8601().withMessage('Add delivery date must be a valid ISO date'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

const validateGetSubscriptions = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['active', 'paused', 'cancelled', 'trial', 'expired']).withMessage('Status must be one of: active, paused, cancelled, trial, expired'),
    query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
    query('productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('frequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly']).withMessage('Frequency must be one of: daily, weekly, biweekly, monthly'),
    query('autoRenew').optional().isBoolean().withMessage('Auto renew must be a boolean'),
    query('billingCycle').optional().isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Billing cycle must be one of: weekly, monthly, quarterly, yearly'),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'startDate', 'endDate', 'price']).withMessage('Sort by must be one of: createdAt, updatedAt, startDate, endDate, price'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be one of: asc, desc')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    validateEnhancedSubscription,
    validateSubscriptionUpdate,
    validateSubscriptionAction,
    validatePauseSubscription,
    validateResumeSubscription,
    validateCancelSubscription,
    validateSkipDelivery,
    validateAddDelivery,
    validateGetSubscriptions,
    handleValidationErrors
};
