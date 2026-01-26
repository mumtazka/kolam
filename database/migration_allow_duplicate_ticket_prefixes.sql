-- Migration: Allow duplicate ticket prefixes
-- Description: Drops the unique index on categories(code_prefix) to allow multiple sessions to share the same prefix (e.g. 'KHU' for School A and School B).

BEGIN;

-- Drop the unique index if it exists
DROP INDEX IF EXISTS idx_unique_active_code_prefix;

-- Optionally create a non-unique index for performance lookups (if needed, but usually query is by full code or PK)
CREATE INDEX IF NOT EXISTS idx_categories_code_prefix ON categories(code_prefix) WHERE deleted_at IS NULL;

COMMIT;
