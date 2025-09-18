-- Fix the duration trigger to handle string durations with free days
USE milk;
DELIMITER $$

-- Drop the existing trigger
DROP TRIGGER IF EXISTS set_subscription_end_date$$

-- Create a new trigger that handles string durations including free days
CREATE TRIGGER set_subscription_end_date
BEFORE INSERT ON subscriptions
FOR EACH ROW
BEGIN
    DECLARE duration_days INT DEFAULT 0;
    DECLARE final_days INT DEFAULT 0;

    -- Extract numeric part from duration string (e.g., '6days' -> 6)
    SET duration_days = CAST(REGEXP_SUBSTR(NEW.duration, '[0-9]+') AS UNSIGNED);

    -- If no numeric part found, default to 6 days
    IF duration_days = 0 THEN
        SET duration_days = 6;
    END IF;

    -- Add free days: 6days -> 7 days, 15days -> 17 days
    IF duration_days = 6 THEN
        SET final_days = 7;
    ELSEIF duration_days = 15 THEN
        SET final_days = 17;
    ELSE
        SET final_days = duration_days;
    END IF;

    IF NEW.end_date IS NULL AND NEW.start_date IS NOT NULL THEN
        SET NEW.end_date = DATE_ADD(NEW.start_date, INTERVAL final_days DAY);
    END IF;

    IF NEW.start_date IS NULL THEN
        SET NEW.start_date = CURDATE();
        SET NEW.end_date = DATE_ADD(CURDATE(), INTERVAL final_days DAY);
    END IF;
END$$

DELIMITER ;

-- Verify the trigger was created
SHOW TRIGGERS WHERE `Trigger` = 'set_subscription_end_date';
