-- =============================================
-- Add shift column to scan_logs
-- Run this to enable revenue attribution by scanner shift
-- =============================================

ALTER TABLE scan_logs 
ADD COLUMN shift VARCHAR(50);

-- Update existing logs to have a default shift (e.g., 'Unknown' or derived from time)
UPDATE scan_logs SET shift = 'Unknown' WHERE shift IS NULL;

-- Make it not null after population if desired (optional)
-- ALTER TABLE scan_logs ALTER COLUMN shift SET NOT NULL;
