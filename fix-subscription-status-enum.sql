-- Fix subscription status enum to include 'expired' status
-- This resolves the "Data truncated for column 'status'" error

-- Step 1: Update the ENUM definition to include 'expired'
ALTER TABLE subscriptions 
MODIFY COLUMN status ENUM('active', 'inactive', 'cancelled', 'expired') DEFAULT 'active';

-- Step 2: Verify the change
SELECT column_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name = 'status';
