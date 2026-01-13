-- Add valid_from and valid_until columns to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS valid_from DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE;

-- Add index for querying active sessions (performance optimization)
CREATE INDEX IF NOT EXISTS idx_sessions_valid_until ON sessions(valid_until);

-- Comment explaining the usage
COMMENT ON COLUMN sessions.valid_from IS 'Optional: The start date of the contract/session validity';
COMMENT ON COLUMN sessions.valid_until IS 'Optional: The end date of the contract/session validity. Sessions are considered expired after this date.';
