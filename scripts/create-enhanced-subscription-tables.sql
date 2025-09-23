-- Enhanced Subscription System Database Schema
-- This script creates the enhanced subscription tables with advanced features

-- Create enum types
CREATE TYPE subscription_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'custom');
CREATE TYPE delivery_time_preference AS ENUM ('morning', 'afternoon', 'evening', 'anytime');
CREATE TYPE subscription_source AS ENUM ('web', 'mobile', 'admin', 'api', 'import');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired', 'trial');

-- Create EnhancedSubscriptions table
CREATE TABLE IF NOT EXISTS "EnhancedSubscriptions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "Products"(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    frequency subscription_frequency NOT NULL DEFAULT 'weekly',
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "endDate" TIMESTAMP WITH TIME ZONE,
    "nextDeliveryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "deliveryAddressId" UUID REFERENCES "Addresses"(id) ON DELETE SET NULL,
    "paymentMethodId" UUID REFERENCES "PaymentMethods"(id) ON DELETE SET NULL,
    "specialInstructions" TEXT,
    "deliveryTimePreference" delivery_time_preference DEFAULT 'anytime',
    "deliveryInstructions" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "trialPeriodDays" INTEGER NOT NULL DEFAULT 0 CHECK (trialPeriodDays >= 0),
    "trialEndDate" TIMESTAMP WITH TIME ZONE,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (discountPercentage >= 0 AND discountPercentage <= 100),
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (taxRate >= 0 AND taxRate <= 100),
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (shippingCost >= 0),
    "totalBillableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "giftRecipientEmail" VARCHAR(255) CHECK (giftRecipientEmail ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    "giftMessage" TEXT,
    "referralCode" VARCHAR(50),
    source subscription_source NOT NULL DEFAULT 'web',
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status subscription_status NOT NULL DEFAULT 'active',
    "pauseStartDate" TIMESTAMP WITH TIME ZONE,
    "pauseEndDate" TIMESTAMP WITH TIME ZONE,
    "pauseReason" VARCHAR(255),
    "cancellationReason" VARCHAR(255),
    "cancellationDate" TIMESTAMP WITH TIME ZONE,
    "lastDeliveryDate" TIMESTAMP WITH TIME ZONE,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveryCount" INTEGER NOT NULL DEFAULT 0,
    "successfulDeliveryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create SubscriptionDeliveries table for tracking individual deliveries
CREATE TABLE IF NOT EXISTS "SubscriptionDeliveries" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL REFERENCES "EnhancedSubscriptions"(id) ON DELETE CASCADE,
    "scheduledDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "actualDeliveryDate" TIMESTAMP WITH TIME ZONE,
    "deliveryStatus" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "deliveryNotes" TEXT,
    "deliveryAddressId" UUID REFERENCES "Addresses"(id) ON DELETE SET NULL,
    "deliveryAgentId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
    "proofOfDelivery" JSONB,
    "deliveryCost" DECIMAL(10,2) DEFAULT 0.00,
    "customerFeedback" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create SubscriptionPayments table for tracking payments
CREATE TABLE IF NOT EXISTS "SubscriptionPayments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL REFERENCES "EnhancedSubscriptions"(id) ON DELETE CASCADE,
    "paymentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethodId" UUID REFERENCES "PaymentMethods"(id) ON DELETE SET NULL,
    "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "transactionId" VARCHAR(255),
    "paymentGateway" VARCHAR(50),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create SubscriptionModifications table for tracking changes
CREATE TABLE IF NOT EXISTS "SubscriptionModifications" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL REFERENCES "EnhancedSubscriptions"(id) ON DELETE CASCADE,
    "modifiedBy" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
    "modificationType" VARCHAR(50) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create SubscriptionAnalytics table for analytics data
CREATE TABLE IF NOT EXISTS "SubscriptionAnalytics" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL REFERENCES "EnhancedSubscriptions"(id) ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "customerSatisfaction" DECIMAL(3,2),
    "churnRisk" DECIMAL(3,2),
    "engagementScore" DECIMAL(3,2),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE("subscriptionId", "date")
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_user_status ON "EnhancedSubscriptions"("userId", status);
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_product_status ON "EnhancedSubscriptions"("productId", status);
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_next_delivery ON "EnhancedSubscriptions"("nextDeliveryDate", status);
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_start_end ON "EnhancedSubscriptions"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_trial_end ON "EnhancedSubscriptions"("trialEndDate");
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_gift ON "EnhancedSubscriptions"("isGift");
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_source ON "EnhancedSubscriptions"(source);
CREATE INDEX IF NOT EXISTS idx_enhanced_subscriptions_created ON "EnhancedSubscriptions"("createdAt");

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription ON "SubscriptionDeliveries"("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_scheduled ON "SubscriptionDeliveries"("scheduledDate");
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_status ON "SubscriptionDeliveries"("deliveryStatus");

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON "SubscriptionPayments"("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_payments_date ON "SubscriptionPayments"("paymentDate");
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON "SubscriptionPayments"("paymentStatus");

CREATE INDEX IF NOT EXISTS idx_subscription_modifications_subscription ON "SubscriptionModifications"("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_modifications_date ON "SubscriptionModifications"("createdAt");

CREATE INDEX IF NOT EXISTS idx_subscription_analytics_subscription_date ON "SubscriptionAnalytics"("subscriptionId", "date");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_enhanced_subscriptions_updated_at BEFORE UPDATE ON "EnhancedSubscriptions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_deliveries_updated_at BEFORE UPDATE ON "SubscriptionDeliveries"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at BEFORE UPDATE ON "SubscriptionPayments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_analytics_updated_at BEFORE UPDATE ON "SubscriptionAnalytics"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate next delivery date
CREATE OR REPLACE FUNCTION calculate_next_delivery_date(
    current_date DATE,
    frequency subscription_frequency,
    start_date DATE
) RETURNS DATE AS $$
DECLARE
    next_date DATE;
    days_since_start INTEGER;
BEGIN
    CASE frequency
        WHEN 'daily' THEN
            next_date := current_date + INTERVAL '1 day';
        WHEN 'weekly' THEN
            next_date := current_date + INTERVAL '7 days';
        WHEN 'biweekly' THEN
            next_date := current_date + INTERVAL '14 days';
        WHEN 'monthly' THEN
            next_date := current_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            next_date := current_date + INTERVAL '3 months';
        ELSE
            next_date := current_date + INTERVAL '7 days';
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Create view for subscription summary
CREATE OR REPLACE VIEW subscription_summary AS
SELECT 
    es.id,
    es."userId",
    u.email as user_email,
    es."productId",
    p.name as product_name,
    es.quantity,
    es.frequency,
    es."startDate",
    es."endDate",
    es."nextDeliveryDate",
    es."totalAmount",
    es."totalBillableAmount",
    es.status,
    es."deliveryCount",
    es."successfulDeliveryCount",
    es."failedDeliveryCount",
    es."createdAt",
    es."updatedAt"
FROM "EnhancedSubscriptions" es
JOIN "Users" u ON es."userId" = u.id
JOIN "Products" p ON es."productId" = p.id;

-- Create view for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT * FROM subscription_summary WHERE status = 'active';

-- Create view for upcoming deliveries
CREATE OR REPLACE VIEW upcoming_deliveries AS
SELECT 
    sd.id,
    sd."subscriptionId",
    ss.user_email,
    ss.product_name,
    sd."scheduledDate",
    sd."deliveryStatus",
    sd."deliveryNotes"
FROM "SubscriptionDeliveries" sd
JOIN subscription_summary ss ON sd."subscriptionId" = ss.id
WHERE sd."scheduledDate" >= CURRENT_DATE
    AND sd."deliveryStatus" IN ('scheduled', 'in_transit')
ORDER BY sd."scheduledDate";

-- Insert sample data for testing
INSERT INTO "EnhancedSubscriptions" (
    "userId", "productId", quantity, frequency, "startDate", 
    "nextDeliveryDate", "totalAmount", "totalBillableAmount", status
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 2, 'weekly', '2024-01-01', '2024-01-08', 50.00, 55.00, 'active'),
    ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 1, 'monthly', '2024-01-01', '2024-02-01', 100.00, 110.00, 'active');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
