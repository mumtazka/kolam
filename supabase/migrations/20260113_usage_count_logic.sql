-- Add usage tracking columns to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1;

-- Update existing K-prefix tickets to have max_usage 100
UPDATE tickets 
SET max_usage = 100 
WHERE ticket_code LIKE 'K%';

-- Optional: Comment
COMMENT ON COLUMN tickets.usage_count IS 'Current number of times ticket has been scanned';
COMMENT ON COLUMN tickets.max_usage IS 'Maximum allowed scans (100 for K-prefix, 1 for others)';
