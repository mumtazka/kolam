-- Add mode_used and shift_label to scan_logs
ALTER TABLE scan_logs 
ADD COLUMN IF NOT EXISTS mode_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS shift_label VARCHAR(50);

-- Update existing logs to have a default if needed (optional)
-- UPDATE scan_logs SET mode_used = 'SCANNER' WHERE mode_used IS NULL;
