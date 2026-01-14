-- =============================================
-- Migration: Soft Delete Strategy
-- =============================================

-- 1. Add deleted_at column to categories and tickets
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Modify Uniqueness Constraint on code_prefix
-- We want to allow creating a NEW category with the same prefix as a DELETED one.
-- So we need to drop the existing unique constraint and create a conditional unique index.

-- Drop existing unique/key constraints on code_prefix
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_code_prefix_key;
DROP INDEX IF EXISTS categories_code_prefix_key;

-- Create partial unique index (only active records must be unique)
CREATE UNIQUE INDEX idx_unique_active_code_prefix 
ON categories(code_prefix) 
WHERE deleted_at IS NULL;

-- 3. Update Policy for Soft Delete (Optional depending on how strict you want RLS)
-- Since we are generally using 'read all' for admin, simple column addition is enough.
-- But if your RLS policies explicitly exclude stuff, review them. 
-- Currently existing policies allow select ALL. 
-- We will handle filtering in the APPLICATION LAYER (categoryService.js).

-- =============================================
-- Migration Complete
-- =============================================
